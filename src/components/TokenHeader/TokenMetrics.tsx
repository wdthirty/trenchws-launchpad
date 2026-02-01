import { memo } from 'react';
import { MetricHolders, MetricMcap, MetricVolume, MetricPriceChange24h, MetricTop10Holders, MetricTokenAge, MetricCategory, MetricTotalRaised } from './TokenMetric/TokenMetric';
import { cn } from '@/lib/utils';

type TokenMetricsProps = {
  className?: string;
  tId?: string;
  totalRaised?: string;
  taggedUser?: { username: string; profileImageUrl?: string; twitterUrl?: string };
  creator?: { username: string; profileImageUrl?: string; twitterUrl?: string };
  isLaunchpadToken?: boolean;
};

export const TokenMetrics: React.FC<TokenMetricsProps> = memo(({ className, tId, totalRaised, taggedUser, creator, isLaunchpadToken = false }) => {
  return (
    <div className={cn('w-full flex flex-col gap-4 text-[10px] px-2 pt-3', className)}>
      {/* Market Cap */}
      <div className="flex-shrink-0">
        <MetricMcap tId={tId} />
      </div>
      
      {/* Volume */}
      <div className="flex-shrink-0">
        <MetricVolume tId={tId} />
      </div>
      
      {/* Price Change (24h) */}
      <div className="flex-shrink-0">
        <MetricPriceChange24h tId={tId} />
      </div>
      
      {/* Buy/Sell Ratio */}
      {/* <div className="flex-shrink-0">
        <MetricBuySellRatio tId={tId} />
      </div> */}
      
      {/* Traders */}
      {/* <div className="flex-shrink-0">
        <MetricTraders tId={tId} />
      </div> */}
      
      {/* Net Buyers */}
      {/* <div className="flex-shrink-0">
        <MetricNetBuyers tId={tId} />
      </div> */}
      
      {/* Holders */}
      <div className="flex-shrink-0">
        <MetricHolders tId={tId} />
      </div>
      
      {/* Token Age */}
      <div className="flex-shrink-0">
        <MetricTokenAge tId={tId} />
      </div>
      
      {/* Organic Score */}
      {/* <div className="flex-shrink-0">
        <MetricOrganicScore tId={tId} />
      </div> */}
      
      {/* Top 10 Holders */}
      <div className="flex-shrink-0">
        <MetricTop10Holders tId={tId} />
      </div>
      
      {/* Category - Show for launchpad tokens */}
      {isLaunchpadToken && (
        <div className="flex-shrink-0">
          <MetricCategory tId={tId} />
        </div>
      )}
      
      {/* Total Raised - Show for launchpad tokens */}
      {isLaunchpadToken && (
        <div className="flex-shrink-0">
          <MetricTotalRaised tId={tId} totalRaised={totalRaised} taggedUser={taggedUser} creator={creator} />
        </div>
      )}
    </div>
  );
});

TokenMetrics.displayName = 'TokenMetrics';
