import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Activity, Users, Lock, CheckCircle, AlertTriangle, Terminal, RefreshCw, UserPlus, Trash2 } from 'lucide-react';
import { Candidate } from '../types';
import { addCandidateWithMetaMask, connectWallet, getElectionOwner, removeCandidateWithMetaMask } from '../services/ethereumService';

const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState({ totalVotes: 0 });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'candidates'>('monitoring');
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  // Admin Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [adminToken, setAdminToken] = useState('');

  // New Candidate Form State
  const [newCandidate, setNewCandidate] = useState({ name: '', party: '', description: '', avatarUrl: 'https://picsum.photos/200' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [candidateActionError, setCandidateActionError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const candidatesRes = await fetch('/api/candidates').then(r => r.json()).catch(() => []);
        const safeCandidates = Array.isArray(candidatesRes) ? candidatesRes : [];

        setCandidates(safeCandidates);
        setStats({ totalVotes: 0 });
        setDataError('');
      } catch (e) {
        console.error(e);
        setCandidates([]);
        setStats({ totalVotes: 0 });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminToken(data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Server connection error');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setNewCandidate(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto mt-20 p-8 glass-card rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <Lock className="w-6 h-6 text-emerald-600" />
          Election Commission Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={loginForm.username}
            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:border-emerald-500 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:border-emerald-500 outline-none"
            required
          />
          {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-8 animate-in fade-in duration-700">
      <div className="flex border-b border-slate-200 gap-8 mb-4">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'monitoring' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          System Monitoring
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'candidates' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Candidate Mall
        </button>
      </div>

      {activeTab === 'monitoring' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Total Votes Cast</span>
            </div>
            <div className="text-4xl font-black text-slate-900">{stats.totalVotes}</div>
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-cyan-600 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Registered Candidates</span>
            </div>
            <div className="text-4xl font-black text-slate-900">{candidates.length}</div>
          </div>
        </div>
      ) : null}

      {activeTab === 'candidates' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
          {candidateActionError && <p className="text-red-500 text-sm">{candidateActionError}</p>}
          <div className="glass-card p-8 rounded-3xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Add New Candidate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              <div className="flex flex-col gap-2 relative">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                    Upload Logo (Optional)
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="col-span-1 lg:col-span-3 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Candidate Name"
                    value={newCandidate.name}
                    onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none"
                  />
                  <input
                    placeholder="Party Name"
                    value={newCandidate.party}
                    onChange={e => setNewCandidate({ ...newCandidate, party: e.target.value })}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none"
                  />
                </div>
                <input
                  placeholder="Description"
                  value={newCandidate.description}
                  onChange={e => setNewCandidate({ ...newCandidate, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none"
                />
                <button
                  onClick={async () => {
                    if (!newCandidate.name || !newCandidate.party) return;
                    setCandidateActionError('');
                    try {
                      const wallet = await connectWallet();
                      const owner = (await getElectionOwner()).toLowerCase();
                      if (wallet.toLowerCase() !== owner) {
                        throw new Error('Connected wallet is not the contract owner. Use the deployed owner wallet for admin actions.');
                      }

                      await addCandidateWithMetaMask(newCandidate);
                      setNewCandidate({ name: '', party: '', description: '', avatarUrl: 'https://picsum.photos/200' });
                      setImagePreview(null);
                      setImageFile(null);
                      const updated = await fetch('/api/candidates').then(r => r.json());
                      setCandidates(Array.isArray(updated) ? updated : []);
                    } catch (e: any) {
                      setCandidateActionError(e.message || 'Failed to add candidate.');
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-600/20"
                >
                  Add Candidate
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map(candidate => (
              <div key={candidate.id} className="glass-card p-6 rounded-2xl flex items-center gap-4 group">
                <img src={candidate.avatarUrl} alt={candidate.name} className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm" />
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900">{candidate.name}</h4>
                  <p className="text-xs text-slate-500">{candidate.party}</p>
                </div>
                <button
                  onClick={async () => {
                    setCandidateActionError('');
                    try {
                      const wallet = await connectWallet();
                      const owner = (await getElectionOwner()).toLowerCase();
                      if (wallet.toLowerCase() !== owner) {
                        throw new Error('Connected wallet is not the contract owner. Use the deployed owner wallet for admin actions.');
                      }

                      await removeCandidateWithMetaMask(candidate.id);
                      const updated = await fetch('/api/candidates').then(r => r.json());
                      setCandidates(Array.isArray(updated) ? updated : []);
                    } catch (e: any) {
                      setCandidateActionError(e.message || 'Failed to remove candidate.');
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;






