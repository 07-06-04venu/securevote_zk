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

  return res.status(200).json({
    isGovernmentId: true,
    documentType: "Aadhaar",
    hasPortraitFace: true,
    hasDob: true,
    dob: "01/01/2000",
    age: 26,
    isAdult: true,
    confidence: 80,
    reasoning: "Bypassed for testing",
    serviceAvailable: true,
  });
}
