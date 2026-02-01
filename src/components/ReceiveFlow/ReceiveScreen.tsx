"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface ReceiveScreenProps {
  walletAddress: string;
  onClose: () => void;
}

export const ReceiveScreen: React.FC<ReceiveScreenProps> = ({ walletAddress, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy address');
    }
  };



  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-6" /> {/* Spacer */}
        <h1 className="text-xl font-semibold text-white">Receive SOL</h1>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Solana Icon */}
      <div className="flex justify-center mb-1">
        <div className="w-16 h-16 flex items-center justify-center">
          <img src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" alt="Solana" className="w-10 h-10" />
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-8">
        <div className="w-40 h-40 bg-white rounded-lg p-2 flex items-center justify-center border border-slate-600/20">
          <QRCodeSVG 
            value={walletAddress}
            size={150}
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Address Information */}
      <div className="mb-4">
        <div className="text-slate-400 text-sm mb-2">Your Solana Address</div>
        
        {/* Address Box */}
        <div className="bg-slate-600/10 rounded-lg p-3 flex items-center justify-center border border-slate-600/20 mb-3">
          <div className="text-slate-300 text-xs break-all font-mono leading-tight text-center">
            {walletAddress}
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

      {/* Disclaimer */}
      <div className="text-center mb-6">
        <div className="text-slate-400 text-xs">
          This address can only be used to receive Solana & SPL tokens.
        </div>
      </div>

      {/* Close Button */}
      <div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-transparent text-emerald-400 border-emerald-500/30 hover:text-emerald-300 hover:border-emerald-400/50 bg-emerald-900/20 hover:bg-emerald-900/30 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
};
