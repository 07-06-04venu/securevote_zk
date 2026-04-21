export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  return res.status(200).json({
    contractAddress: process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    chainId: 11155111,
    chainName: "Sepolia Testnet",
    rpcUrl: "https://sepolia.infura.io/v3/" + (process.env.INFURA_PROJECT_ID || "YOUR_INFURA_PROJECT_ID"),
  });
}
