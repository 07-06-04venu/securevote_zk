export default async function handler(req: any, res: any) {
  return res.status(200).json({ 
    message: "API is working!",
    geminiKey: process.env.GEMINI_API_KEY ? "SET" : "NOT SET",
    mongoUri: process.env.MONGODB_URI ? "SET" : "NOT SET",
    rpcUrl: process.env.RPC_URL ? "SET" : "NOT SET"
  });
}
