import React, { useState } from 'react';
import { Step, VoterProfile, Candidate, Vote } from './types';
import BiometricRegistration from './components/BiometricRegistration';
import VotingBallot from './components/VotingBallot';
import ResultsDashboard from './components/ResultsDashboard';
import VoterLogin from './components/VoterLogin';
import AdminPanel from './components/AdminPanel';
import { Shield, CheckCircle, Fingerprint, Lock, ShieldAlert, BarChart3, Database, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Candidates are now fetched from the API

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.LANDING);
  const [userProfile, setUserProfile] = useState<VoterProfile | null>(null);
  const [userVoteHash, setUserVoteHash] = useState<string | undefined>(undefined);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  React.useEffect(() => {
    fetch('/api/candidates')
      .then(res => res.json())
      .then(data => setCandidates(data));
  }, []);

  const handleRegistrationComplete = (profile: VoterProfile) => {
    // After registration, we move to the Landing/Login step to use the new ID
    setUserProfile(null);
    setStep(Step.LANDING);
  };

  const handleLoginSuccess = (profile: VoterProfile) => {
    setUserProfile(profile);
    setStep(Step.VOTING);
  };

  const handleVoteSubmit = async (vote: Vote) => {
    setUserVoteHash(vote.transactionHash || vote.voterHash);
    setUserProfile((prev) => (prev ? { ...prev, hasVoted: true } : prev));
    setStep(Step.RECEIPT);
    setTimeout(() => setStep(Step.DASHBOARD), 3000); // Show success then redirect
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={() => setStep(Step.LANDING)}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight cursor-pointer text-slate-900">SecureVote<span className="text-emerald-600">ZK</span></span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep(Step.ADMIN)}
              className={`text-sm font-medium transition ${step === Step.ADMIN ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <ShieldAlert className="w-4 h-4 inline mr-1" />
              Monitoring
            </button>
            <button
              onClick={() => setStep(Step.DASHBOARD)}
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition"
            >
              Live Analytics
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 relative">
        <AnimatePresence mode="wait">
          {step === Step.LANDING && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-sm font-medium">
                <Lock className="w-3 h-3" /> End-to-End Verifiable & Private
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl">
                The Future of <br /> Democratic Integrity
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                Experience the world's most secure electronic voting system.
                Powered by biometric AI authentication and Zero-Knowledge Proofs
                to guarantee your vote is counted without revealing your identity.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => setStep(Step.REGISTRATION)}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-5 h-5" />
                  Apply for Digital ID
                </button>
                <button
                  onClick={() => setStep(Step.SUBMITTING)} // Using SUBMITTING as placeholder for LOGIN
                  className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition border border-slate-300 shadow-sm flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Voter Login
                </button>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
                {[
                  { title: "Biometric Liveness", desc: "AI-driven anti-spoofing ensures only real humans vote." },
                  { title: "Zero-Knowledge Proofs", desc: "Mathematically verify validity without exposing choices." },
                  { title: "Immutable Ledger", desc: "Every vote is permanently recorded on the blockchain." }
                ].map((f, i) => (
                  <div key={i} className="p-6 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition">
                    <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                    <p className="text-sm text-slate-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === Step.REGISTRATION && (
            <BiometricRegistration onComplete={handleRegistrationComplete} />
          )}

          {step === Step.SUBMITTING && ( // Using SUBMITTING for LOGIN step in enum
            <VoterLogin onLoginSuccess={handleLoginSuccess} onBack={() => setStep(Step.LANDING)} />
          )}

          {step === Step.VOTING && userProfile && (
            <VotingBallot
              candidates={candidates}
              voterId={userProfile.id}
              voterWalletAddress={userProfile.walletAddress}
              humanProofCode={userProfile.humanProofCode}
              hasVoted={Boolean(userProfile.hasVoted)}
              onVoteSubmit={handleVoteSubmit}
            />
          )}

          {step === Step.RECEIPT && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/10">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Vote Recorded Successfully</h2>
              <p className="text-slate-600">Your vote has been cryptographically secured and added to the block.</p>
              <p className="text-sm text-slate-500 mt-8">Redirecting to Live Analytics...</p>
            </div>
          )}

          {step === Step.DASHBOARD && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ResultsDashboard candidates={candidates} userVoteHash={userVoteHash} />
            </motion.div>
          )}

          {step === Step.ADMIN && (
            <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
};

export default App;


