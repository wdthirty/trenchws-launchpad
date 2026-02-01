"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePrivy, useSolanaWallets, WalletWithMetadata } from '@privy-io/react-auth';

interface Step1PrivateKeyModalProps {
  onComplete: () => void;
}

export const Step1PrivateKeyModal: React.FC<Step1PrivateKeyModalProps> = ({ 
  onComplete 
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [hasExportedKey, setHasExportedKey] = useState(false);
  
  const { ready, authenticated, user } = usePrivy();
  const { exportWallet } = useSolanaWallets();
  
  // Check that your user is authenticated
  const isAuthenticated = ready && authenticated;
  // Check that your user has an embedded wallet
  const hasEmbeddedWallet = !!user?.linkedAccounts.find(
    (account): account is WalletWithMetadata =>
      account.type === 'wallet' &&
      account.walletClientType === 'privy' &&
      account.chainType === 'solana'
  );

  const handleContinue = () => {
    if (!hasExportedKey) {
      // Trigger Privy export wallet
      exportWallet();
      setHasExportedKey(true);
    } else {
      // Proceed to next step
      onComplete();
    }
  };

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
        <h1 className="text-xl font-semibold text-white">Save Your Private Key</h1>
        <div className="w-6" /> {/* Spacer */}
      </div>



      {/* Warning Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 flex items-center justify-center">
          <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Heading */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Your Private Key is Sacred</h2>
      </div>

      {/* Warning Points */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div className="text-slate-300 text-sm">
            Your private key is like a password for your account.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-slate-300 text-sm">
            If someone gets it, they can drain your wallet. There's no way to recover lost funds.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
            </svg>
          </div>
          <div className="text-slate-300 text-sm">
            Never share it with anyone—no person, website, or app.
          </div>
        </div>
      </div>

      {/* Acknowledgment Checkbox */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <input
            type="checkbox"
            id="acknowledge"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="sr-only"
          />
          <div 
            className={`w-4 h-4 border rounded cursor-pointer flex items-center justify-center transition-all duration-200 ${
              acknowledged 
                ? 'bg-emerald-400 border-emerald-400' 
                : 'bg-[#0B0F13] border-slate-600/30'
            }`}
            onClick={() => setAcknowledged(!acknowledged)}
          >
            {acknowledged && (
              <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <label 
          htmlFor="acknowledge" 
          className="text-slate-300 text-sm cursor-pointer"
          onClick={() => setAcknowledged(!acknowledged)}
        >
          I understand that sharing my private key could result in <strong>permanent loss of funds</strong>.
        </label>
      </div>

      {/* Continue Button */}
      <div className="mt-auto pt-8">
        <button 
          onClick={handleContinue}
          disabled={!acknowledged || !isAuthenticated || !hasEmbeddedWallet}
          className={`w-full py-2.5 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm ${
            acknowledged && isAuthenticated && hasEmbeddedWallet
              ? 'bg-transparent text-emerald-400 border-emerald-500/30 hover:text-emerald-300 hover:border-emerald-400/50 bg-emerald-900/20 hover:bg-emerald-900/30' 
              : 'bg-[#0B0F13]/50 text-slate-400 cursor-not-allowed border-slate-600/30'
          }`}
        >
          {!hasExportedKey ? (
            <>
              See my <span className="font-bold">PRIVATE KEY</span> with <span className="font-bold">Privy</span>
            </>
          ) : (
            <>
              <span className="font-bold">{"I've Copied it, Continue"}</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
