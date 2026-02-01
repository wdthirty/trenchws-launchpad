import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { useDataStream } from '@/contexts/DataStreamProvider';
import { Pool } from './types';
import UnifiedTokenList from '@/components/Explore/UnifiedTokenList';
import { useUser } from '@/contexts/UserProvider';
import { toast } from 'sonner';
import { useSwapClient } from '@/hooks/useSwapClient';
import { useSwapFees } from '@/contexts/SwapFeesProvider';
import { formatSignificantFigures } from '@/lib/format/number';
import { QuickBuyCard } from '@/components/QuickBuyCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import ExchangeIcon from '@/icons/ExchangeIcon';

interface NewCoinsGridProps {
  selectedCoin?: string;
  onSwitchToTopPerformers?: () => void;
}

const NewCoinsGrid = ({ selectedCoin, onSwitchToTopPerformers }: NewCoinsGridProps) => {
  const { subscribeRecentTokenList, unsubscribeRecentTokenList } = useDataStream();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const user = useUser();
  const [quickBuyAmount, setQuickBuyAmount] = useState<string>('0.01');
  const [isVisible, setIsVisible] = useState(false);
  const { executeSwap, clearQuoteCache } = useSwapClient();
  const { fees } = useSwapFees();
  const isMobile = useIsMobile();

  useEffect(() => {
    subscribeRecentTokenList();
    // Trigger animation on every mount/reload
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => {
      unsubscribeRecentTokenList();
      clearTimeout(timer);
    };
  }, [subscribeRecentTokenList, unsubscribeRecentTokenList]);

  // Quick buy handler
  const handleQuickBuy = useCallback(async (pool: Pool) => {
    try {
      const uiAmount = parseFloat(quickBuyAmount);
      if (!user?.publicKey || !fees) {
        toast.error('This feature is only available to logged in users');
        return;
      }
      if (!uiAmount || uiAmount <= 0) {
        toast.error('Enter a valid SOL amount');
        return;
      }

      // Minimum transaction amount validation
      const MIN_SOL_AMOUNT = 0.001; // 0.001 SOL minimum
      if (uiAmount < MIN_SOL_AMOUNT) {
        toast.error(`Minimum buy amount is ${MIN_SOL_AMOUNT} SOL`);
        return;
      }

      // Balance validation
      const userBalance = user.walletBalance ?? 0;
      
      // Check if user has any balance at all
      if (userBalance <= 0) {
        toast.error('Insufficient balance - Please fund your wallet');
        return;
      }
      
      // Calculate estimated network fee (tip + priority fee in SOL)
      const tipFee = (fees.tipLamports || 0) / 1e9; // Convert lamports to SOL
      const priorityFee = (fees.priorityMicroLamports || 0) / 1e9; // Convert micro-lamports to SOL
      const estimatedNetworkFee = tipFee + priorityFee + 0.000005; // Add base transaction fee
      
      const totalRequired = uiAmount + estimatedNetworkFee;
      
      if (userBalance < totalRequired) {
        toast.error(`Insufficient balance. Balance: ${userBalance.toFixed(4)} SOL`);
        return;
      }

      const jupiterAmount = Math.round(uiAmount * 10 ** 9);
      toast('sending transaction...', { icon: '⏳' });

      // Execute swap using new swap client
      const result = await executeSwap(
        'So11111111111111111111111111111111111111112', // SOL mint
        pool.baseAsset.id, // Token mint
        jupiterAmount.toString(),
        50, // 0.5% slippage
        fees,
        false,
        pool.baseAsset.symbol // tokenSymbol
      );

      if (result.success) {
        // Show immediate success toast
        const tokenAmount = parseFloat(result.tokenAmount || '0') / Math.pow(10, 6); // Assuming 6 decimals for tokens
        const formattedAmount = formatSignificantFigures(tokenAmount);
        
        toast.success(
          <div>
            Bought {formattedAmount} {result.tokenSymbol || pool.baseAsset.symbol}
          </div>
        );
        
        // Clear quote cache
        clearQuoteCache();
        
        // Schedule balance refresh after a few seconds to account for blockchain delay
        setTimeout(async () => {
          try {
            await user.refreshBalances();
          } catch (error) {
            console.error('❌ Balance refresh failed (quick buy):', error);
          }
        }, 3000); // 3 seconds delay
        
        // Handle confirmation in background
        if (result.confirmationPromise) {
          result.confirmationPromise.then((confirmed) => {
            if (!confirmed) {
              toast.error('Swap failed, try again');
            } else {
              // Refresh balances again after confirmation
              setTimeout(async () => {
                try {
                  await user.refreshBalances();
                } catch (error) {
                  console.error('❌ Post-confirmation balance refresh failed (quick buy):', error);
                }
              }, 2000); // 2 seconds after confirmation
            }
          });
        }
      } else {
        toast.error('swap failed.');
      }
    } catch (e) {
      console.error('quick buy error:', e);
      
      // Check for rent exemption error
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage === 'INSUFFICIENT_RENT_EXEMPTION') {
        toast.error('Insufficient SOL balance. You need more SOL for token account creation.');
      } else {
        toast.error('Transaction failed');
      }
    }
  }, [quickBuyAmount, user, fees, executeSwap]);

  // Animation props - state-controlled for reload animations
  const animationProps = {
    initial: { opacity: 0, y: 20 },
    animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { 
      delay: 0.1,
      duration: 0.6,
      ease: "easeOut" as const
    }
  };

  return (
    <div className="flex flex-col w-full md:flex-1 h-full min-h-0 rounded-tr-xl">
      <div className="flex flex-row bg-[#0B0F13] backdrop-blur-sm pt-2 pb-2 pl-2 justify-between items-center">
        <motion.div
          {...animationProps}
          className="flex w-full gap-2 pr-2 items-end justify-between"
        >
          {isMobile && onSwitchToTopPerformers ? (
            <button
              onClick={onSwitchToTopPerformers}
              className="flex flex-col gap-1 text-left rounded-lg px-1 py-2 -m-2 transition-all duration-200 group"
              title="Switch to Top Launchpad Coins"
            >
              <div className="flex items-center gap-2">
                <div className="text-md font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-purple-400 to-purple-500">
                  New Launchpad Coins
                </div>
                <ExchangeIcon className="text-slate-400 text-sm group-hover:scale-110 transition-transform duration-200" width={14} height={14} />
              </div>
              <div className="text-slate-300 text-sm sm:text-xs">
                Explore the latest new coins
              </div>
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="text-md font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-purple-400 to-purple-500">
                  New Launchpad Coins
                </div>
              </div>
              <div className="text-slate-300 text-sm sm:text-xs">
                Explore the latest new coins
              </div>
            </div>
          )}

          <QuickBuyCard
            amount={quickBuyAmount}
            onAmountChange={setQuickBuyAmount}
          />
        </motion.div>
      </div>
      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="w-full flex-1 overflow-y-auto no-scrollbar min-h-0 rounded-lg">
        <UnifiedTokenList
          selectedCoin={selectedCoin}
          activeTab="new-coins"
          onQuickBuy={handleQuickBuy}
        />
      </div>
    </div>
  )
};

export default NewCoinsGrid;
