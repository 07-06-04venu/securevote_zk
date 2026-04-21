export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  const isDemo = process.env.DEMO_MODE === "true" || !process.env.SEPOLIA_RPC_URL;
  
  if (isDemo) {
    return res.status(200).json({
      contractAddress: process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
      chainId: 11155111,
      chainName: "Sepolia Testnet (Demo)",
      rpcUrl: "https://sepolia.infura.io/v3/demo",
      demoMode: true,
    });
  }
  
  return res.status(200).json({
    contractAddress: process.env.CONTRACT_ADDRESS,
    chainId: 11155111,
    chainName: "Sepolia Testnet",
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    demoMode: false,
  });
}