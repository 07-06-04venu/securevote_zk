export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  return res.status(200).json({
    blockNumber: 0,
    timestamp: Date.now(),
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    transactions: 0,
  });
}
