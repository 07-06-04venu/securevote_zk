export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  const rpcUrl = process.env.RPC_URL;
  
  if (!rpcUrl) {
    return res.status(200).json({ 
      serviceAvailable: false, 
      error: "RPC_URL not configured - using mock data", 
      blocks: [{
        index: 0,
        timestamp: Date.now(),
        hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        previousHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        validator: "0x0000000000000000000000000000000000000000",
        transactions: []
      }]
    });
  }
  
  return res.status(200).json({ 
    serviceAvailable: true, 
    blocks: [{
      index: 0,
      timestamp: Date.now(),
      hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      previousHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      validator: "0x0000000000000000000000000000000000000000",
      transactions: []
    }]
  });
}
