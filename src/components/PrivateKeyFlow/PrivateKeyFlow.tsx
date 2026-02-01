"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WarningScreen } from './WarningScreen';
import { PrivateKeyScreen } from './PrivateKeyScreen';
import {useSolanaWallets} from '@privy-io/react-auth/solana';

export type PrivateKeyFlowStep = 'warning' | 'privateKey';

interface PrivateKeyFlowProps {
  privateKey: string;
  onClose: () => void;
}

export const PrivateKeyFlow: React.FC<PrivateKeyFlowProps> = ({ privateKey, onClose }) => {
  const [currentStep, setCurrentStep] = useState<PrivateKeyFlowStep>('warning');

  const handleContinue = () => {
    setCurrentStep('privateKey');
  };

  const handleBack = () => {
    if (currentStep === 'privateKey') {
      setCurrentStep('warning');
    } else {
      onClose();
    }
  };

  const handleDone = () => {
    onClose();
  };

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
        <AnimatePresence mode="wait">
          {currentStep === 'warning' && (
            <WarningScreen
              key="warning"
              onContinue={handleContinue}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 'privateKey' && (
            <PrivateKeyScreen
              key="privateKey"
              privateKey={privateKey}
              onBack={handleBack}
              onDone={handleDone}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
