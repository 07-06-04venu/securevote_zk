export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-api-key");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Check if production blockchain is configured
  const hasRpcUrl = process.env.SEPOLIA_RPC_URL && process.env.SEPOLIA_RPC_URL !== "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID";
  const hasContract = process.env.CONTRACT_ADDRESS && process.env.CONTRACT_ADDRESS !== "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  if (hasRpcUrl && hasContract) {
    return res.status(200).json({
      contractAddress: process.env.CONTRACT_ADDRESS,
      chainId: 11155111,
      chainName: "Sepolia Testnet",
      rpcUrl: process.env.SEPOLIA_RPC_URL,
      demoMode: false,
    });
  }
  
  // Demo mode - no blockchain configured
  return res.status(200).json({
    contractAddress: "0x0000000000000000000000000000000000000000",
    chainId: 11155111,
    chainName: "Sepolia Testnet (Demo)",
    rpcUrl: "https://sepolia.infura.io/v3/demo",
    demoMode: true,
  });
}