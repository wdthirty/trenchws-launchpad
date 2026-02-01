"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendScreen } from './SendScreen';
import { ConfirmScreen } from './ConfirmScreen';
import { SendingScreen } from './SendingScreen';
import { ResultScreen } from './ResultScreen';
import { SendClient, SendTransactionResult } from '@/lib/sendClient';
import { useUser } from '@/contexts/UserProvider';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { toast } from 'sonner';
import { TokenSelectionModal } from './TokenSelectionModal';
import { useSolPrice } from '@/contexts/SolPriceProvider';

export type SendFlowData = {
  recipient: string;
  amount: string;
  usdValue: string;
  networkFee: string;
  selectedToken?: {
    coinName: string;
    coinSymbol: string;
    coinAddress: string;
    balance: number;
    mcap?: number;
    usdValue?: number;
    decimals?: number;
  };
  isSOL?: boolean;
};

export type SendFlowStep = 'select-token' | 'send' | 'confirm' | 'sending' | 'result';

interface SendFlowProps {
  onClose: () => void;
  initialData?: Partial<SendFlowData>;
  heldCoins?: Array<{ 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    balance: number;
    mcap?: number;
    usdValue?: number;
  }>;
}

export const SendFlow: React.FC<SendFlowProps> = ({ onClose, initialData, heldCoins = [] }) => {
  const [currentStep, setCurrentStep] = useState<SendFlowStep>('select-token');
  const [flowData, setFlowData] = useState<SendFlowData>({
    recipient: initialData?.recipient || '',
    amount: initialData?.amount || '',
    usdValue: initialData?.usdValue || '~$0.00',
    networkFee: initialData?.networkFee || '$0.000005',
    selectedToken: initialData?.selectedToken,
    isSOL: initialData?.isSOL ?? true,
  });
  const { walletBalance } = useUser();
  const { solPrice } = useSolPrice();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    transactionId?: string;
  } | null>(null);

  const { publicKey } = useUser();
  const { wallets } = useSolanaWallets();
  const sendClient = new SendClient(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');

  const updateFlowData = (data: Partial<SendFlowData>) => {
    setFlowData(prev => ({ ...prev, ...data }));
  };

  const handleSelectSOL = () => {
    setFlowData(prev => ({ 
      ...prev, 
      selectedToken: undefined, 
      isSOL: true,
      amount: '',
      usdValue: '~$0.00'
    }));
    setCurrentStep('send');
  };

  const handleSelectToken = (token: { 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    balance: number;
    mcap?: number;
    usdValue?: number;
  }) => {
    setFlowData(prev => ({ 
      ...prev, 
      selectedToken: token, 
      isSOL: false,
      amount: '',
      usdValue: '~$0.00'
    }));
    setCurrentStep('send');
  };

  const handleSend = (data: SendFlowData) => {
    updateFlowData(data);
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    if (!publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    if (!wallets || wallets.length === 0) {
      toast.error('No Solana wallets available');
      return;
    }

    setCurrentStep('sending');
    
    try {
      const wallet = wallets[0];
      
      // Create wallet signer using direct wallet signing
      const walletSigner = {
        publicKey,
        signTransaction: async (transaction: any) => {
          // Use the wallet's signTransaction method directly
          const signedTransaction = await wallet.signTransaction(transaction);
          
          // Ensure we return a Transaction (not VersionedTransaction)
          if ('version' in signedTransaction) {
            throw new Error('Expected legacy Transaction but got VersionedTransaction');
          }
          
          return signedTransaction;
        }
      };

      let transactionResult: SendTransactionResult;
      
      if (flowData.isSOL) {
        // Execute SOL transfer
        transactionResult = await sendClient.sendSOL(
          walletSigner,
          flowData.recipient,
          parseFloat(flowData.amount)
        );
      } else if (flowData.selectedToken) {
        // Execute token transfer
        transactionResult = await sendClient.sendToken(
          walletSigner,
          flowData.recipient,
          flowData.selectedToken.coinAddress,
          parseFloat(flowData.amount),
          flowData.selectedToken.decimals || 6
        );
      } else {
        throw new Error('No token selected for transfer');
      }
      
      setResult({
        success: transactionResult.success,
        message: transactionResult.message,
        transactionId: transactionResult.transactionId,
      });
      
      setCurrentStep('result');
    } catch (error) {
      console.error('Transaction error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Transaction failed. Please try again.',
      });
      setCurrentStep('result');
    }
  };

  const handleRetry = () => {
    setResult(null);
    setCurrentStep('send');
  };

  const handleClose = () => {
    if (currentStep === 'sending') return; // Prevent closing during sending
    onClose();
  };

  const handleBackToTokenSelection = () => {
    setCurrentStep('select-token');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#0B0F13]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <motion.div 
        className="w-full max-w-md h-[500px] bg-[#0B0F13] rounded-2xl border border-slate-600/30 overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <AnimatePresence mode="wait">
          {currentStep === 'select-token' && (
            <TokenSelectionModal
              key="select-token"
              heldCoins={heldCoins}
              onSelectToken={handleSelectToken}
              onSelectSOL={handleSelectSOL}
              onClose={handleClose}
              solBalance={walletBalance || 0}
              solPrice={solPrice || 0}
            />
          )}
          
          {currentStep === 'send' && (
            <SendScreen
              key="send"
              data={flowData}
              onSend={handleSend}
              onClose={handleClose}
              onBack={handleBackToTokenSelection}
            />
          )}
          
          {currentStep === 'confirm' && (
            <ConfirmScreen
              key="confirm"
              data={flowData}
              onConfirm={handleConfirm}
              onBack={() => setCurrentStep('send')}
            />
          )}
          
          {currentStep === 'sending' && (
            <SendingScreen
              key="sending"
              data={flowData}
            />
          )}
          
          {currentStep === 'result' && result && (
            <ResultScreen
              key="result"
              result={result}
              onRetry={handleRetry}
              onClose={handleClose}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
