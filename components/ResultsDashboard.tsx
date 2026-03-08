import React, { useEffect, useState } from 'react';
import { Block, Candidate, Vote } from '../types';
import { blockchainInstance } from '../services/cryptoService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Box, Hash, RefreshCcw } from 'lucide-react';

interface Props {
  candidates: Candidate[];
  userVoteHash?: string;
}

const ResultsDashboard: React.FC<Props> = ({ candidates, userVoteHash }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [tally, setTally] = useState<{ name: string, votes: number }[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshData = async () => {
    try {
      // Fetch live tally from the smart contract
      const tallyRes = await fetch('/api/tally');
      if (tallyRes.ok) {
        const tallyData = await tallyRes.json();
        setTally(tallyData.map((c: any) => ({ name: c.name, votes: c.voteCount })));
      }

      // Fetch blockchain blocks for the explorer
      const blockRes = await fetch('/api/blockchain');
      if (blockRes.ok) {
        const chain = await blockRes.json();
        setBlocks([...chain].reverse()); // Newest first
      }

      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); // Live poll
    return () => clearInterval(interval);
  }, [candidates]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-xl border-l-4 border-emerald-500">
          <h3 className="text-slate-500 text-sm font-medium uppercase">Total Votes Cast</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {tally.reduce((acc, curr) => acc + curr.votes, 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-6 rounded-xl border-l-4 border-emerald-500">
          <h3 className="text-slate-500 text-sm font-medium uppercase">Blocks Mined</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {blocks.length.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-6 rounded-xl border-l-4 border-indigo-500">
          <h3 className="text-slate-500 text-sm font-medium uppercase">Last Update</h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xl font-bold text-slate-900">
              {lastUpdate.toLocaleTimeString()}
            </p>
            <RefreshCcw className="w-5 h-5 text-indigo-500 animate-spin-slow" />
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          Live Results (First Preference)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tally} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="name" type="category" stroke="#0f172a" width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0ea5e9' }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                {tally.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#34d399', '#f472b6'][index % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Receipt */}
      {userVoteHash && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-emerald-700 mb-2">Your Verified Vote Receipt</h3>
          <p className="text-sm text-slate-600 mb-2">Save this hash to verify your vote inclusion in the immutable ledger.</p>
          <div className="bg-white p-3 rounded font-mono text-xs text-emerald-700 break-all border border-emerald-200 shadow-sm flex items-center gap-3">
            <Hash className="w-4 h-4 shrink-0" />
            {userVoteHash}
          </div>
        </div>
      )}

      {/* Block Explorer */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Box className="w-5 h-5 text-indigo-500" />
          Ethereum Blockchain Explorer
        </h3>
        <div className="space-y-4">
          {blocks.slice(0, 5).map((block) => (
            <div key={block.hash} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded font-mono border border-indigo-100">
                  Block #{block.index}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(block.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2 text-xs">
                  <span className="text-slate-500 w-16">Hash:</span>
                  <span className="text-slate-700 font-mono truncate">{block.hash}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-slate-500 w-16">Prev:</span>
                  <span className="text-slate-600 font-mono truncate">{block.previousHash}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-slate-500 w-16">Miner:</span>
                  <span className="text-slate-500 font-mono truncate">{block.validator}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-slate-500 w-16">Txns:</span>
                  <span className="text-slate-700 font-mono">{block.transactions.length}</span>
                </div>
              </div>
            </div>
          ))}
          {blocks.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">No blocks found. Make sure the Hardhat node is running.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
