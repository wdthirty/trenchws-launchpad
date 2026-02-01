"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface Step2SecurityModalProps {
  onComplete: () => void;
}

export const Step2SecurityModal: React.FC<Step2SecurityModalProps> = ({ 
  onComplete 
}) => {
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
        <h1 className="text-xl font-semibold text-white mb-4">Step 2: Keep It Secure</h1>
        <div className="w-6" /> {/* Spacer */}
      </div>

      {/* Security Tips */}
      <div className="space-y-4 mb-6">
        <h3 className="text-white font-semibold mb-4">Save your private key securely:</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-slate-300 text-sm">
              Write it down on paper and store in a safe place
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-slate-300 text-sm">
              Save it in a password manager
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-slate-300 text-sm">
              Never share it with anyone
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-slate-300 text-sm">
              Don't store it on your computer or phone
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-slate-300 text-sm">
              Don't take screenshots or photos
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-slate-300 text-sm">
              <span className="font-semibold text-blue-400">Export Anytime:</span> You can export your private key at any time while logged in by visiting your profile page and clicking "Export Private Key".
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="text-slate-300 text-sm">
              <span className="font-semibold text-red-400">Important Notice:</span> launchpad.fun cannot recover your private key or funds if you lose access to your Twitter/X account. Keep your private key safe and secure.
            </div>
          </div>
        </div>
      </div>

      {/* Next Step Button */}
      <div className="mt-auto pt-4">
        <button
          onClick={onComplete}
          className="w-full py-2.5 bg-transparent text-emerald-400 border-emerald-500/30 hover:text-emerald-300 hover:border-emerald-400/50 bg-emerald-900/20 hover:bg-emerald-900/30 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
        >
          <span className="font-bold">Next Step</span>
        </button>
      </div>
    </motion.div>
  );
};
