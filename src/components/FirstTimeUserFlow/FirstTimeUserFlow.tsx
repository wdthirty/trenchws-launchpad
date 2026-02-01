"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Step1PrivateKeyModal } from './Step1PrivateKeyModal';
import { Step2SecurityModal } from './Step2SecurityModal';
import { Step3ReceiveModal } from './Step3ReceiveModal';

export type FirstTimeUserFlowStep = 'step1' | 'step2' | 'step3';

interface FirstTimeUserFlowProps {
  walletAddress: string;
  onClose: () => void;
}

export const FirstTimeUserFlow: React.FC<FirstTimeUserFlowProps> = ({ 
  walletAddress, 
  onClose 
}) => {
  const [currentStep, setCurrentStep] = useState<FirstTimeUserFlowStep>('step1');

  const handleStep1Complete = () => {
    setCurrentStep('step2');
  };

  const handleStep2Complete = () => {
    setCurrentStep('step3');
  };

  const handleStep3Complete = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent closing on backdrop click during onboarding
    e.preventDefault();
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
          {currentStep === 'step1' && (
            <Step1PrivateKeyModal
              key="step1"
              onComplete={handleStep1Complete}
            />
          )}
          
          {currentStep === 'step2' && (
            <Step2SecurityModal
              key="step2"
              onComplete={handleStep2Complete}
            />
          )}

          {currentStep === 'step3' && (
            <Step3ReceiveModal
              key="step3"
              walletAddress={walletAddress}
              onComplete={handleStep3Complete}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
