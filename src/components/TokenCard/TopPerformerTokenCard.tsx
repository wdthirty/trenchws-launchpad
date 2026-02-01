import React, { memo, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { Pool, TokenListTimeframe } from '../Explore/types';

import { TokenLogo } from '@/components/TokenLogo';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TokenCardVolumeMetric, TokenCardMcapMetric, TokenCardAgeMetric } from './TokenCardMetric';
import { TokenAddress } from '../TokenAddress';

type TopPerformerTokenCardProps = {
  pool: Pool;
  timeframe: TokenListTimeframe;
  rowRef: (element: HTMLElement | null, poolId: string) => void;
  index?: number;
};

export const TopPerformerTokenCard: React.FC<TopPerformerTokenCardProps> = memo(({ 
  pool, 
  timeframe: _timeframe, 
  rowRef, 
  index = 0 
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const handleClick = useCallback(() => {
    router.push(`/coin/${pool.baseAsset.id}`);
  }, [router, pool]);

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
      className={cn(
        "relative flex items-center cursor-pointer px-2 sm:px-3 text-xs h-[100px] w-full bg-[#161B22] shadow transition-colors duration-200 select-none rounded-xl",
        index === 0 && "border-2 border-transparent shimmer-border"
      )}
    >
      {/* Left Column: Token Icon (full height) */}
      <div className="flex items-center justify-center mr-3 relative">
        <TokenLogo
          src={pool.baseAsset.icon}
          alt={pool.baseAsset.symbol}
          size="xl"
          className="rounded-md self-center"
          isLaunchpadToken={pool.baseAsset.launchpad === 'launchpad.fun'}
          isTopPerformer={true}
          bondingCurve={pool.bondingCurve}
          showBondingCurve={true}
        />
      </div>

      {/* Center Column: Content (two rows) */}
      <div className="flex flex-col min-w-0 w-full gap-2">
        {/* Row 1: Metrics */}
        <div className="flex items-center justify-between w-full pr-2">
          <span className={cn(
            'font-medium text-primary border border-primary rounded-full flex-shrink-0 whitespace-nowrap text-[14px] font-semibold px-2 py-1',
          )}>
            {pool.baseAsset.symbol}
          </span>
          <TokenCardMcapMetric mcap={pool.baseAsset.mcap} />
        </div>
        {/* Row 2: Name */}
        <div className="flex items-center justify-between w-full font-bold text-base md:text-sm leading-none tracking-tight truncate min-w-0">
          {pool.baseAsset.name}
        </div>
        <TokenAddress address={pool.baseAsset.id} />
      </div>
    </motion.div>
  );
});

TopPerformerTokenCard.displayName = 'TopPerformerTokenCard';
