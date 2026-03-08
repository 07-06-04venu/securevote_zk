import { GoogleGenAI, Type } from '@google/genai';
import { FraudAnalysisResult } from '../types';

type GovernmentIdValidationResult = {
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

const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = key ? new GoogleGenAI({ apiKey: key }) : null;

const stripDataUrl = (img: string) => img.replace(/^data:image\/\w+;base64,/, '');

const normalizeDocType = (raw: string): string => {
  const t = String(raw || '').toLowerCase();
  if (t.includes('aadhaar') || t.includes('aadhar')) return 'Aadhaar';
  if (t.includes('pan')) return 'PAN';
  if (t.includes('passport')) return 'Passport';
  if (t.includes('voter')) return 'Voter ID';
  if (t.includes('driving') || t.includes('driver')) return 'Driving License';
  return 'Unknown';
};

const parseDob = (raw: string): Date | null => {
  const value = String(raw || '').trim();
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

const calculateAge = (dob: Date): number => {
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
};

export const validateGovernmentIdDocument = async (idBase64: string): Promise<GovernmentIdValidationResult> => {
  if (!ai) {
    return {
      isGovernmentId: false,
      documentType: 'Unknown',
      hasPortraitFace: false,
      hasDob: false,
      dob: '',
      age: 0,
      isAdult: false,
      confidence: 0,
      reasoning: 'AI verification unavailable: GEMINI_API_KEY is not configured.',
      serviceAvailable: false,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            text: `You are validating an uploaded identity document for election registration in India.
Return strict JSON with:
- isGovernmentId: boolean (true only if this is a real government-issued photo ID)
- documentType: string (Aadhaar, PAN, Passport, Voter ID, Driving License, Unknown)
- hasPortraitFace: boolean
- hasDob: boolean (date of birth clearly visible and readable)
- dob: string (YYYY-MM-DD preferred; DD/MM/YYYY allowed; else empty)
- confidence: number (0-100)
- reasoning: short reason
Reject screenshots, web error pages, random photos, logos, or non-ID documents.`
          },
          { inlineData: { mimeType: 'image/jpeg', data: stripDataUrl(idBase64) } }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isGovernmentId: { type: Type.BOOLEAN },
            documentType: { type: Type.STRING },
            hasPortraitFace: { type: Type.BOOLEAN },
            hasDob: { type: Type.BOOLEAN },
            dob: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ['isGovernmentId', 'documentType', 'hasPortraitFace', 'hasDob', 'dob', 'confidence', 'reasoning']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}') as any;
    const confidence = Number(parsed.confidence);
    const parsedDob = parseDob(parsed.dob || '');
    const age = parsedDob ? calculateAge(parsedDob) : 0;

    return {
      isGovernmentId: Boolean(parsed.isGovernmentId),
      documentType: normalizeDocType(parsed.documentType),
      hasPortraitFace: Boolean(parsed.hasPortraitFace),
      hasDob: Boolean(parsed.hasDob) && Boolean(parsedDob),
      dob: parsedDob ? parsedDob.toISOString().slice(0, 10) : '',
      age,
      isAdult: age >= 18,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      reasoning: parsed.reasoning || 'Unable to validate document type.',
      serviceAvailable: true,
    };
  } catch (error: any) {
    console.error('Government ID validation failed:', error);
    const message = String(error?.message || error || 'unknown error');
    const likelyKeyIssue = /api key|permission|unauth|401|403|invalid/i.test(message);
    return {
      isGovernmentId: false,
      documentType: 'Unknown',
      hasPortraitFace: false,
      hasDob: false,
      dob: '',
      age: 0,
      isAdult: false,
      confidence: 0,
      reasoning: likelyKeyIssue
        ? 'AI verification unavailable: invalid or unauthorized GEMINI_API_KEY.'
        : `Government ID verification service unavailable: ${message}`,
      serviceAvailable: false,
    };
  }
};

export const analyzeBiometricFraud = async (
  idBase64: string,
  selfieBase64: string
): Promise<FraudAnalysisResult> => {
  if (!ai) {
    return {
      score: 100,
      reasoning: 'AI verification unavailable. GEMINI_API_KEY is not configured.',
      isSafe: false,
    };
  }

  try {
    const model = 'gemini-2.5-flash';

    const prompt = `
You are an election-security biometric verifier.
Compare an official government ID image with a live selfie.
Return strict JSON:
- score: number (0-100 fraud risk, lower is better)
- reasoning: string
- isSafe: boolean

Important matching policy:
- Allow natural changes over time: age progression, haircut/hairstyle, beard/moustache changes, minor weight change, lighting, camera quality, and pose differences.
- Prioritize stable facial structure cues (eye spacing, nose bridge/base, eyebrow geometry, jaw/cheekbone structure, ear position where visible).
- Do NOT reject based only on hairstyle/facial hair/ageing differences.

Hard requirements for isSafe=true:
1) ID image appears to be a real government-issued photo ID.
2) Face likely belongs to same person after accounting for natural changes above.
3) Selfie appears live (not replay/screen/deepfake).
4) No major tampering indicators.
If uncertain, return isSafe=false.
`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: stripDataUrl(idBase64) } },
          { inlineData: { mimeType: 'image/jpeg', data: stripDataUrl(selfieBase64) } }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            isSafe: { type: Type.BOOLEAN }
          },
          required: ['score', 'reasoning', 'isSafe']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}') as FraudAnalysisResult;
    const numericScore = Number(parsed.score);
    const strictSafe = Boolean(parsed.isSafe) && Number.isFinite(numericScore) && numericScore <= 28;

    return {
      score: Number.isFinite(numericScore) ? numericScore : 100,
      reasoning: parsed.reasoning || 'AI verification returned invalid response.',
      isSafe: strictSafe,
    };
  } catch (error: any) {
    console.error('Gemini Analysis Failed:', error);
    const message = String(error?.message || error || 'unknown error');
    return {
      score: 100,
      reasoning: `AI verification unavailable. Registration blocked for security. (${message})`,
      isSafe: false
    };
  }
};
