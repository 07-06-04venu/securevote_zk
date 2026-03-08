import React, { useState } from 'react';
import { Candidate, Vote } from '../types';
import { AlertCircle, CheckCircle, FileKey, Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { generateZKProof, sha256, verifyWebAuthn } from '../services/cryptoService';
import { connectWallet, signVoteAuthorization } from '../services/ethereumService';

interface Props {
  candidates: Candidate[];
  voterId: string;
  voterWalletAddress?: string;
  humanProofCode?: string;
  hasVoted?: boolean;
  onVoteSubmit: (vote: Vote) => void;
}

const VotingBallot: React.FC<Props> = ({ candidates, voterId, voterWalletAddress, humanProofCode, hasVoted = false, onVoteSubmit }) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handlePhysicalAuth = async () => {
    const success = await verifyWebAuthn();
    if (success) {
      setError(null);
      setIsAuthenticated(true);
    } else {
      setError('Device verification failed. Use your in-built or connected external biometric authenticator.');
    }
  };

  const handleCastVote = async () => {
    setError(null);
    if (hasVoted) {
      setError('This voter has already cast a vote.');
      return;
    }
    if (!selectedCandidateId) return;

    if (!candidates.some((c) => c.id === selectedCandidateId)) {
      setError('Invalid candidate selection detected. Please refresh and try again.');
      setSelectedCandidateId(null);
      return;
    }

    setIsSubmitting(true);
    try {
      setProgress('Generating ZK proof...');
      const zkProof = await generateZKProof(selectedCandidateId);

      setProgress('Hashing voter identity...');
      const voterHash = await sha256(voterId);

      setProgress('Connecting wallet...');
      const activeWallet = await connectWallet();
      setConnectedWallet(activeWallet);

      if (voterWalletAddress && activeWallet.toLowerCase() !== voterWalletAddress.toLowerCase()) {
        throw new Error('Connected wallet does not match your registered voter wallet.');
      }

      setProgress('Requesting authorization signature (no gas fee)...');
      const { signature } = await signVoteAuthorization({
        voterId,
        voterHash,
        candidateId: selectedCandidateId,
        zkProof,
      });

      setProgress('Submitting vote via relayer...');
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId,
          voterHash,
          candidateIds: [selectedCandidateId],
          zkProof,
          signature,
          walletAddress: activeWallet,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Vote relay failed.');

      onVoteSubmit({
        voterHash,
        candidateIds: [selectedCandidateId],
        timestamp: Date.now(),
        zkProof,
        transactionHash: payload.transactionHash,
        walletAddress: activeWallet,
      });
    } catch (e: any) {
      setError(e.message || 'Vote submission failed.');
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] max-w-2xl mx-auto text-center space-y-8 animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-10"></div>
          <div className="relative z-10 w-32 h-32 rounded-full border-4 border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
            <Fingerprint className="w-16 h-16 text-emerald-500" />
          </div>
          <div className="absolute -top-2 -right-2 bg-slate-50 p-2 rounded-full border border-slate-300 shadow-sm">
            <Lock className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Authenticate to Vote</h2>
          <p className="text-slate-600 max-w-md mx-auto">Use your in-built fingerprint/face reader or an externally connected biometric authenticator.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={handlePhysicalAuth} className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-semibold transition shadow-lg shadow-emerald-600/20">
            <Fingerprint className="w-5 h-5" /> Authenticate with Biometric Device
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <FileKey className="w-20 h-20 text-emerald-600 relative z-10 animate-bounce" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Processing Secure Vote</h3>
          <p className="text-emerald-700 font-mono text-sm font-semibold">{progress}</p>
          <p className="text-xs text-slate-500 mt-1">No voter gas payment. Relayer handles blockchain fee.</p>
        </div>
        <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 animate-pulse-slow w-full origin-left"></div></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Official Ballot</h3>
          <p className="text-slate-600">Select <span className="text-emerald-600 font-bold">ONE</span> candidate below.</p>
        </div>
        <div className="flex items-center gap-1 text-emerald-700 text-xs px-2 py-1 bg-emerald-50 rounded border border-emerald-200"><ShieldCheck className="w-3 h-3" /> Authenticated</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 font-mono">Human Verification: {humanProofCode || 'HUMAN-100-VERIFIED'}</div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 font-mono break-all">Wallet: {connectedWallet || voterWalletAddress || 'Connect MetaMask on submit'}</div>
      </div>

      {hasVoted && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center gap-3 text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>This voter has already cast a vote. Ballot is now locked.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.length === 0 && (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">No candidates available right now. Please ask admin to publish candidates.</div>
        )}
        {candidates.map((candidate) => {
          const isSelected = selectedCandidateId === candidate.id;
          return (
            <div key={candidate.id} onClick={() => !hasVoted && setSelectedCandidateId(candidate.id)} className={`relative p-6 rounded-xl border-2 transition-all duration-200 group shadow-sm ${hasVoted ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
              <div className="flex items-start gap-4">
                <img src={candidate.avatarUrl} alt={candidate.name} className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-sm" />
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-slate-900">{candidate.name}</h4>
                  <p className="text-sm text-emerald-600 font-medium mb-1">{candidate.party}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{candidate.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-slate-400'}`}>{isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</div>
              </div>
              {isSelected && <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in duration-200"><CheckCircle className="w-4 h-4" /></div>}
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-slate-200 bg-white/80 rounded-2xl p-4 shadow-sm">
        <button
          onClick={handleCastVote}
          disabled={hasVoted || !selectedCandidateId}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all border ${(hasVoted || !selectedCandidateId) ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'}`}
        >
          <Lock className="w-5 h-5" />
          {hasVoted ? 'Vote Already Cast' : (selectedCandidateId ? 'Authorize & Cast Vote (No Voter Fee)' : 'Select a Candidate to Vote')}
        </button>
        <p className="text-xs text-center mt-3 text-slate-600">Your vote is gasless for voters: you only sign, relayer pays the blockchain fee.</p>
      </div>
    </div>
  );
};

export default VotingBallot;
