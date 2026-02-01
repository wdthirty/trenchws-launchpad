import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import PillButton from '@/components/ui/PillButton';

interface TradeFormState {
  isOpen: boolean;
  inputMint: string;
  outputMint: string;
  symbol: string;
  tokenDecimals?: number; // Add token decimals
  launchpad?: string; // Add launchpad information
  icon?: string; // Add token icon
}

interface TradeFormContextType {
  tradeForm: TradeFormState;
  openTradeForm: (inputMint: string, outputMint: string, symbol: string, tokenDecimals?: number, launchpad?: string, icon?: string) => void;
  closeTradeForm: () => void;
  showWalletError: boolean;
  setShowWalletError: (show: boolean) => void;
}

const TradeFormContext = createContext<TradeFormContextType | undefined>(undefined);

export const useTradeForm = () => {
  const context = useContext(TradeFormContext);
  if (context === undefined) {
    throw new Error('useTradeForm must be used within a TradeFormProvider');
  }
  return context;
};

interface TradeFormProviderProps {
  children: ReactNode;
}

export const TradeFormProvider: React.FC<TradeFormProviderProps> = ({ children }) => {
  const [tradeForm, setTradeForm] = useState<TradeFormState>({
    isOpen: false,
    inputMint: '',
    outputMint: '',
    symbol: '',
  });
  const [showWalletError, setShowWalletError] = useState(false);
  const router = useRouter();

  const openTradeForm = (inputMint: string, outputMint: string, symbol: string, tokenDecimals?: number, launchpad?: string, icon?: string) => {
    setTradeForm({
      isOpen: true,
      inputMint,
      outputMint,
      symbol,
      tokenDecimals,
      launchpad,
      icon,
    });
  };

  const closeTradeForm = () => {
    setTradeForm(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleLogin = () => {
    setShowWalletError(false);
    router.push('/login');
  };

  const handleCloseWalletError = () => {
    setShowWalletError(false);
    // Don't close the main trade form modal when closing wallet error
  };

  return (
    <TradeFormContext.Provider value={{ 
      tradeForm, 
      openTradeForm, 
      closeTradeForm, 
      showWalletError, 
      setShowWalletError 
    }}>
      {children}
      
      {/* Wallet Connection Error Dialog */}
      <AnimatePresence>
        {showWalletError && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-[#0B0F13]/50 backdrop-blur-sm z-[55]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseWalletError}
            />
            
            {/* Dialog */}
            <motion.div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="bg-[#0B0F13] rounded-xl border border-slate-600/50 shadow-2xl w-full max-w-md pointer-events-auto"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                exit={{ y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                  <h3 className="text-lg font-semibold text-white">
                    Login Required
                  </h3>
                  <button
                    onClick={handleCloseWalletError}
                    className="text-slate-400 hover:text-white transition-colors duration-200 p-1 rounded hover:bg-slate-700/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  <div className="text-slate-300">
                    <p>You need to log in to trade.</p>
                    <p className="text-sm text-slate-600 mt-2">
                      Please log in with your X account to continue trading.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4">
                  <PillButton
                    theme="green"
                    size="lg"
                    onClick={handleLogin}
                    className="w-full"
                  >
                    Log in
                  </PillButton>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TradeFormContext.Provider>
  );
};
