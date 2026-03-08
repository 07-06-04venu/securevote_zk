import { Vote, Block } from '../types';

export const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const generateZKProof = async (voteData: string): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return `zk-snark-proof-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
};

export type AuthenticatorMode = 'platform' | 'cross-platform';

export interface BiometricCapabilities {
  webAuthnSupported: boolean;
  platformAuthenticatorAvailable: boolean;
}

const isIpHost = (host: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':');

const ensureWebAuthnOrigin = () => {
  const host = window.location.hostname;
  if (isIpHost(host)) {
    throw new Error('Biometric auth requires localhost origin. Open http://localhost:3000 (not 127.0.0.1).');
  }
};

export const getBiometricCapabilities = async (): Promise<BiometricCapabilities> => {
  const webAuthnSupported = Boolean(window.PublicKeyCredential);
  if (!webAuthnSupported) {
    return {
      webAuthnSupported: false,
      platformAuthenticatorAvailable: false,
    };
  }

  try {
    if (isIpHost(window.location.hostname)) {
      return {
        webAuthnSupported: true,
        platformAuthenticatorAvailable: false,
      };
    }
    const platformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return {
      webAuthnSupported: true,
      platformAuthenticatorAvailable,
    };
  } catch {
    return {
      webAuthnSupported: true,
      platformAuthenticatorAvailable: false,
    };
  }
};

export const registerWebAuthn = async (username: string, mode: AuthenticatorMode = 'platform'): Promise<string | null> => {
  if (!window.PublicKeyCredential) {
    console.warn('WebAuthn not supported in this browser');
    return null;
  }

  try {
    ensureWebAuthnOrigin();
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'SecureVote ZK',
      },
      user: {
        id: userId,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: mode,
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
    return credential.id;
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      console.warn('WebAuthn request cancelled by user or timed out.');
    } else if (e.name === 'SecurityError' || e.message?.includes('not enabled')) {
      console.warn('WebAuthn blocked by Permissions Policy in this environment.');
    } else {
      console.error('WebAuthn Registration failed:', e);
    }
    return null;
  }
};

export const verifyWebAuthn = async (_credentialId?: string): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;

  try {
    ensureWebAuthnOrigin();
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      userVerification: 'required',
      timeout: 60000,
    };

    await navigator.credentials.get({ publicKey });
    return true;
  } catch (e: any) {
    if (e.message?.includes('not enabled') || e.name === 'SecurityError') {
      console.warn("WebAuthn 'get' blocked by Permissions Policy.");
    } else {
      console.warn('WebAuthn Verification failed or cancelled:', e);
    }
    return false;
  }
};

export const registerBiometricVoter = async (voterId: string, imageBlob: Blob): Promise<any> => {
  const formData = new FormData();
  formData.append('file', imageBlob);
  const res = await fetch(`http://localhost:8000/register?voter_id=${voterId}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Biometric registration failed');
  return res.json();
};

export const verifyBiometricVoter = async (voterId: string, imageBlob: Blob): Promise<any> => {
  const formData = new FormData();
  formData.append('file', imageBlob);
  const res = await fetch(`http://localhost:8000/authenticate?voter_id=${voterId}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Biometric authentication failed');
  return res.json();
};

export class SecureBlockchain {
  public chain: Block[];
  public encryptedTallies: Map<number, string>;

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.encryptedTallies = new Map();
  }

  createGenesisBlock(): Block {
    return {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: '0',
      hash: 'genesis-hash-zk-secure',
      validator: 'System-Authority',
    };
  }

  async addSecureVote(vote: Vote): Promise<Block> {
    const previousBlock = this.chain[this.chain.length - 1];
    const newIndex = previousBlock.index + 1;
    const timestamp = Date.now();
    const previousHash = previousBlock.hash;

    const payload = `${newIndex}${previousHash}${timestamp}${JSON.stringify(vote)}`;
    const hash = await sha256(payload);

    const newBlock: Block = {
      index: newIndex,
      timestamp,
      transactions: [vote],
      previousHash,
      hash,
      validator: `Authority-Node-${Math.floor(Math.random() * 100)}`,
    };

    this.chain.push(newBlock);
    return newBlock;
  }
}

export const blockchainInstance = new SecureBlockchain();
export const getBlockchain = async (): Promise<Block[]> => blockchainInstance.chain;
