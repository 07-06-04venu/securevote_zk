import { analyzeBiometricFraud } from "../lib/aiVerification";

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

  const { idBase64, selfieBase64 } = req.body || {};
  if (!idBase64 || !selfieBase64 || typeof idBase64 !== "string" || typeof selfieBase64 !== "string") {
    return res.status(400).json({ error: "idBase64 and selfieBase64 are required" });
  }

  try {
    const result = await analyzeBiometricFraud(idBase64, selfieBase64);
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({
      score: 100,
      isSafe: false,
      reasoning: `AI verification unavailable. Registration blocked for security. (${String(e?.message || e)})`,
    });
  }
}
