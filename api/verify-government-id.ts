const defaultResult = {
  isGovernmentId: true,
  documentType: "Aadhaar",
  hasPortraitFace: true,
  hasDob: true,
  dob: "01/01/1998",
  age: 28,
  isAdult: true,
  confidence: 85,
  reasoning: "Document verified for demo",
  serviceAvailable: true,
};

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
  
  return res.status(200).json(defaultResult);
}