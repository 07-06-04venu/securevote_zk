export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

export default async function handler(req: any, res: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { idBase64 } = req.body || {};
  if (!idBase64 || typeof idBase64 !== "string") {
    return res.status(400).json({ error: "idBase64 is required" });
  }

    // Demo mode - always accept for testing
    return res.status(200).json({
      isGovernmentId: true,
      documentType: "Aadhaar",
      hasPortraitFace: true,
      hasDob: true,
      dob: "01/01/2000",
      age: 25,
      isAdult: true,
      confidence: 85,
      reasoning: "Document verified for demo",
      serviceAvailable: true,
    });
}
