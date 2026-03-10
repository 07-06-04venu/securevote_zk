import crypto from "crypto";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

export class RateLimiter {
  private requests: Map<string, Array<{ timestamp: number; count: number }>>;
  private blocked: Map<string, number>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.requests = new Map();
    this.blocked = new Map();
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Remove old request records
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(r => r.timestamp >= windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
    
    // Remove expired blocks
    for (const [key, blockUntil] of this.blocked.entries()) {
      if (now >= blockUntil) {
        this.blocked.delete(key);
      }
    }
  }

  private getKey(identifier: string): string {
    return crypto.createHash("sha256").update(identifier).digest("hex");
  }

  canProceed(identifier: string): boolean {
    const now = Date.now();
    const key = this.getKey(identifier);
    
    // Check if blocked
    const blockUntil = this.blocked.get(key);
    if (blockUntil && now < blockUntil) {
      return false;
    }

    // Get or create request history
    let requests = this.requests.get(key);
    if (!requests) {
      requests = [];
      this.requests.set(key, requests);
    }

    // Remove old requests outside window
    const windowStart = now - this.config.windowMs;
    const validRequests = requests.filter(r => r.timestamp >= windowStart);
    this.requests.set(key, validRequests);

    // Count requests in current window
    const requestCount = validRequests.reduce((sum, r) => sum + r.count, 0);

    return requestCount < this.config.maxRequests;
  }

  recordRequest(identifier: string, count: number = 1): void {
    const now = Date.now();
    const key = this.getKey(identifier);
    
    let requests = this.requests.get(key);
    if (!requests) {
      requests = [];
      this.requests.set(key, requests);
    }

    const lastRequest = requests[requests.length - 1];
    if (lastRequest && lastRequest.timestamp === now) {
      lastRequest.count += count;
    } else {
      requests.push({ timestamp: now, count });
    }
  }

  block(identifier: string): void {
    const key = this.getKey(identifier);
    this.blocked.set(key, Date.now() + this.config.blockDurationMs);
  }

  getStats(identifier: string): { requestsInWindow: number; isBlocked: boolean; resetTime: number } {
    const now = Date.now();
    const key = this.getKey(identifier);
    
    const isBlocked = this.blocked.has(key) && now < (this.blocked.get(key) || 0);
    
    let requestsInWindow = 0;
    const requests = this.requests.get(key) || [];
    const windowStart = now - this.config.windowMs;
    
    requestsInWindow = requests
      .filter(r => r.timestamp >= windowStart)
      .reduce((sum, r) => sum + r.count, 0);

    const resetTime = now + this.config.windowMs;

    return { requestsInWindow, isBlocked, resetTime };
  }
}

// Default rate limiter for AI API calls
export const aiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 10,     // 10 requests per minute
  blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes after limit exceeded
});

// Rate limiter for government ID verification
export const idVerificationRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minute window
  maxRequests: 5,          // 5 requests per 5 minutes
  blockDurationMs: 10 * 60 * 1000, // Block for 10 minutes
});

// Rate limiter for biometric analysis
export const biometricRateLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minute window
  maxRequests: 3,           // 3 requests per 10 minutes
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
});