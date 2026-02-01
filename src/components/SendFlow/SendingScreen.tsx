"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { SendFlowData } from './SendFlow';

interface SendingScreenProps {
  data: SendFlowData;
}

export const SendingScreen: React.FC<SendingScreenProps> = ({ data }) => {
  return (
    <motion.div
      className="p-6 flex flex-col h-full justify-center items-center space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Loading Indicator */}
      <div className="flex justify-center">
        <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-2">
        <div className="text-xl font-semibold text-white">Sending...</div>
        <div className="text-slate-400 text-sm">
          {data.amount} {data.isSOL ? 'SOL' : data.selectedToken?.coinSymbol || 'Token'} to
        </div>
        <div className="text-slate-400 text-sm">
          {data.recipient.slice(0, 4)}...{data.recipient.slice(-4)}
        </div>
      </div>
    </motion.div>
  );
};
