"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SendFlowData } from './SendFlow';
import { useUser } from '@/contexts/UserProvider';
import { SendClient } from '@/lib/sendClient';
import { useSolPrice } from '@/contexts/SolPriceProvider';
import { toast } from 'sonner';
import { TokenLogo } from '@/components/TokenLogo';
import { useTokenInfo } from '@/hooks/queries';
import { formatLargeNumber } from '@/lib/format/number';

interface SendScreenProps {
  data: SendFlowData;
  onSend: (data: SendFlowData) => void;
  onClose: () => void;
  onBack: () => void;
}

export const SendScreen: React.FC<SendScreenProps> = ({ data, onSend, onClose, onBack }) => {
  const [recipient, setRecipient] = useState(data.recipient);
  const [amount, setAmount] = useState(data.amount);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [usdValue, setUsdValue] = useState(data.usdValue);
  const [networkFee, setNetworkFee] = useState<string>('$0.000005');
  const { walletBalance, publicKey } = useUser();
  const { solPrice } = useSolPrice();
  const availableBalance = walletBalance ?? 0;
  
  // Get token data if a token is selected
  const { data: tokenData } = useTokenInfo(undefined, data.selectedToken?.coinAddress);

  // Initialize SendClient with RPC URL
  const sendClient = new SendClient(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');

  // Update USD value when amount changes
  const updateUSDValue = useCallback(() => {
    const numValue = parseFloat(amount) || 0;
    if (numValue > 0) {
      if (data.isSOL && solPrice) {
        const usdValue = numValue * solPrice;
        setUsdValue(`~$${usdValue.toFixed(2)}`);
      } else if (data.selectedToken && data.selectedToken.usdValue) {
        // Calculate USD value based on token price and amount
        const tokenPrice = data.selectedToken.usdValue / data.selectedToken.balance;
        const usdValue = numValue * tokenPrice;
        setUsdValue(`~$${usdValue.toFixed(2)}`);
      } else {
        setUsdValue('~$0.00');
      }
    } else {
      setUsdValue('~$0.00');
    }
  }, [amount, solPrice, data.isSOL, data.selectedToken]);

  // Update USD value when amount or SOL price changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUSDValue();
    }, 500); // Debounce USD calculation

    return () => clearTimeout(timeoutId);
  }, [updateUSDValue]);

  // Fetch network fee from API
  useEffect(() => {
    const fetchNetworkFee = async () => {
      try {
        const response = await fetch('/api/swap/fees');
        if (response.ok) {
          const fees = await response.json();
          // Calculate fee in SOL (priority fee + base fee)
          const priorityFeeLamports = fees.priorityMicroLamports / 1000; // Convert micro-lamports to lamports
          const baseFeeLamports = 5000; // Standard base fee in lamports
          const totalFeeLamports = priorityFeeLamports + baseFeeLamports;
          const totalFeeSOL = totalFeeLamports / 1000000000; // Convert lamports to SOL
          const calculatedFee = `$${totalFeeSOL.toFixed(6)}`;
          setNetworkFee(calculatedFee);
        } else {
          console.warn('Failed to fetch fees, response not ok:', response.status);
          setNetworkFee('$0.000005');
        }
      } catch (error) {
        console.warn('Failed to fetch network fee, using fallback:', error);
        setNetworkFee('$0.000005');
      }
    };

    fetchNetworkFee();
  }, []);

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleMaxClick = () => {
    if (data.isSOL) {
      // SOL rent for new account (0.00203928 SOL) + transaction fee (0.000005 SOL)
      const rentAndFees = 0.00203928 + 0.000005;
      const maxAmount = Math.max(0, availableBalance - rentAndFees);
      setAmount(maxAmount.toFixed(9)); // Show 9 decimal places for precision
    } else if (data.selectedToken) {
      // For tokens, send the full balance
      setAmount(data.selectedToken.balance.toString());
    }
  };

  const handleNext = async () => {
    if (!recipient.trim() || !amount.trim() || parseFloat(amount) <= 0) {
      toast.error('Please fill in all fields correctly');
      return;
    }

    // Check address format only when user clicks Next
    if (!SendClient.validateAddress(recipient.trim())) {
      toast.error('Invalid Solana address');
      return;
    }

    if (!publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    // Run full validation when user clicks Next
    setIsValidating(true);
    setValidationError(null);

    try {
      let validation;
      
      if (data.isSOL) {
        // Validate SOL transfer
        validation = await sendClient.validateSOLTransaction(
          publicKey,
          recipient.trim(),
          numAmount
        );
      } else if (data.selectedToken) {
        // Validate token transfer
        validation = await sendClient.validateTokenTransaction(
          publicKey,
          recipient.trim(),
          data.selectedToken.coinAddress,
          numAmount
        );
      } else {
        setValidationError('No token selected for transfer');
        toast.error('No token selected for transfer');
        return;
      }

      if (!validation.isValid) {
        setValidationError(validation.error || 'Validation failed');
        toast.error(validation.error || 'Validation failed');
        return;
      }

      // If validation passes, proceed to next step
      onSend({
        recipient: recipient.trim(),
        amount,
        usdValue,
        networkFee,
        selectedToken: data.selectedToken,
        isSOL: data.isSOL,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed. Please try again.';
      setValidationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };



  return (
    <motion.div
      className="p-4 flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-6" /> {/* Spacer */}
        <h1 className="text-xl font-semibold text-white">
          Send {data.isSOL ? 'SOL' : data.selectedToken?.coinSymbol || 'Token'}
        </h1>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Token Icon - Centered between header and form */}
      <div className="flex justify-center mt-6">
        <div className="w-24 h-24 flex items-center justify-center relative">
          {data.isSOL ? (
            <img src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" alt="Solana" className="w-16 h-16" />
          ) : (
            <>
              <TokenLogo
                src={tokenData?.baseAsset?.icon}
                alt={data.selectedToken?.coinSymbol || 'Token'}
                size="xl"
                className="rounded-md"
              />
            </>
          )}
        </div>
      </div>

      {/* Centered Form Content */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Recipient Address Input */}
        <div className="mb-4">
          <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg h-12 transition-all duration-200 bg-transparent border border-emerald-500/30 hover:border-emerald-400/50">
            {/* Label positioned within border at top left */}
            <div className="absolute bg-[#0B0F13] top-[-6px] left-1 px-1 text-[8px] uppercase tracking-wide font-medium rounded-tl-lg text-emerald-300">
              Recipient
            </div>
            <input
              type="text"
              placeholder="Enter Solana address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              spellCheck="false"
              className="flex-1 bg-transparent text-emerald-400 text-sm font-medium focus:outline-none focus:ring-0 focus:border-none border-none transition-all duration-200 placeholder:text-emerald-400/50"
              style={{ outline: 'none', boxShadow: 'none' }}
            />
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg h-12 transition-all duration-200 bg-transparent border border-emerald-500/30 hover:border-emerald-400/50">
            {/* Label positioned within border at top left */}
            <div className="absolute bg-[#0B0F13] top-[-6px] left-1 px-1 text-[8px] uppercase tracking-wide font-medium rounded-tl-lg text-emerald-300">
              Amount
            </div>
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 bg-transparent text-emerald-400 text-sm font-medium focus:outline-none focus:ring-0 focus:border-none border-none transition-all duration-200 placeholder:text-emerald-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              step="0.000000001"
              min="0"
              style={{ outline: 'none', boxShadow: 'none' }}
            />
            <span className="text-emerald-400 text-sm">
              {data.isSOL ? 'SOL' : data.selectedToken?.coinSymbol || 'Token'}
            </span>
            <button
              onClick={handleMaxClick}
              className="px-3 py-1.5 bg-emerald-900/20 text-emerald-400 text-xs rounded-full hover:bg-emerald-900/30 transition-colors border border-emerald-500/30 font-medium"
            >
              Max
            </button>
          </div>
          {validationError && amount.trim() && (
            <div className="text-red-400 text-xs mt-1">{validationError}</div>
          )}
        </div>

        {/* USD Value and Available Balance */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center text-slate-400">
            <span>{usdValue}</span>
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <span className="text-slate-400">
            Available {data.isSOL ? 
              `${availableBalance.toFixed(6)} SOL` : 
              data.selectedToken ? 
                `${data.selectedToken.balance < 0.001 ? 
                  data.selectedToken.balance.toFixed(6) : 
                  data.selectedToken.balance < 1 ? 
                    data.selectedToken.balance.toFixed(3) : 
                    formatLargeNumber(data.selectedToken.balance)
                } ${data.selectedToken.coinSymbol}` : 
                '0 Token'
            }
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onBack}
          className="w-full py-2.5 bg-[#0B0F13]/50 text-white border-slate-600/30 hover:bg-white/[7%] hover:border-white/50 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="w-full py-2.5 bg-transparent text-emerald-400 border-emerald-500/30 hover:text-emerald-300 hover:border-emerald-400/50 bg-emerald-900/20 hover:bg-emerald-900/30 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
};
