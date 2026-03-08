import { ethers } from 'ethers';

interface ChainConfig {
  contractAddress: string;
  chainId: number;
  chainName: string;
  rpcUrl: string;
}

interface CandidateMutationParams {
  id?: string;
  name: string;
  party: string;
  description?: string;
  avatarUrl?: string;
}

interface VoteAuthorizationParams {
  voterId: string;
  voterHash: string;
  candidateId: string;
  zkProof: string;
}

const ELECTION_ABI = [
  'function owner() view returns (address)',
  'function addCandidate(string _id, string _name, string _party, string _description, string _avatarUrl) public',
  'function removeCandidate(string _id) public',
];

let cachedChainConfig: ChainConfig | null = null;

const getEthereum = () => {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error('MetaMask is required. Please install or enable MetaMask.');
  }
  return eth;
};

const assertExpectedChain = async (provider: ethers.BrowserProvider, expectedChainId: number) => {
  const network = await provider.getNetwork();
  const activeChainId = Number(network.chainId);
  if (activeChainId !== expectedChainId) {
    throw new Error(`Wrong network selected. Use Hardhat Local (chainId ${expectedChainId}).`);
  }
};

const assertLocalDevNode = async (_provider: ethers.BrowserProvider) => {
  // Safety is enforced primarily by strict chainId matching (31337).
  // Some wallet setups proxy clientVersion and may not expose Hardhat/Anvil reliably.
  return;
};

const buildVoteMessage = ({ voterId, voterHash, candidateId, zkProof }: VoteAuthorizationParams) => {
  return [
    'SecureVote Gasless Authorization',
    `voterId:${voterId}`,
    `voterHash:${voterHash}`,
    `candidateId:${candidateId}`,
    `zkProof:${zkProof}`,
  ].join('\n');
};

const getSignerContract = async () => {
  const ethereum = getEthereum();
  await ensureWalletOnElectionNetwork();

  const provider = new ethers.BrowserProvider(ethereum);
  const chain = await getChainConfig();
  await assertExpectedChain(provider, chain.chainId);
  await assertLocalDevNode(provider);

  const signer = await provider.getSigner();
  const contract = new ethers.Contract(chain.contractAddress, ELECTION_ABI, signer);
  return { provider, signer, contract };
};

export const getChainConfig = async (): Promise<ChainConfig> => {
  if (cachedChainConfig) return cachedChainConfig;

  const res = await fetch('/api/chain-config');
  if (!res.ok) {
    throw new Error('Failed to load blockchain configuration from server.');
  }

  const data = await res.json();
  cachedChainConfig = {
    contractAddress: data.contractAddress,
    chainId: data.chainId,
    chainName: data.chainName || 'Hardhat Local',
    rpcUrl: data.rpcUrl,
  };
  return cachedChainConfig;
};

export const ensureWalletOnElectionNetwork = async (): Promise<void> => {
  const ethereum = getEthereum();
  const chain = await getChainConfig();
  const chainIdHex = `0x${chain.chainId.toString(16)}`;

  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
  } catch (err: any) {
    if (err?.code !== 4902) throw err;
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: chainIdHex,
        chainName: chain.chainName,
        rpcUrls: [chain.rpcUrl],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      }],
    });
  }
};

export const connectWallet = async (): Promise<string> => {
  const ethereum = getEthereum();
  await ensureWalletOnElectionNetwork();

  const chain = await getChainConfig();
  const provider = new ethers.BrowserProvider(ethereum);
  await assertExpectedChain(provider, chain.chainId);
  await assertLocalDevNode(provider);

  const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts?.length) {
    throw new Error('No wallet account available.');
  }
  return accounts[0];
};

export const getConnectedWallet = async (): Promise<string | null> => {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
  return accounts?.length ? accounts[0] : null;
};

export const signVoteAuthorization = async (params: VoteAuthorizationParams) => {
  const wallet = await connectWallet();
  const ethereum = getEthereum();
  const message = buildVoteMessage(params);
  const signature = await ethereum.request({
    method: 'personal_sign',
    params: [message, wallet],
  }) as string;

  return { wallet, message, signature };
};

export const getElectionOwner = async (): Promise<string> => {
  const { contract } = await getSignerContract();
  return contract.owner();
};

export const addCandidateWithMetaMask = async ({ id, name, party, description, avatarUrl }: CandidateMutationParams) => {
  const { contract } = await getSignerContract();
  const candidateId = id || `c${Date.now()}`;
  const tx = await contract.addCandidate(candidateId, name, party, description || '', avatarUrl || '');
  const receipt = await tx.wait();
  return { candidateId, hash: receipt?.hash || tx.hash };
};

export const removeCandidateWithMetaMask = async (candidateId: string) => {
  const { contract } = await getSignerContract();
  const tx = await contract.removeCandidate(candidateId);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
};

