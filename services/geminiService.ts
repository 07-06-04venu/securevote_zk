import { FraudAnalysisResult } from '../types';

export type GovernmentIdValidationResult = {
  isGovernmentId: boolean;
  documentType: string;
  hasPortraitFace: boolean;
  hasDob: boolean;
  dob: string;
  age: number;
  isAdult: boolean;
  confidence: number;
  reasoning: string;
  serviceAvailable: boolean;
};

const postJson = async <T>(url: string, body: Record<string, unknown>): Promise<T> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `AI verification request failed (${res.status})` };
  }

  if (!res.ok) {
    const message = data?.error || data?.reasoning || `AI verification request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
};

export const validateGovernmentIdDocument = async (idBase64: string): Promise<GovernmentIdValidationResult> => {
  return postJson<GovernmentIdValidationResult>('/api/verify-government-id', { idBase64 });
};

export const analyzeBiometricFraud = async (
  idBase64: string,
  selfieBase64: string
): Promise<FraudAnalysisResult> => {
  return postJson<FraudAnalysisResult>('/api/analyze-biometric', { idBase64, selfieBase64 });
};
