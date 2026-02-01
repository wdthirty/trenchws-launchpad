"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ReceiveScreen } from './ReceiveScreen';

interface ReceiveFlowProps {
  walletAddress: string;
  onClose: () => void;
}

export const ReceiveFlow: React.FC<ReceiveFlowProps> = ({ walletAddress, onClose }) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#0B0F13]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <motion.div 
        className="w-full max-w-md bg-[#0B0F13] rounded-2xl border border-slate-600/30 overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ReceiveScreen 
          walletAddress={walletAddress}
          onClose={onClose}
        />
      </motion.div>
    </div>
  );
};
