export interface Candidate {
  id: string;
  name: string;
  party: string;
  description: string;
  avatarUrl: string;
}

export interface VoterProfile {
  id: string;
  name: string;
  isVerified: boolean;
  fraudRiskScore: number;
  biometricToken?: string;
  photoUrl?: string;
  fingerprintHash?: string;
  credentialId?: string;
  walletAddress?: string;
  humanProofCode?: string;
  hasVoted?: boolean;
}

export interface Vote {
  voterHash: string;
  candidateIds: string[];
  timestamp: number;
  zkProof: string;
  transactionHash?: string;
  walletAddress?: string;
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Vote[];
  previousHash: string;
  hash: string;
  validator: string;
}

export enum Step {
  LANDING,
  REGISTRATION,
  VOTING,
  SUBMITTING,
  RECEIPT,
  DASHBOARD,
  ADMIN
}

export interface FraudAnalysisResult {
  score: number;
  reasoning: string;
  isSafe: boolean;
}
