export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { voterId } = req.body || {};
  if (!voterId) {
    return res.status(400).json({ error: "Voter ID is required" });
  }

  // Demo mode - accept any voter ID and return a mock voter
  return res.status(200).json({
    success: true,
    voter: {
      voterId: voterId,
      address: "0x0000000000000000000000000000000000000000",
      humanProofCode: "HUMAN-100-DEMO",
      hasVoted: false,
    }
  });
}