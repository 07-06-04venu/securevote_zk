import { ethers } from "ethers";

export const config = {
  maxDuration: 5,
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const rpc = process.env.RPC_URL;
    if (!rpc) {
      return res.status(200).json({ ok: false, rpcConfigured: false });
    }
    const provider = new (ethers as any).JsonRpcProvider(rpc);
    const blockNumber = await provider.getBlockNumber();
    return res.status(200).json({ ok: true, rpc, latestBlock: blockNumber });
  } catch (e: any) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
