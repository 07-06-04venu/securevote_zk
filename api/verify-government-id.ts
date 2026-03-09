import { validateGovernmentIdDocument } from "../lib/aiVerification";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
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

  try {
    const result = await validateGovernmentIdDocument(idBase64);
    return res.status(200).json(result);
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
      reasoning: `Government ID verification service unavailable: ${String(e?.message || e)}`,
    });
  }
}
