"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface ResultScreenProps {
  result: {
    success: boolean;
    message: string;
    transactionId?: string;
  };
  onRetry: () => void;
  onClose: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ result, onRetry, onClose }) => {
  return (
    <motion.div
      className="p-6 flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Centered Content */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-4">
        {/* Status Icon */}
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
            result.success 
              ? 'bg-emerald-500/20 border-emerald-500/30' 
              : 'bg-red-500/20 border-red-500/30'
          }`}>
            {result.success ? (
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center space-y-2">
          <div className="text-xl font-semibold text-white">
            {result.success ? 'Transaction Complete' : 'Unable to send'}
          </div>
          <div className="text-slate-400 text-sm px-4">
            {result.message}
          </div>
          {!result.success && (
            <div className="text-slate-400 text-sm">
              Insufficient funds for rent
            </div>
          )}
        </div>

        {/* View Transaction Link */}
        {result.transactionId && (
          <div className="text-center">
            <a 
              href={`https://solscan.io/tx/${result.transactionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
            >
              View transaction
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#0B0F13]/50 text-white border-slate-600/30 hover:bg-white/[7%] hover:border-white/50 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
        >
          Close
        </button>
        {!result.success && (
          <button
            onClick={onRetry}
            className="w-full py-3 px-6 bg-primary text-black hover:bg-primary/90 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border border-primary text-sm"
          >
            Retry
          </button>
        )}
      </div>
    </motion.div>
  );
};
