"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SendFlowData } from './SendFlow';

interface ConfirmScreenProps {
  data: SendFlowData;
  onConfirm: () => void;
  onBack: () => void;
}

export const ConfirmScreen: React.FC<ConfirmScreenProps> = ({ data, onConfirm, onBack }) => {

  return (
    <motion.div
      className="p-6 flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-white">Confirm Send</h1>
        <div className="w-6" /> {/* Spacer */}
      </div>

      {/* Centered Content */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-4">
        {/* Send Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-emerald-400">
            {data.amount} {data.isSOL ? 'SOL' : data.selectedToken?.coinSymbol || 'Token'}
          </div>
          <div className="text-slate-400 text-sm">{data.usdValue}</div>
        </div>

        {/* Transaction Details */}
        <div className="w-full bg-slate-600/10 rounded-lg p-3 space-y-2 border border-slate-600/20">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">To:</span>
            <span className="text-white text-sm">{data.recipient.slice(0, 4)}...{data.recipient.slice(-4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Network fee:</span>
            <span className="text-white text-sm">{data.networkFee}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto pt-8">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="w-full py-2.5 bg-[#0B0F13]/50 text-white border-slate-600/30 hover:bg-white/[7%] hover:border-white/50 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-2.5 bg-transparent text-emerald-400 border-emerald-500/30 hover:text-emerald-300 hover:border-emerald-400/50 bg-emerald-900/20 hover:bg-emerald-900/30 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </motion.div>
  );
};
