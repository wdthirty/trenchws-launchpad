import React, { memo, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Pool, TokenListTimeframe } from '../Explore/types';

import { TokenLogo } from '@/components/TokenLogo';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TokenCardVolumeMetric, TokenCardMcapMetric, TokenCardAgeMetric } from './TokenCardMetric';
import { TokenNameSymbol } from '../TokenHeader/TokenNameSymbol';
import PillButton from '@/components/ui/PillButton';

type TokenCardProps = {
  pool: Pool;
  timeframe: TokenListTimeframe;
  rowRef: (element: HTMLElement | null, poolId: string) => void;
  index?: number;
  showMiniChart?: boolean;
  onQuickBuy?: (pool: Pool) => void;
  isTopPerformer?: boolean;
};

export const TokenCard: React.FC<TokenCardProps> = memo(({ pool, timeframe: _timeframe, rowRef, index = 0, showMiniChart: _showMiniChart = false, onQuickBuy, isTopPerformer = false }) => {
  const router = useRouter();

  const isMobile = useIsMobile();

  const handleClick = useCallback(() => {
    router.push(`/coin/${pool.baseAsset.id}`);
  }, [router, pool]);

  const handleQuickBuy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickBuy?.(pool);
  }, [onQuickBuy, pool]);

  // Animation props - always enabled for better visibility
  const animationProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      delay: index * 0.1,
      duration: 0.5,
      ease: "easeOut" as const
    }
  };

  return (
    <motion.div
      ref={(el) => rowRef(el, pool.id)}
      {...animationProps}
      data-pool-id={pool.id}
      onClick={handleClick}
      className="relative flex items-center cursor-pointer pl-1 pr-2 sm:px-3 text-xs h-[80px] w-full max-w-full hover:bg-[#161B22] transition-colors duration-200 select-none rounded-xl overflow-hidden"
    >
      {/* Left Column: Token Icon (full height) */}
      <div className="flex items-center justify-center mr-3 relative">
        <TokenLogo
          src={pool.baseAsset.icon}
          alt={pool.baseAsset.symbol}
          size="lg"
          className="rounded-md self-center"
          isLaunchpadToken={pool.baseAsset.launchpad === 'launchpad.fun'}
          isTopPerformer={isTopPerformer}
          bondingCurve={pool.bondingCurve}
          showBondingCurve={true}
        />
      </div>

      {/* Center Column: Content (two rows) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Row 1: Metrics */}
        <div className="flex items-center justify-between mb-2 min-w-0">
          <TokenCardAgeMetric createdAt={pool.baseAsset.firstPool?.createdAt} />
          <div className="flex items-center gap-2 min-w-0">
            <TokenCardVolumeMetric
              buyVolume={pool.baseAsset.stats24h?.buyVolume}
              sellVolume={pool.baseAsset.stats24h?.sellVolume}
            />
            <TokenCardMcapMetric mcap={pool.baseAsset.mcap} />
          </div>
        </div>

        {/* Row 2: Name/Ticker - maximize space usage */}
        <div className="flex items-center min-w-0 gap-1 md:gap-2 flex-1">
          <div className="flex flex-col min-w-0 flex-1">
            <TokenNameSymbol 
              name={pool.baseAsset.name}
              symbol={pool.baseAsset.symbol}
              size="sm"
            />
          </div>

          {/* Right Column: Buy Button */}
          {onQuickBuy && (
            <div className="flex-shrink-0">
              <PillButton
                theme="green"
                size="sm"
                icon="ph--lightning-bold"
                aria-label="Quick Buy"
                onClick={handleQuickBuy}
              >
                Buy
              </PillButton>
            </div>
          )}
        </div>
      </div>
      
      {/* Divider below each card - only show for top performers */}
      {isTopPerformer && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-600/30" />
      )}
    </motion.div>
  );
});

TokenCard.displayName = 'TokenCard';

type TokenCardSkeletonProps = React.ComponentPropsWithoutRef<'div'>;

export const TokenCardSkeleton: React.FC<TokenCardSkeletonProps> = ({ className, ...props }) => (
  <div className={cn('px-2 py-2 text-xs rounded-lg bg-[#0B0F13]/10 mb-2', className)} {...props}>
    <div className="flex items-center">
      {/* Icon shimmer */}
      <div className="relative group shrink-0 pr-2 overflow-visible">
        <div className="w-8 h-8 rounded-sm bg-slate-700/50 animate-pulse" />
      </div>

      {/* Content shimmer */}
      <div className="flex w-full items-center justify-between gap-3 overflow-hidden">
        {/* Token name/symbol skeleton */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="h-3 w-12 bg-slate-700/50 rounded-full animate-pulse mb-1" />
          <div className="h-4 w-16 bg-slate-700/50 rounded animate-pulse" />
        </div>
        
        {/* Metrics skeleton */}
        <div className="flex flex-col items-start justify-between gap-1">
          {/* Age metric */}
          <div className="h-3 w-20 bg-slate-700/50 rounded animate-pulse" />
          
          {/* Volume metric */}
          <div className="h-3 w-24 bg-slate-700/50 rounded animate-pulse" />
          
          {/* Market Cap metric */}
          <div className="h-3 w-20 bg-slate-700/50 rounded animate-pulse" />
        </div>

        {/* Mini chart skeleton */}
        <div className="flex-1 h-[50px] block lg:hidden xl:block">
          <div className="w-full h-full bg-slate-700/30 rounded border border-slate-600/30 animate-pulse" />
        </div>
      </div>
    </div>
    
    {/* Divider below skeleton */}
    <div className="absolute bottom-0 left-2 right-2 h-px bg-slate-600/40" />
  </div>
);

export default TokenCard;

