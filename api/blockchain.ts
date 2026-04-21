export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Return sample blockchain data for demo
  return res.status(200).json([
    {
      index: 1923456,
      timestamp: Date.now() - 300000,
      hash: "0x" + Math.random().toString(16).slice(2, 66),
      previousHash: "0x" + Math.random().toString(16).slice(2, 66),
      validator: "0x742d35Cc6634C0532925a3b844Bc9e7595f12eB4",
      transactions: ["0x" + Math.random().toString(16).slice(2, 66)]
    },
    {
      index: 1923455,
      timestamp: Date.now() - 600000,
      hash: "0x" + Math.random().toString(16).slice(2, 66),
      previousHash: "0x" + Math.random().toString(16).slice(2, 66),
      validator: "0x742d35Cc6634C0532925a3b844Bc9e7595f12eB4",
      transactions: []
    },
    {
      index: 1923454,
      timestamp: Date.now() - 900000,
      hash: "0x" + Math.random().toString(16).slice(2, 66),
      previousHash: "0x" + Math.random().toString(16).slice(2, 66),
      validator: "0x742d35Cc6634C0532925a3b844Bc9e7595f12eB4",
      transactions: []
    },
    {
      index: 1923453,
      timestamp: Date.now() - 1200000,
      hash: "0x" + Math.random().toString(16).slice(2, 66),
      previousHash: "0x" + Math.random().toString(16).slice(2, 66),
      validator: "0x742d35Cc6634C0532925a3b844Bc9e7595f12eB4",
      transactions: []
    },
    {
      index: 1923452,
      timestamp: Date.now() - 1500000,
      hash: "0x" + Math.random().toString(16).slice(2, 66),
      previousHash: "0x" + Math.random().toString(16).slice(2, 66),
      validator: "0x742d35Cc6634C0532925a3b844Bc9e7595f12eB4",
      transactions: []
    }
  ]);
}