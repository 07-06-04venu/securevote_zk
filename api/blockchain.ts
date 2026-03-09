import { ethers } from "ethers";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  const rpcUrl = process.env.RPC_URL;
  
  if (!rpcUrl) {
    return res.status(500).json({ error: "RPC_URL not configured" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    const blocks = [];
    
    for (let i = Math.max(0, blockNumber - 10); i <= blockNumber; i++) {
      const block = await provider.getBlock(i);
      if (block) {
        blocks.push({
          index: block.number,
          timestamp: block.timestamp * 1000,
          hash: block.hash,
          previousHash: block.parentHash,
          validator: block.miner,
          transactions: block.transactions.length,
        });
      }
    }
    
    return res.status(200).json(blocks);
  } catch (e: any) {
    console.error("Error fetching blockchain:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
