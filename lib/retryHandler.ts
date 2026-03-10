export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: ["429", "500", "502", "503", "504", "ECONNRESET", "ENETUNREACH", "ETIMEDOUT"]
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = config.retryableErrors.some(errorCode => 
        String(error?.message || error || "").toLowerCase().includes(errorCode.toLowerCase()) ||
        String(error?.status || "").includes(errorCode)
      );

      if (!isRetryable || attempt === config.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );

      console.warn(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeoutMs: number = 60000,
    private resetTimeoutMs: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }

  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// Module-level singleton circuit breaker (persists across calls)
const _geminiCircuitBreaker = new CircuitBreaker(5, 60000, 30000);

// Enhanced callGemini with retry and circuit breaker
export async function callGeminiWithRetry(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<any> {
  return _geminiCircuitBreaker.execute(() =>
    withRetry(() => callGeminiDirect(parts), config)
  );
}

async function callGeminiDirect(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>
): Promise<any> {
  // Support both gemini-2.0-flash (stable) and an override via env
  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";

  if (!apiKey || apiKey === "your_gemini_api_key") {
    throw new Error("GEMINI_API_KEY is not configured. Please set a valid API key in your .env file.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          // responseMimeType omitted: not universally supported and causes 500s on some models
        },
      }),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}: ${text || response.statusText}`);
  }

  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${text.slice(0, 200)}`);
  }

  const candidateText =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text || "")
      .join("\n") || "";

  if (!candidateText) {
    // Surface finish reason (e.g. SAFETY, RECITATION) for easier debugging
    const finishReason = payload?.candidates?.[0]?.finishReason || "unknown";
    throw new Error(`Gemini returned empty content. finishReason=${finishReason}`);
  }

  // Extract JSON from response (handles markdown code fences too)
  const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Model returned non-JSON content: ${candidateText.slice(0, 200)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse model JSON: ${jsonMatch[0].slice(0, 200)}`);
  }
}
