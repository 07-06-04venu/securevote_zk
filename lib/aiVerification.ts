import type { FraudAnalysisResult } from "../types";
import { governmentIdCache, biometricCache, CACHE_TTLS } from "./cache";
import { idVerificationRateLimiter, biometricRateLimiter } from "./rateLimiter";
import { callGeminiWithRetry } from "./retryHandler";
import crypto from "crypto";

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

const stripDataUrl = (img: string) => img.replace(/^data:image\/\w+;base64,/, "");

const normalizeDocType = (raw: string): string => {
  const t = String(raw || "").toLowerCase();
  if (t.includes("aadhaar") || t.includes("aadhar") || t.includes("uidai")) return "Aadhaar";
  if (t.includes("pan") || t.includes("permanent account")) return "PAN";
  if (t.includes("passport")) return "Passport";
  if (t.includes("voter")) return "Voter ID";
  if (t.includes("driving") || t.includes("driver")) return "Driving License";
  return "Unknown";
};

const parseDob = (raw: string): Date | null => {
  const value = String(raw || "").trim();
  if (!value) return null;

  const ymd = value.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) return d;
  }

  const dmy = value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) return d;
  }

  return null;
};

const extractDobFromText = (text: string): Date | null => {
  const corpus = String(text || "");
  const match = corpus.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/);
  if (!match) return null;
  return parseDob(match[1]);
};

const calculateAge = (dob: Date): number => {
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
  return Math.max(0, age);
};

export const validateGovernmentIdDocument = async (idBase64: string): Promise<GovernmentIdValidationResult> => {
  // Check cache first
  const cacheKey = ["government-id", idBase64.substring(0, 100)];
  const cachedResult = governmentIdCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Check rate limit
  const identifier = `government-id:${crypto.createHash("sha256").update(idBase64).digest("hex").substring(0, 16)}`;
  if (!idVerificationRateLimiter.canProceed(identifier)) {
    return {
      isGovernmentId: false,
      documentType: "Unknown",
      hasPortraitFace: false,
      hasDob: false,
      dob: "",
      age: 0,
      isAdult: false,
      confidence: 0,
      reasoning: "Rate limit exceeded. Please try again later.",
      serviceAvailable: true,
    };
  }

  try {
    const parsed = await callGeminiWithRetry([
      {
        text: `You are validating Indian government identity documents for election registration.
Return strict JSON only with these fields:
{
  "isGovernmentId": boolean,
  "documentType": "Aadhaar|PAN|Passport|Voter ID|Driving License|Unknown",
  "hasPortraitFace": boolean,
  "hasDob": boolean,
  "dob": "YYYY-MM-DD or DD/MM/YYYY or empty string",
  "confidence": number,
  "reasoning": string,
  "extractedText": string
}
Handle multilingual IDs. Reject browser screenshots, error pages, and non-ID documents.`
      },
      { inlineData: { mimeType: "image/jpeg", data: stripDataUrl(idBase64) } },
    ]);

    const modelDocType = normalizeDocType(parsed.documentType);
    const baseConfidence = Number(parsed.confidence);
    const confidence = Number.isFinite(baseConfidence) ? baseConfidence : 0;
    const extractedCorpus = `${parsed.extractedText || ""} ${parsed.reasoning || ""} ${parsed.documentType || ""}`;
    const parsedDob = parseDob(parsed.dob || "") || extractDobFromText(extractedCorpus);
    const age = parsedDob ? calculateAge(parsedDob) : 0;
    const hasDob = Boolean(parsedDob);

    const normalizedCorpus = extractedCorpus.toLowerCase();
    const hasAadhaarCue = /(aadhaar|aadhar|uidai|unique identification|government of india)/i.test(normalizedCorpus);
    const hasAadhaarNumber = /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(normalizedCorpus);
    const hasPanCue = /(income tax|permanent account number| pan )/i.test(` ${normalizedCorpus} `);
    const hasPanPattern = /\b[A-Z]{5}\d{4}[A-Z]\b/.test(String(parsed.extractedText || ""));
    const hasGovCue = /(government|india|identity|uidai|passport|voter|aadhaar|aadhar|income tax|pan)/i.test(normalizedCorpus);

    let inferredType = modelDocType;
    if (inferredType === "Unknown") {
      if (hasAadhaarCue || hasAadhaarNumber) inferredType = "Aadhaar";
      else if (hasPanCue || hasPanPattern) inferredType = "PAN";
    }

    const aadhaarFallbackPass = inferredType === "Aadhaar" && hasDob && age >= 18 && (hasAadhaarCue || hasAadhaarNumber) && confidence >= 30;
    const panFallbackPass = inferredType === "PAN" && hasDob && age >= 18 && (hasPanCue || hasPanPattern) && confidence >= 30;
    const otherPass = ["Passport", "Voter ID", "Driving License"].includes(inferredType) && hasDob && age >= 18 && confidence >= 45;
    const unknownButLikelyGov = inferredType === "Unknown" && hasDob && age >= 18 && hasGovCue && confidence >= 55;

    const heuristicGovernmentId = aadhaarFallbackPass || panFallbackPass || otherPass || unknownButLikelyGov;
    const finalIsGovernmentId = Boolean(parsed.isGovernmentId) || heuristicGovernmentId;
    const adjustedConfidence = heuristicGovernmentId && confidence < 55 ? 55 : confidence;
    const hasPortraitFace = Boolean(parsed.hasPortraitFace) || (heuristicGovernmentId && adjustedConfidence >= 55);
    const finalDocType = unknownButLikelyGov && hasAadhaarNumber ? "Aadhaar" : inferredType;

    const result: GovernmentIdValidationResult = {
      isGovernmentId: finalIsGovernmentId,
      documentType: finalDocType,
      hasPortraitFace,
      hasDob,
      dob: parsedDob ? parsedDob.toISOString().slice(0, 10) : "",
      age,
      isAdult: age >= 18,
      confidence: adjustedConfidence,
      reasoning: finalIsGovernmentId
        ? (parsed.reasoning || "Government ID validated.")
        : (parsed.reasoning || "Unable to validate document type."),
      serviceAvailable: true,
    };

    // Cache the result
    governmentIdCache.set(cacheKey, result, CACHE_TTLS.GOVERNMENT_ID);
    idVerificationRateLimiter.recordRequest(identifier);

    return result;
  } catch (error: any) {
    const message = String(error?.message || error || "unknown error");
    const likelyKeyIssue = /api key|permission|unauth|401|403|invalid|not configured/i.test(message);

    // Record failed request for rate limiting
    idVerificationRateLimiter.recordRequest(identifier);

    // Null-safe rate-limit block check
    if (message.includes("429")) {
      idVerificationRateLimiter.block(identifier);
    }

    return {
      isGovernmentId: false,
      documentType: "Unknown",
      hasPortraitFace: false,
      hasDob: false,
      dob: "",
      age: 0,
      isAdult: false,
      confidence: 0,
      reasoning: likelyKeyIssue
        ? "AI verification unavailable: invalid or unauthorized GEMINI_API_KEY. Please set a valid key in your .env file."
        : `Government ID verification service unavailable: ${message}`,
      serviceAvailable: !likelyKeyIssue,
    };
  }
};

export const analyzeBiometricFraud = async (idBase64: string, selfieBase64: string): Promise<FraudAnalysisResult> => {
  // Check cache first
  const cacheKey = ["biometric", idBase64.substring(0, 100), selfieBase64.substring(0, 100)];
  const cachedResult = biometricCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Check rate limit
  const identifier = `biometric:${crypto.createHash("sha256").update(idBase64 + selfieBase64).digest("hex").substring(0, 16)}`;
  if (!biometricRateLimiter.canProceed(identifier)) {
    return {
      score: 100,
      reasoning: "Rate limit exceeded. Please try again later.",
      isSafe: false,
    };
  }

  try {
    const parsed = await callGeminiWithRetry([
      {
        text: `You are an election-security biometric verifier.
Compare an official government ID image with a live selfie.
Return strict JSON only with these fields:
{
  "score": number,
  "reasoning": string,
  "isSafe": boolean
}
Allow natural changes over time including age, hairstyle, facial hair, lighting, and pose. Focus on stable facial structure. If uncertain, return isSafe=false.`
      },
      { inlineData: { mimeType: "image/jpeg", data: stripDataUrl(idBase64) } },
      { inlineData: { mimeType: "image/jpeg", data: stripDataUrl(selfieBase64) } },
    ]);

    const numericScore = Number(parsed.score);
    const strictSafe = Boolean(parsed.isSafe) && Number.isFinite(numericScore) && numericScore <= 60;

    const result: FraudAnalysisResult = {
      score: Number.isFinite(numericScore) ? numericScore : 100,
      reasoning: parsed.reasoning || "AI verification returned invalid response.",
      isSafe: strictSafe,
    };

    // Cache the result
    biometricCache.set(cacheKey, result, CACHE_TTLS.BIOMETRIC);
    biometricRateLimiter.recordRequest(identifier);

    return result;
  } catch (error: any) {
    const message = String(error?.message || error || "unknown error");

    // Record failed request for rate limiting
    biometricRateLimiter.recordRequest(identifier);

    // Null-safe rate-limit block check
    if (message.includes("429")) {
      biometricRateLimiter.block(identifier);
    }

    return {
      score: 100,
      reasoning: `AI verification unavailable. Registration blocked for security. (${message})`,
      isSafe: false,
    };
  }
};
