import { memo } from 'react';
import { MetricHolders, MetricMcap, MetricVolume, MetricPriceChange24h, MetricTop10Holders, MetricTokenAge, CompactMetric } from './TokenMetric/TokenMetric';
import { cn } from '@/lib/utils';
import { formatLargeNumber } from '@/lib/format/number';

// Function to get category color (extracted from TokenCategory component)
const getCategoryColor = (cat: string) => {
  switch (cat.toLowerCase()) {
    case 'meme':
      return 'text-pink-400';
    case 'art':
      return 'text-purple-400';
    case 'tech':
      return 'text-blue-400';
    case 'fundraiser':
      return 'text-green-400';
    case 'utility':
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
};

type TokenMetricsMobileProps = {
  className?: string;
  tId?: string;
  creatorInfo?: any;
  categoryData?: string | null;
};

export const TokenMetricsMobile: React.FC<TokenMetricsMobileProps> = memo(({ className, tId, creatorInfo, categoryData }) => { // Base 4 + conditional Price Change + conditional Raised + conditional Category + conditional Top10Holders
  // Convert SOL to USD for raised amount (same logic as desktop)
  const { useSolToUsd } = require('@/lib/utils/solToUsd');
  const solAmount = creatorInfo?.totalRaised ? parseFloat(creatorInfo.totalRaised) : 0;
  const { formattedUsd } = useSolToUsd(solAmount);
  
  // Format USD value for display
  const formatUsdValue = (usdString: string) => {
    if (!usdString || usdString === 'Loading...' || usdString === 'Price unavailable' || usdString === 'NaN') {
      return usdString;
    }
    const numericValue = parseFloat(usdString.replace(/[$,]/g, ''));
    if (isNaN(numericValue)) return usdString;
    return `$${formatLargeNumber(numericValue)}`;
  };
  
  const formattedRaisedValue = formatUsdValue(formattedUsd);
  
  // Use category from creatorInfo if available, otherwise use categoryData
  const finalCategory = creatorInfo?.category || categoryData;

  return (
    <div className={cn('w-full flex gap-2 justify-between text-[10px]', className)}>
      {/* Market Cap */}
      <div className="flex justify-center">
        <MetricMcap tId={tId} showTooltip={false} />
      </div>

      {/* Volume */}
      <div className="flex justify-center">
        <MetricVolume tId={tId} showTooltip={false} />
      </div>

      {/* Price Change (24h) - Only show if category and total raised are not both present */}
      {(!finalCategory || !creatorInfo?.totalRaised) && (
        <div className="flex justify-center">
          <MetricPriceChange24h tId={tId} showTooltip={false} />
        </div>
      )}

      {/* Holders */}
      <div className="flex justify-center">
        <MetricHolders tId={tId} showTooltip={false} />
      </div>

      <div className="flex justify-center">
        <MetricTokenAge tId={tId} showTooltip={false} />
      </div>

      {!finalCategory && (
        <div className="flex justify-center">
          <MetricTop10Holders tId={tId} showTooltip={false} />
        </div>
      )}

      {finalCategory && (
        <div className="flex justify-center">
          <CompactMetric
            label="CATEGORY"
            value={finalCategory}
            valueClassName={`${getCategoryColor(finalCategory)} !truncate-none`}
          />
        </div>
      )}

      {creatorInfo?.totalRaised && parseFloat(creatorInfo.totalRaised) > 0 && !isNaN(parseFloat(creatorInfo.totalRaised)) && formattedRaisedValue && (
        <div className="flex justify-center">
          <CompactMetric
            label={creatorInfo?.taggedUser ? "RAISED" : "FEES"}
            value={formattedRaisedValue}
            valueClassName="text-green-400"
          />
        </div>
      )}

      {/* DEX Paid Status */}
      {creatorInfo?.isDexPaid && (
        <div className="flex justify-center">
          <CompactMetric
            label="DEX"
            value="PAID"
            valueClassName="text-purple-400"
          />
        </div>
      )}
    </div>
  );
});

TokenMetricsMobile.displayName = 'TokenMetricsMobile';
