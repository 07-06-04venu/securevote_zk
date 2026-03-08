import express from "express";
import crypto from "crypto";
import multer from "multer";

const app = express();
const port = Number(process.env.ID_VERIFY_PORT || 8081);
const googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY || "";

app.use(express.json({ limit: "12mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

type DocType = "Aadhaar" | "PAN" | "Passport";

type VerificationErrorCode =
  | "OCR_UNAVAILABLE"
  | "INVALID_IMAGE"
  | "BLURRY_IMAGE"
  | "INVALID_DOCUMENT_TYPE"
  | "DOB_NOT_FOUND"
  | "UNDERAGE"
  | "ID_NUMBER_NOT_FOUND"
  | "INTERNAL_ERROR";

type VerificationResponse = {
  success: true;
  documentType: DocType;
  age: number;
  dob: string;
  idHash: string;
};

type ErrorResponse = {
  success: false;
  errorCode: VerificationErrorCode;
  message: string;
};

type VisionOcrResult = {
  text: string;
  avgConfidence: number;
};

const normalizeBase64 = (raw: string): string => {
  if (!raw) return "";
  return raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "").trim();
};

const parseImageFromRequest = (req: express.Request): string | null => {
  const bodyBase64 = typeof req.body?.imageBase64 === "string" ? req.body.imageBase64 : "";
  if (bodyBase64) return normalizeBase64(bodyBase64);

  const file = (req as any).file as Express.Multer.File | undefined;
  if (file?.buffer?.length) return file.buffer.toString("base64");

  return null;
};

const callGoogleVisionOcr = async (imageBase64: string): Promise<VisionOcrResult> => {
  if (!googleVisionApiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is missing");
  }

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(googleVisionApiKey)}`;

  const payload = {
    requests: [
      {
        image: { content: imageBase64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      },
    ],
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vision API failed (${res.status}): ${errText}`);
  }

  const json: any = await res.json();
  const first = json?.responses?.[0];
  const fullText = first?.fullTextAnnotation?.text || "";

  const confidences: number[] = [];
  const pages = first?.fullTextAnnotation?.pages || [];
  for (const p of pages) {
    for (const b of p?.blocks || []) {
      if (typeof b?.confidence === "number") confidences.push(b.confidence);
    }
  }

  const avgConfidence = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  return { text: fullText, avgConfidence };
};

const extractDocType = (text: string): DocType | null => {
  const t = text.toLowerCase();

  const hasAadhaarKeyword =
    t.includes("aadhaar") ||
    t.includes("aadhar") ||
    t.includes("unique identification authority of india") ||
    t.includes("uidai");

  const hasPanKeyword = t.includes("income tax department") || t.includes("permanent account number");
  const hasPassportKeyword = t.includes("passport") && t.includes("republic of india");

  if (hasAadhaarKeyword) return "Aadhaar";
  if (hasPanKeyword) return "PAN";
  if (hasPassportKeyword) return "Passport";

  return null;
};

const extractIdNumber = (text: string, docType: DocType): string | null => {
  if (docType === "Aadhaar") {
    const m = text.replace(/\s+/g, " ").match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
    return m ? m[0].replace(/\s+/g, "") : null;
  }

  if (docType === "PAN") {
    const m = text.toUpperCase().match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
    return m ? m[0] : null;
  }

  const pass = text.toUpperCase().match(/\b[A-Z][0-9]{7}\b/);
  return pass ? pass[0] : null;
};

const parseDob = (text: string): Date | null => {
  const candidates = text.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/g) || [];

  for (const raw of candidates) {
    const d = raw.replace(/-/g, "/");
    let day: number;
    let month: number;
    let year: number;

    if (/^\d{4}\//.test(d)) {
      const [y, m, dd] = d.split("/").map(Number);
      year = y;
      month = m;
      day = dd;
    } else {
      const [dd, m, y] = d.split("/").map(Number);
      year = y;
      month = m;
      day = dd;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day &&
      year > 1900
    ) {
      return parsed;
    }
  }

  return null;
};

const calculateAge = (dob: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getMonth() - dob.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getUTCDate())) {
    age -= 1;
  }

  return age;
};

const hashIdentity = (idNumber: string): string => {
  return crypto.createHash("sha256").update(idNumber).digest("hex");
};

const reject = (res: express.Response, status: number, errorCode: VerificationErrorCode, message: string) => {
  const body: ErrorResponse = { success: false, errorCode, message };
  return res.status(status).json(body);
};

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "id-verification",
    port,
    ocrProvider: "google-vision",
    apiKeyConfigured: Boolean(googleVisionApiKey),
  });
});

app.post("/api/verify-government-id", upload.single("idImage"), async (req, res) => {
  try {
    const imageBase64 = parseImageFromRequest(req);
    if (!imageBase64) {
      return reject(res, 400, "INVALID_IMAGE", "Provide imageBase64 JSON field or multipart file 'idImage'.");
    }

    let ocr: VisionOcrResult;
    try {
      ocr = await callGoogleVisionOcr(imageBase64);
    } catch (e: any) {
      return reject(res, 503, "OCR_UNAVAILABLE", e?.message || "OCR service unavailable");
    }

    const text = (ocr.text || "").trim();
    if (!text) {
      return reject(res, 422, "BLURRY_IMAGE", "No readable text found. Upload a clearer ID image.");
    }

    if (ocr.avgConfidence > 0 && ocr.avgConfidence < 0.45) {
      return reject(res, 422, "BLURRY_IMAGE", "Image appears blurry or low quality. Please upload a clearer image.");
    }

    const docType = extractDocType(text);
    if (!docType) {
      return reject(res, 422, "INVALID_DOCUMENT_TYPE", "Unsupported or invalid document type. Upload Aadhaar, PAN, or Passport.");
    }

    const dob = parseDob(text);
    if (!dob) {
      return reject(res, 422, "DOB_NOT_FOUND", "Date of Birth could not be extracted from the document.");
    }

    const age = calculateAge(dob);
    if (age < 18) {
      return reject(res, 403, "UNDERAGE", "User is under 18 and not eligible to vote.");
    }

    const idNumber = extractIdNumber(text, docType);
    if (!idNumber) {
      return reject(res, 422, "ID_NUMBER_NOT_FOUND", "Could not extract valid ID number from document.");
    }

    const idHash = hashIdentity(idNumber);

    const out: VerificationResponse = {
      success: true,
      documentType: docType,
      age,
      dob: dob.toISOString().slice(0, 10),
      idHash,
    };

    return res.json(out);
  } catch (e: any) {
    console.error("ID verification error:", e);
    return reject(res, 500, "INTERNAL_ERROR", "Unexpected server error during ID verification.");
  }
});

app.listen(port, () => {
  console.log(`ID verification service running at http://localhost:${port}`);
});
