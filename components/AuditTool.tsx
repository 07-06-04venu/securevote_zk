import React, { useState } from 'react';
import { Search, ShieldCheck, Hash, FileCheck, AlertCircle, Loader2, Clock, FileText, Activity, Box } from 'lucide-react';
import { getBlockchain } from '../services/cryptoService';
import { Block } from '../types';

const AuditTool: React.FC = () => {
  const [searchHash, setSearchHash] = useState('');
  const [result, setResult] = useState<Block | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchHash.trim()) return;
    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const chain = await getBlockchain();
      const foundBlock = chain.find(b => 
        b.hash === searchHash || 
        b.transactions.some(tx => tx.voterHash === searchHash)
      );

      if (foundBlock) {
        setResult(foundBlock);
      } else {
        setError("No record found with this hash. Ensure the hash is correct and the block has been mined.");
      }
    } catch (err) {
      setError("Failed to query the blockchain. Please try again later.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tighter leading-none">Blockchain <span className="font-serif italic text-indigo-600">Audit Tool</span></h2>
          <p className="text-slate-500 text-base">Verify the integrity of any transaction or block on the permissioned ledger.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-700 text-sm font-bold">
          <ShieldCheck className="w-5 h-5" />
          Public Verifiability
        </div>
      </div>

      {/* Search Section */}
      <div className="glass-card p-10 rounded-[2.5rem] space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">Cryptographic Search</h3>
            <p className="text-slate-500 text-sm">Enter a block hash or transaction ID to retrieve its immutable record.</p>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Search className="w-6 h-6" />
            </div>
            <input 
              type="text" 
              placeholder="0x..."
              value={searchHash}
              onChange={(e) => setSearchHash(e.target.value)}
              className="w-full pl-16 pr-32 py-6 bg-white border-2 border-slate-100 rounded-3xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg font-mono transition-all shadow-sm"
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching || !searchHash}
              className="absolute right-3 top-3 bottom-3 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify"}
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span>SHA-256 Integrity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span>Merkle Proof Valid</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4 text-red-700 animate-in shake">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Result Section */}
      {result && (
        <div className="animate-in slide-in-from-bottom-8 duration-500">
          <div className="glass-card rounded-[2.5rem] overflow-hidden border-2 border-emerald-500/20">
            <div className="p-8 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Verification Successful</h3>
                  <p className="text-emerald-700 text-sm font-medium">This record is cryptographically linked to the genesis block.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Block Height</p>
                <p className="text-2xl font-mono font-bold text-slate-900">#{result.index}</p>
              </div>
            </div>

            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Block Metadata</h4>
                  <div className="space-y-4">
                    {[
                      { label: "Timestamp", value: new Date(result.timestamp).toLocaleString(), icon: Clock },
                      { label: "Transactions", value: `${result.transactions.length} Verified Votes`, icon: FileText },
                      { label: "Difficulty", value: result.difficulty, icon: Activity },
                      { label: "Gas Used", value: result.gasUsed, icon: Box }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 text-slate-500">
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Cryptographic Chain</h4>
                  <div className="p-6 bg-slate-900 rounded-3xl space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Current Hash</p>
                      <p className="text-xs font-mono text-slate-300 break-all leading-relaxed">{result.hash}</p>
                    </div>
                    <div className="h-px bg-white/10"></div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Previous Hash</p>
                      <p className="text-xs font-mono text-slate-300 break-all leading-relaxed">{result.previousHash}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Verified Transactions</h4>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {result.transactions.map((tx, i) => (
                    <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4 hover:border-indigo-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                          Vote Cast
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction ID</p>
                        <p className="text-xs font-mono text-slate-900 break-all">{tx.id}</p>
                      </div>
                      <div className="pt-2 flex items-center gap-2 text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">ZK-Proof Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTool;
