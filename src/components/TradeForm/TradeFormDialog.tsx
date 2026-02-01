"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTradeForm } from '@/contexts/TradeFormProvider';
import { useUser } from '@/contexts/UserProvider';
import { usePrivy } from '@privy-io/react-auth';
import { formatSignificantFigures, formatBalance } from '@/lib/format/number';
import { useSwapClient } from '@/hooks/useSwapClient';
import { useSwapFees } from '@/contexts/SwapFeesProvider';

interface JupiterQuote {
  inAmount: string;
  outAmount: string;
  priceImpact: number;
  inUsdValue: number;
  outUsdValue: number;
}

export const TradeFormDialog = () => {
  const { tradeForm, closeTradeForm, showWalletError, setShowWalletError } = useTradeForm();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('0');
  const [tokenDecimals, setTokenDecimals] = useState<number>(6); // Default to 6, will be calculated dynamically
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const balanceRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const user = useUser();
  const { authenticated } = usePrivy();
  const { executeSwap, getQuote, clearQuoteCache } = useSwapClient();
  const { fees } = useSwapFees();

  // Debug logging for modal state
  useEffect(() => {
  }, [tradeForm.isOpen, authenticated, showWalletError, user?.publicKey, tradeForm.symbol]);

  // Debounced quote fetching using new swap client
  const fetchQuote = useCallback(async (uiAmount: number) => {
    if (!user?.publicKey || !uiAmount || uiAmount <= 0) {
      setQuote(null);
      return;
    }

    setIsLoadingQuote(true);
    try {
      // Convert UI amount to Jupiter format using dynamic decimals
      const jupiterAmount = mode === 'sell' 
        ? Math.round(uiAmount * 10 ** tokenDecimals) // Use calculated token decimals
        : Math.round(uiAmount * 10 ** 9); // SOL decimals

      // Determine input/output mints based on mode
      // For buy: inputMint = SOL, outputMint = TOKEN
      // For sell: inputMint = TOKEN, outputMint = SOL
      const inputMint = mode === 'buy' ? "So11111111111111111111111111111111111111112" : tradeForm.outputMint;
      const outputMint = mode === 'buy' ? tradeForm.outputMint : "So11111111111111111111111111111111111111112";

      const quoteData = await getQuote(inputMint, outputMint, jupiterAmount.toString(), 50);
      
      // Check if quote has error
      if (quoteData.error) {
        setQuoteError(quoteData.error);
        setQuote(null);
        return;
      }
      
      setQuoteError(null);
      setQuote({
        inAmount: quoteData.inAmount,
        outAmount: quoteData.outAmount,
        priceImpact: quoteData.priceImpactPct,
        inUsdValue: 0, // Will be calculated if needed
        outUsdValue: 0, // Will be calculated if needed
      });
    } catch (error) {
      console.error('Error fetching quote:', error);
      setQuoteError('Failed to get quote');
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [user?.publicKey, mode, tradeForm.outputMint, tokenDecimals, getQuote]);

  // Debounced quote fetching
  useEffect(() => {
    const uiAmount = parseFloat(amount);
    if (isNaN(uiAmount) || uiAmount <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchQuote(uiAmount);
    }, 500); // 0.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [amount, fetchQuote]);

  const fetchBalances = useCallback(async () => {
    if (!user?.publicKey || isRefreshingBalances) return;
    
    setIsRefreshingBalances(true);
    try {
      // Use centralized balance fetching
      await user.refreshBalances();
      
      // Set token decimals from trade form if available, otherwise use from balance data
      if (tradeForm.tokenDecimals !== undefined) {
        setTokenDecimals(tradeForm.tokenDecimals);
      } else {
        const tokenBalance = user.getTokenBalance(tradeForm.outputMint);
        if (tokenBalance) {
          setTokenDecimals(tokenBalance.decimals);
        }
      }
    } catch (err) {
      toast.error("error fetching balance");
    } finally {
      setIsRefreshingBalances(false);
    }
  }, [user?.publicKey, user?.refreshBalances, user?.getTokenBalance, tradeForm.tokenDecimals, tradeForm.outputMint, isRefreshingBalances]);

  // Debounced balance refresh function
  const debouncedRefreshBalances = useCallback(() => {
    // Clear any existing timeout
    if (balanceRefreshTimeoutRef.current) {
      clearTimeout(balanceRefreshTimeoutRef.current);
    }
    
    // Set new timeout
    balanceRefreshTimeoutRef.current = setTimeout(() => {
      fetchBalances();
    }, 3000); // 1 second debounce
  }, [fetchBalances]);

  // Helper function to get exact token balance for 100% sells
  const getExactTokenBalance = () => {
    const tokenBalance = user.getTokenBalance(tradeForm.outputMint);
    if (!tokenBalance || tokenBalance.amount === '0') return 0;
    const rawBalance = BigInt(tokenBalance.amount);
    return Number(rawBalance) / Math.pow(10, tokenDecimals); // Use dynamic decimals
  };

  // Reset wallet error when user becomes authenticated
  useEffect(() => {
    if (authenticated && showWalletError) {
      
      setShowWalletError(false);
    }
  }, [authenticated, showWalletError, setShowWalletError]);

  // Clear amount when dialog is opened
  useEffect(() => {
    if (tradeForm.isOpen) {
      setAmount('0');
      setQuoteError(null);
    }
  }, [tradeForm.isOpen]);

  // Simplified authentication check - only show wallet error if modal is open and user is not authenticated
  useEffect(() => {

    
    if (tradeForm.isOpen && !authenticated) {
      
      setShowWalletError(true);
    }
  }, [tradeForm.isOpen, authenticated, setShowWalletError]);

  useEffect(() => {
    if (tradeForm.isOpen && authenticated && user?.publicKey) {
      
      debouncedRefreshBalances();
    }
  }, [user?.publicKey, tradeForm.outputMint, tradeForm.isOpen, authenticated, debouncedRefreshBalances]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && tradeForm.isOpen) {
        event.preventDefault();
        closeTradeForm();
      }
    };

    if (tradeForm.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tradeForm.isOpen, closeTradeForm]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (balanceRefreshTimeoutRef.current) {
        clearTimeout(balanceRefreshTimeoutRef.current);
      }
    };
  }, []);

  const handlePlaceTrade = async () => {
    if (!user?.publicKey || !fees) return;
    const uiAmount = parseFloat(amount);
    if (!uiAmount || uiAmount <= 0) return;

    // Check token balance for the trade
    const balance = displayedBalance ?? 0;
    const exactBalance = mode === 'sell' ? getExactTokenBalance() : balance;
    
    if (uiAmount > exactBalance) {
      toast.error(`amount exceeds balance (${exactBalance.toLocaleString()} ${displayedSymbol})`);
      return;
    }

    // Check SOL balance for fees
    const solBalance = user.walletBalance ?? 0; // Use UserProvider's walletBalance
    
    if (mode === 'buy') {
      // For buys: check if user has trade amount + 0.005 SOL for fees
      const requiredSol = uiAmount + 0.005;
      
      if (solBalance < requiredSol) {
        toast.error(`Insufficient balance. Balance: ${solBalance.toFixed(4)} SOL`);
        return;
      }
    } else {
      // For sells: check if user has at least 0.005 SOL for fees
      if (solBalance < 0.005) {
        toast.error(`Insufficient balance for fees. Required: 0.005 SOL, Balance: ${solBalance.toFixed(4)} SOL`);
        return;
      }
    }

    try {
      // For sells, we need to send the amount in the actual token decimals
      // For buys, we send in SOL decimals (9)
      let jupiterAmount;
      if (mode === 'sell') {
        // For sells, convert UI amount to actual token decimals
        jupiterAmount = Math.round(uiAmount * 10 ** tokenDecimals);
      } else {
        // For buys, convert UI amount to SOL decimals (9)
        jupiterAmount = Math.round(uiAmount * 10 ** 9);
      }

      toast('sending transaction...', { icon: '⏳' });

      // Determine input/output mints based on mode
      const inputMint = mode === 'buy' ? "So11111111111111111111111111111111111111112" : tradeForm.outputMint;
      const outputMint = mode === 'buy' ? tradeForm.outputMint : "So11111111111111111111111111111111111111112";

      // Execute swap using new swap client
      const result = await executeSwap(
        inputMint,
        outputMint,
        jupiterAmount.toString(),
        50, // 0.5% slippage
        fees,
        false,
        tradeForm.symbol // tokenSymbol
      );

      if (result.success) {
        // Show immediate success toast
        const action = mode === 'buy' ? 'Bought' : 'Sold';
        const tokenAmount = parseFloat(result.tokenAmount || '0') / Math.pow(10, tokenDecimals); // Always use tokenDecimals for display
        const formattedAmount = formatSignificantFigures(tokenAmount);
        
        toast.success(
          <div>
            {action} {formattedAmount} {result.tokenSymbol || tradeForm.symbol}
          </div>
        );
        
        // Clear quote cache
        clearQuoteCache();
        
        closeTradeForm();
        
        // Schedule balance refresh after a few seconds to account for blockchain delay
        setTimeout(() => {
          debouncedRefreshBalances();
        }, 3000); // 3 seconds delay
        
        // Handle confirmation in background
        if (result.confirmationPromise) {
          result.confirmationPromise.then((confirmed) => {
            if (!confirmed) {
              toast.error('Swap failed, try again');
            } else {
              // Refresh balances again after confirmation
              setTimeout(() => {
                debouncedRefreshBalances();
              }, 2000); // 2 seconds after confirmation
            }
          });
        }
      } else {
        toast.error('swap failed.');
      }
    } catch (err) {
      console.error('trade error:', err);
      
      // Check for rent exemption error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage === 'INSUFFICIENT_RENT_EXEMPTION') {
        toast.error('Insufficient balance. You need more SOL for token account creation.');
      } else {
        toast.error('Transaction failed');
      }
    }
  };

  // Displayed values
  const displayedBalance = useMemo(() => 
    mode === 'buy' ? user.walletBalance : user.getTokenBalance(tradeForm.outputMint)?.uiAmount ?? 0,
    [mode, user.walletBalance, user.getTokenBalance, tradeForm.outputMint]
  );
  const displayedSymbol = useMemo(() => 
    mode === 'buy' ? 'SOL' : tradeForm.symbol,
    [mode, tradeForm.symbol]
  );

  // Calculate quote display values
  const getQuoteDisplay = () => {
    if (!quote) return null;
    
    const outAmount = parseFloat(quote.outAmount);
    // For "Get:" display, we always want to show the token amount using token decimals
    // When buying: outAmount is token amount, use tokenDecimals
    // When selling: outAmount is SOL amount, use 9 (SOL decimals)
    const decimals = mode === 'buy' ? tokenDecimals : 9;
    const uiOutAmount = outAmount / Math.pow(10, decimals);
    
    return {
              amount: formatSignificantFigures(uiOutAmount, 3), // Up to 3 sig figs for "Get" amount
      symbol: mode === 'buy' ? tradeForm.symbol : 'SOL',
      priceImpact: quote.priceImpact,
      usdValue: quote.outUsdValue
    };
  };

  const quoteDisplay = getQuoteDisplay();

  // Don't render anything if not authenticated - let the provider handle the wallet error dialog
  if (!authenticated) {
    return null;
  }

  // Show loading state while user data is being fetched
  if (!user?.publicKey) {
    return (
      <AnimatePresence>
        {tradeForm.isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-[#0B0F13]/50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeTradeForm}
            />
            
            {/* Dialog */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
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
                <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                  <h3 className="text-lg font-semibold text-white">
                    Trade {tradeForm.symbol}
                  </h3>
                  <button
                    onClick={closeTradeForm}
                    className="text-slate-400 hover:text-white transition-colors duration-200 p-1 rounded hover:bg-slate-700/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Loading Content */}
                <div className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-slate-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xl font-semibold text-white">
                      Loading Wallet
                    </h4>
                    <p className="text-slate-400 text-sm">
                      Please wait while we connect to your wallet...
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Show the actual swap UI when authenticated and user data is loaded
  return (
    <AnimatePresence>
      {tradeForm.isOpen && !showWalletError && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-[#0B0F13]/50 backdrop-blur-sm z-[55]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTradeForm}
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
              className="bg-[#0B0F13] rounded-2xl border border-slate-600/30 shadow-2xl w-full max-w-md pointer-events-auto"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
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
                  <h1 className="text-xl font-semibold text-white">Trade {tradeForm.symbol}</h1>
                  <button
                    onClick={closeTradeForm}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Token Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 flex items-center justify-center border border-white/70 rounded-md overflow-hidden">
                    {tradeForm.icon ? (
                      <img 
                        src={tradeForm.icon} 
                        alt={`${tradeForm.symbol} icon`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to Solana icon if token icon fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = "https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora";
                        }}
                      />
                    ) : (
                      <img 
                        src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
                        alt="Solana" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                </div>

                {/* Buy/Sell Toggle */}
                <div className="flex bg-[#0B0F13]/30 rounded-full p-1 w-fit mx-auto mb-6 border border-slate-600/30">
                  <button
                    className={`flex-1 py-2 px-6 text-sm font-medium rounded-full transition-all duration-200 ${
                      mode === 'buy'
                        ? `bg-emerald-500 text-black shadow-sm font-semibold`
                        : 'bg-transparent text-slate-300 hover:text-white hover:bg-[#161B22]/50'
                      }`}
                    onClick={() => {
                      setMode('buy');
                      setAmount('0');
                      setQuoteError(null);
                    }}
                  >
                    Buy
                  </button>
                  <button
                    className={`flex-1 py-2 px-6 text-sm font-medium rounded-full transition-all duration-200 ${
                      mode === 'sell'
                        ? `bg-red-500 text-black shadow-sm font-semibold`
                        : 'bg-transparent text-slate-300 hover:text-white hover:bg-[#161B22]/50'
                      }`}
                    onClick={() => {
                      setMode('sell');
                      setAmount('0');
                      setQuoteError(null);
                    }}
                  >
                    Sell
                  </button>
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                  <div className={`relative flex items-center gap-2 px-3 py-2 rounded-lg h-12 transition-all duration-200 bg-transparent border hover:border-emerald-400/50 ${
                    mode === 'buy' 
                      ? 'border-emerald-500/30' 
                      : 'border-red-500/30 hover:border-red-400/50'
                  }`}>
                    {/* Label positioned within border at top left */}
                    <div className={`absolute bg-[#0B0F13] top-[-6px] left-1 px-1 text-[8px] uppercase tracking-wide font-medium rounded-tl-lg ${
                      mode === 'buy' ? 'text-emerald-300' : 'text-red-300'
                    }`}>
                      Amount
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          setAmount(v);
                          setQuoteError(null);
                        }
                      }}
                      onFocus={() => amount === '0' && setAmount('')}
                      className={`flex-1 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 focus:border-none border-none transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        mode === 'buy' 
                          ? 'text-emerald-400 placeholder:text-emerald-400/50' 
                          : 'text-red-400 placeholder:text-red-400/50'
                      }`}
                      style={{ outline: 'none', boxShadow: 'none' }}
                    />
                    <span className={`text-sm ${
                      mode === 'buy' ? 'text-emerald-400' : 'text-red-400'
                    }`}>{mode === 'buy' ? 'SOL' : tradeForm.symbol}</span>
                    <button
                      onClick={() => {
                        if (mode === 'buy') {
                          const maxAmount = displayedBalance ?? 0;
                          setAmount(maxAmount.toFixed(9));
                        } else {
                          const exactBalance = getExactTokenBalance();
                          setAmount(exactBalance.toString());
                        }
                      }}
                      className={`px-3 py-1.5 text-xs rounded-full transition-colors border font-medium ${
                        mode === 'buy'
                          ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/30'
                          : 'bg-red-900/20 text-red-400 border-red-500/30 hover:bg-red-900/30'
                      }`}
                    >
                      Max
                    </button>
                  </div>
                  {quoteError && amount.trim() && (
                    <div className="text-red-400 text-xs mt-1">{quoteError}</div>
                  )}
                </div>

                {/* Balance Info */}
                <div className="flex justify-between items-center text-xs mb-6">
                  <div className="flex items-center text-slate-400">
                    <span>Balance: {displayedBalance != null ? formatBalance(displayedBalance, mode === 'buy' ? 9 : tokenDecimals) : '--'} {displayedSymbol}</span>
                  </div>
                  <button 
                    onClick={() => debouncedRefreshBalances()} 
                    className="text-slate-400 hover:text-white transition-colors duration-200 p-1 rounded hover:bg-slate-700/50"
                    title="Refresh balances"
                    disabled={isRefreshingBalances}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                {/* Transaction Preview */}
                {parseFloat(amount) > 0 && (
                  <div className="mb-6 bg-slate-800/30 rounded-lg p-3 border border-slate-600/30">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-white font-medium">
                        {formatSignificantFigures(parseFloat(amount), 6)} {mode === 'buy' ? 'SOL' : tradeForm.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-slate-400">Get:</span>
                      <span className="text-emerald-400 font-medium">
                        {isLoadingQuote ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Loading...
                          </span>
                        ) : quoteDisplay ? (
                          `${quoteDisplay.amount} ${quoteDisplay.symbol}`
                        ) : (
                          ''
                        )}
                      </span>
                    </div>
                    {quoteDisplay && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-slate-500">Price Impact:</span>
                        <span className={`font-medium ${mode === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {mode === 'buy' ? '+' : '-'}{Math.abs(quoteDisplay.priceImpact).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeTradeForm}
                    className="w-full py-2.5 bg-[#0B0F13]/50 text-white border-slate-600/30 hover:bg-white/[7%] hover:border-white/50 rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium border text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePlaceTrade}
                    className={`w-full py-2.5 bg-transparent border rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium text-sm ${
                      mode === 'buy'
                        ? 'text-emerald-400 border-emerald-500/30 hover:text-emerald-300 hover:border-emerald-400/50 bg-emerald-900/20 hover:bg-emerald-900/30'
                        : 'text-red-400 border-red-500/30 hover:text-red-300 hover:border-red-400/50 bg-red-900/20 hover:bg-red-900/30'
                    }`}
                  >
                    {mode === 'buy' ? 'Buy' : 'Sell'} {tradeForm.symbol}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
