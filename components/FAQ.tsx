import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Shield, Fingerprint, Lock, Globe } from 'lucide-react';

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How is my vote kept private?",
      answer: "We use Zero-Knowledge Proofs (ZK-SNARKs) to verify that your vote is valid without revealing which candidate you selected. Your identity is cryptographically decoupled from your ballot before it's added to the blockchain.",
      icon: Lock
    },
    {
      question: "Can someone vote twice?",
      answer: "No. Our biometric registration system ensures a one-person-one-vote policy. Each verified citizen is assigned a unique cryptographic identifier that can only be used once per election cycle.",
      icon: Fingerprint
    },
    {
      question: "Is the blockchain public?",
      answer: "The results and transaction hashes are public for auditability, but the underlying voter identities and choices are encrypted. This provides a balance of transparency and privacy.",
      icon: Globe
    },
    {
      question: "What happens if I lose my device?",
      answer: "Your voting credentials are tied to your biometrics. You can re-verify your identity using facial recognition and fingerprint scanning to regain access to your voter dashboard.",
      icon: Shield
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-700">
      
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-4">
          <HelpCircle className="w-4 h-4" />
          Knowledge Base
        </div>
        <h2 className="text-4xl font-bold text-slate-900 tracking-tighter leading-tight">
          Common <span className="font-serif italic text-indigo-600">Questions</span>
        </h2>
        <p className="text-slate-500 text-base max-w-2xl mx-auto">
          Understanding the cryptographic principles and operational mechanics of SecureVote ZK.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`
                glass-card rounded-[2rem] overflow-hidden transition-all duration-500 border-2
                ${isOpen ? 'border-indigo-600 shadow-2xl shadow-indigo-500/10' : 'border-transparent hover:border-slate-200'}
              `}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full p-8 flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    <faq.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xl font-bold transition-colors duration-500 ${isOpen ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                    {faq.question}
                  </span>
                </div>
                <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-300'}`}>
                  <ChevronDown className="w-6 h-6" />
                </div>
              </button>
              
              <div 
                className={`
                  overflow-hidden transition-all duration-500 ease-in-out
                  ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                `}
              >
                <div className="px-8 pb-8 pl-[5.5rem]">
                  <div className="h-px bg-slate-100 mb-6"></div>
                  <p className="text-slate-500 leading-relaxed text-lg">
                    {faq.answer}
                  </p>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      Verified Security
                    </div>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      ZK-SNARK Proof
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-12 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden text-center space-y-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <h3 className="text-2xl font-bold relative z-10">Still have questions?</h3>
        <p className="text-slate-400 max-w-xl mx-auto relative z-10">
          Our technical whitepaper details the mathematical proofs behind our zero-knowledge implementation and blockchain consensus.
        </p>
        <div className="pt-4 relative z-10">
          <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20">
            Download Technical Whitepaper
          </button>
        </div>
      </div>

    </div>
  );
};

export default FAQ;
