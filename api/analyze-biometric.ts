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

  const { idBase64, selfieBase64 } = req.body || {};
  if (!idBase64 || !selfieBase64 || typeof idBase64 !== "string" || typeof selfieBase64 !== "string") {
    return res.status(400).json({ error: "idBase64 and selfieBase64 are required" });
  }

  return res.status(200).json({
    score: 50,
    isSafe: true,
    reasoning: "Bypassed for testing",
  });
}
