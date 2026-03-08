import React, { useState } from 'react';
import { LogIn, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { VoterProfile } from '../types';

interface Props {
    onLoginSuccess: (profile: VoterProfile) => void;
    onBack: () => void;
}

const VoterLogin: React.FC<Props> = ({ onLoginSuccess, onBack }) => {
    const [voterId, setVoterId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voterId.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voterId: voterId.trim() })
            });

            const data = await res.json();

            if (res.ok) {
                // Map backend voter to frontend VoterProfile
                const profile: VoterProfile = {
                    id: data.voter.voterId,
                    name: "Verified Voter",
                    isVerified: true,
                    fraudRiskScore: 0.01,
                    walletAddress: data.voter.address,
                    humanProofCode: data.voter.humanProofCode,
                    hasVoted: Boolean(data.voter.hasVoted),
                };
                onLoginSuccess(profile);
            } else {
                setError(data.error || "Invalid Voter ID. Please check and try again.");
            }
        } catch (err) {
            setError("System connection failed. Please ensure the server is running.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card p-8 rounded-3xl space-y-8 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>

                <div className="relative space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mb-4">
                            <ShieldCheck className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Voter Access</h2>
                        <p className="text-slate-600 text-sm">Enter your Digital Voter ID to access the secure ballot.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="voterId" className="block text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
                                Digital Voter ID
                            </label>
                            <div className="relative group">
                                <input
                                    id="voterId"
                                    type="text"
                                    value={voterId}
                                    onChange={(e) => setVoterId(e.target.value.toUpperCase())}
                                    placeholder="SV-XXXX-XXXX"
                                    className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-5 py-4 text-slate-900 font-mono placeholder:text-slate-400 outline-none transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in shake-in">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            <button
                                type="submit"
                                disabled={isLoading || !voterId.trim()}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        Secure Login
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={onBack}
                                className="w-full py-3 text-slate-500 hover:text-slate-900 text-sm font-medium transition"
                            >
                                Back to Landing
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-600 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    End-to-end encrypted session. Your IP is logged for security.
                </p>
            </div>
        </div>
    );
};

export default VoterLogin;

