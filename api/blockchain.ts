import { ethers } from "ethers";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  const rpcUrl = process.env.RPC_URL;
  
  if (!rpcUrl) {
    return res.status(500).json({ error: "RPC_URL not configured" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    return res.status(200).json({
      blockNumber,
      timestamp: block ? block.timestamp * 1000 : null,
      hash: block?.hash,
      transactions: block ? block.transactions.length : 0,
    });
  } catch (e: any) {
    console.error("Error fetching blockchain:", e.message);
    return res.status(200).json({
      blockNumber: 0,
      timestamp: Date.now(),
      hash: "0x",
      transactions: 0,
      error: e.message
    });
  }
}
