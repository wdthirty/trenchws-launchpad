"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface PrivateKeyScreenProps {
  privateKey: string;
  onBack: () => void;
  onDone: () => void;
}

export const PrivateKeyScreen: React.FC<PrivateKeyScreenProps> = ({ 
  privateKey, 
  onBack, 
  onDone 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(privateKey);
      setCopied(true);
      toast.success('Private key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy private key');
    }
  };

  // Format private key into chunks for better display
  const formatPrivateKey = (key: string) => {
    const chunks = [];
    for (let i = 0; i < key.length; i += 28) {
      chunks.push(key.slice(i, i + 28));
    }
    return chunks;
  };

  const keyChunks = formatPrivateKey(privateKey);

  return (
    <motion.div
      className="p-6 flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-6" /> {/* Spacer */}
        <h1 className="text-xl font-semibold text-white">Your Private Key</h1>
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Warning Section */}
      <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 space-y-2 mb-6">
        <div className="text-red-400 font-semibold">
          Do <span className="underline">not</span> share your Private Key!
        </div>
        <div className="text-red-400 text-sm">
          If someone has your Private Key they will have full control of your wallet.
        </div>
      </div>

      {/* Private Key Display */}
      <div className="space-y-4 mb-6">
        <div className="rounded-xl border border-slate-600/40 bg-[#0B0F13]/70 p-4">
          <div className="text-slate-200 text-sm font-mono break-all leading-relaxed">
            {keyChunks.map((chunk, index) => (
              <div key={index} className="mb-1">
                {chunk}
              </div>
            ))}
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="w-full bg-[#0B0F13]/50 text-white border-slate-600/30 hover:bg-white/[7%] hover:border-white/50 rounded-full py-2.5 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Done Button */}
      <div className="mt-auto pt-8">
        <button
          onClick={onDone}
          className="w-full py-2.5 bg-primary text-black hover:bg-primary/90 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border border-primary text-sm"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
};
