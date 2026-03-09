import { ethers } from "ethers";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    return res.status(200).json({ serviceAvailable: false, error: "RPC_URL not configured", blocks: [] });
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    const blocks = [];
    
    for (let i = Math.max(0, blockNumber - 19); i <= blockNumber; i++) {
      const block = await provider.getBlock(i, true);
      if (!block) continue;
      blocks.push({
        index: block.number,
        timestamp: (block.timestamp || 0) * 1000,
        hash: block.hash || "",
        previousHash: block.parentHash || "",
        validator: block.miner || "",
        transactions: (block.transactions || []).map((t: any) =>
          typeof t === "string" ? { hash: t } : t
        ),
      });
    }
    res.status(200).json({ serviceAvailable: true, blocks });
  } catch (e: any) {
    console.error("Error fetching blockchain:", e.message);
    res.status(200).json({ serviceAvailable: false, error: String(e?.message || e), blocks: [] });
  }
}
