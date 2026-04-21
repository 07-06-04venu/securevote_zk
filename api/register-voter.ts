export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { address } = req.body || {};
  if (!address) {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  const voterId = `SV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const humanProofCode = `HUMAN-100-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return res.status(200).json({
    success: true,
    voterId,
    isNew: true,
    humanProofCode,
  });
}