export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID";
  const chainId = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 11155111;
  const chainName = chainId === 11155111 ? "Sepolia Testnet" : "Ethereum";
  
  return res.status(200).json({
    contractAddress: process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    chainId: chainId,
    chainName: chainName,
    rpcUrl: rpcUrl,
  });
}
