export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { idBase64 } = req.body || {};
  if (!idBase64 || typeof idBase64 !== "string") {
    return res.status(400).json({ error: "idBase64 is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      isGovernmentId: false,
      documentType: "Unknown",
      hasPortraitFace: false,
      hasDob: false,
      dob: "",
      age: 0,
      isAdult: false,
      confidence: 0,
      serviceAvailable: false,
      reasoning: "GEMINI_API_KEY not configured",
    });
  }

  try {
    const geminiModel = "gemini-2.5-flash";
    const stripDataUrl = (img: string) => img.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `You are validating Indian government identity documents for election registration.
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
Handle multilingual IDs. Reject browser screenshots, error pages, and non-ID documents.` },
            { inlineData: { mimeType: "image/jpeg", data: stripDataUrl(idBase64) } }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const payload = await response.json();
    const candidateText = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("\n") || "";

    const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

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
      if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      const dmy = value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
      return null;
    };

    const docType = normalizeDocType(parsed.documentType || "");
    const dob = parseDob(parsed.dob || "");
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

    return res.status(200).json({
      isGovernmentId: parsed.isGovernmentId || false,
      documentType: docType,
      hasPortraitFace: parsed.hasPortraitFace || false,
      hasDob: Boolean(dob),
      dob: parsed.dob || "",
      age,
      isAdult: age >= 18,
      confidence: Number(parsed.confidence) || 0,
      reasoning: parsed.reasoning || "",
      serviceAvailable: true,
    });
  } catch (e: any) {
    return res.status(500).json({
      isGovernmentId: false,
      documentType: "Unknown",
      hasPortraitFace: false,
      hasDob: false,
      dob: "",
      age: 0,
      isAdult: false,
      confidence: 0,
      serviceAvailable: false,
      reasoning: `Error: ${e.message}`,
    });
  }
}
