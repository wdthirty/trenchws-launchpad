import { cn } from '@/lib/utils';
import { ReadableNumber } from '@/components/ui/ReadableNumber';
import { useTokenAddress, useTokenInfo } from '@/hooks/queries';
import { useTokenCategory } from '@/hooks/useTokenCategory';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { deriveDbcPoolAddress, DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { formatReadablePercentChange, formatLargeNumber } from '@/lib/format/number';
import { AUDIT_TOP_HOLDERS_THRESHOLD, isAuditTopHoldersPass } from '@/components/Explore/pool-utils';
import { Pool } from '@/components/Explore/types';

const NEXT_PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL as string;
const NEXT_PUBLIC_POOL_CONFIG_KEY = process.env.NEXT_PUBLIC_POOL_CONFIG_KEY as string;

type TokenMetricProps = {
  label: string;
  className?: string; // container styles
  textClassName?: string; // styles for number text
  children?: React.ReactNode;
} & React.ComponentProps<typeof ReadableNumber>;

export const TokenMetric: React.FC<TokenMetricProps> = ({
  label,
  className,
  textClassName,
  children,
  ...props
}) => {
  return (
    <div className={className}>
      <div className="truncate text-sm leading-none text-slate-400">{label}</div>
      {children !== undefined ? (
        children
      ) : (
        <ReadableNumber
          className={cn('font-medium tabular-nums text-white', textClassName)}
          format="compact"
          animated
          {...props}
        />
      )}
    </div>
  );
};

// New standardized metric component that emphasizes the value over the label
export const StandardMetric: React.FC<{
  label: string | React.ReactNode;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  smallTitle?: boolean;
}> = ({ label, value, className, labelClassName, valueClassName, smallTitle = false }) => {
  if (smallTitle) {
    return (
      <div className={cn('flex items-center gap-2 min-w-0 bg-transparent', className)}>
        <div className={cn('text-xs text-slate-400 uppercase tracking-wide truncate shrink-0', labelClassName)}>
          {label}
        </div>
        <div className={cn('text-sm font-semibold text-white truncate', valueClassName)}>
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0.5 min-w-0 bg-transparent', className)}>
      <div className={cn('text-xs text-slate-400 uppercase tracking-wide truncate', labelClassName)}>
        {label}
      </div>
      <div className={cn('text-sm font-semibold text-white truncate', valueClassName)}>
        {value}
      </div>
    </div>
  );
};

// Compact version for smaller spaces
export const CompactMetric: React.FC<{
  label: string | React.ReactNode;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  smallTitle?: boolean;
}> = ({ label, value, className, labelClassName, valueClassName, smallTitle = false }) => {
  if (smallTitle) {
    return (
      <div className={cn('flex items-baseline gap-1 min-w-0 bg-transparent', className)}>
        <div className={cn('text-[10px] text-slate-400 uppercase tracking-wide truncate leading-none shrink-0', labelClassName)}>
          {label}
        </div>
        <div className={cn('text-xs font-semibold text-white truncate leading-none', valueClassName)}>
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0 min-w-0 bg-transparent', className)}>
      <div className={cn('text-[10px] text-slate-400 uppercase tracking-wide truncate leading-tight', labelClassName)}>
        {label}
      </div>
      <div className={cn('text-xs font-semibold text-white truncate leading-tight', valueClassName)}>
        {value}
      </div>
    </div>
  );
};

export const MetricPrice: React.FC<{ tId?: string; tokenData?: Pool }> = ({ tId, tokenData }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;

  return (
    <TokenMetric
      className="flex items-center justify-between gap-1"
      label="price"
      num={asset?.usdPrice}
      prefix="$"
    />
  );
};

export const MetricPoolFees: React.FC<{ tId?: string; tokenData?: Pool }> = ({ tId, tokenData }) => {
  const [feeMetric, setFeeMetric] = useState<number | null>(0);

  const tokenId = tId ? tId : useTokenAddress();

  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;

  useEffect(() => {
    if (!tokenId) return;

    const fetchFeeMetrics = async () => {
      try {
        const connection = new Connection(NEXT_PUBLIC_RPC_URL, 'confirmed');
        const client = new DynamicBondingCurveClient(connection, 'confirmed');

        const poolId = deriveDbcPoolAddress(new PublicKey("So11111111111111111111111111111111111111112"), new PublicKey(tokenId), new PublicKey(NEXT_PUBLIC_POOL_CONFIG_KEY));

        if (!poolId) {
          return;
        }

        const pool = await client.state.getPool(poolId);

        const bnValue = new BN(pool.partnerQuoteFee, 16);
        const feesInLamport = bnValue.toNumber();
        setFeeMetric(feesInLamport / LAMPORTS_PER_SOL);

      } catch (error: any) {
        if (error.message?.includes("Pool not found")) {
          // Handle pool not found
        }
      }
    };

    fetchFeeMetrics();
  }, [tId]);

  if (!feeMetric || feeMetric <= 0) {
    return null;
  }

  return (
    <CompactMetric
      label="Pool Fees"
      value={
        <div className="flex flex-col gap-0.5">
          {!asset?.graduatedPool && (
            <span className="text-emerald font-semibold text-xs">
              {feeMetric.toFixed(4)} SOL
            </span>
          )}
          <span className="text-emerald text-[10px]">
            Creator: 1%
          </span>
        </div>
      }
    />
  );
};

export const MetricVolume: React.FC<{ 
  className?: string; 
  tId?: string;
  tokenData?: Pool;
  showTooltip?: boolean;
  smallTitle?: boolean;
}> = ({ className, tId, tokenData, showTooltip = true, smallTitle = false }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const buyVolume = asset?.stats24h?.buyVolume ?? 0;
  const sellVolume = asset?.stats24h?.sellVolume ?? 0;
  const volume = buyVolume + sellVolume;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = volume === 0
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => showTooltip && setIsHovered(true)}
      onMouseLeave={() => showTooltip && setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="VOL"
        value={
          <ReadableNumber
            className={cn('font-semibold tabular-nums', gradientClass)}
            format="compact"
            animated
            num={volume || undefined}
            prefix="$"
          />
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
        smallTitle={smallTitle}
      />
      
      {/* Hover Dialog */}
      {showTooltip && isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-400 mb-1">
                24h Trading Volume
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Total value of all trades in the last 24 hours. Higher volume typically indicates more active trading and liquidity.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricMcap: React.FC<{ 
  className?: string; 
  tId?: string;
  tokenData?: Pool;
  showTooltip?: boolean;
  smallTitle?: boolean;
}> = ({ className, tId, tokenData, showTooltip = true, smallTitle = false }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const mcap = asset?.mcap;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = mcap === undefined
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => showTooltip && setIsHovered(true)}
      onMouseLeave={() => showTooltip && setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="MC"
        value={
          <ReadableNumber
            className={cn('font-semibold tabular-nums', gradientClass)}
            format="compact"
            animated
            num={mcap || undefined}
            prefix="$"
          />
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
        smallTitle={smallTitle}
      />
      
      {/* Hover Dialog */}
      {showTooltip && isHovered && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-emerald-400 mb-1">
                Market Capitalization
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Total value of all tokens in circulation. Calculated by multiplying the current price by the total supply.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricFdv: React.FC<{ className?: string; tId?: string; tokenData?: Pool }> = ({ className, tId, tokenData }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;

  return (
    <TokenMetric
      className={cn('flex items-center justify-between', className)}
      label="FDV"
      num={asset?.fdv}
      prefix="$"
    />
  );
};

export const MetricLiquidity: React.FC<{ className?: string; tId?: string; tokenData?: Pool }> = ({ className, tId, tokenData }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data } = useTokenInfo(undefined, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || data?.baseAsset;

  return (
    <TokenMetric
      className={cn('flex items-center justify-between', className)}
      label="Liquidity"
      num={asset?.liquidity}
      prefix="$"
    />
  );
};

export const MetricHolders: React.FC<{ className?: string; tId?: string; tokenData?: Pool; showTooltip?: boolean }> = ({ className, tId, tokenData, showTooltip = true }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const holders = asset?.holderCount;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = holders === undefined
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => showTooltip && setIsHovered(true)}
      onMouseLeave={() => showTooltip && setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="Holders"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {holders !== undefined ? holders.toLocaleString() : '--'}
          </span>
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
      />
      
      {/* Hover Dialog */}
      {showTooltip && isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-cyan-400 mb-1">
                Coin Distribution
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Total number of unique addresses holding this coin. More holders typically indicates better distribution and community adoption.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricPriceChange24h: React.FC<{ 
  className?: string; 
  tId?: string;
  tokenData?: Pool;
  showTooltip?: boolean;
  smallTitle?: boolean;
}> = ({ className, tId, tokenData, showTooltip = true, smallTitle = false }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const priceChange = asset?.stats24h?.priceChange/100;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = priceChange === undefined
    ? 'text-slate-400'
    : priceChange >= 0
    ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 text-transparent bg-clip-text'
    : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => showTooltip && setIsHovered(true)}
      onMouseLeave={() => showTooltip && setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="24h %"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {formatReadablePercentChange(priceChange)}
          </span>
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
        smallTitle={false}
      />
      
      {/* Hover Dialog */}
      {showTooltip && isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={cn("text-sm font-medium mb-1", priceChange >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                Price Performance
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {priceChange >= 0 
                  ? 'Price has increased over the last 24 hours, indicating positive momentum.'
                  : 'Price has decreased over the last 24 hours, showing downward pressure.'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricBuySellRatio: React.FC<{ 
  className?: string; 
  tId?: string;
  tokenData?: Pool;
  showTooltip?: boolean;
  smallTitle?: boolean;
}> = ({ className, tId, tokenData, showTooltip = true, smallTitle = false }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const buyVolume = asset?.stats24h?.buyVolume ?? 0;
  const sellVolume = asset?.stats24h?.sellVolume ?? 0;
  const buySellRatio = buyVolume > 0 && sellVolume > 0 ? buyVolume / sellVolume : 0;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = buySellRatio === 0
    ? 'text-slate-400'
    : buySellRatio > 1
    ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 text-transparent bg-clip-text'
    : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => showTooltip && setIsHovered(true)}
      onMouseLeave={() => showTooltip && setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="B/S Ratio"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {buySellRatio > 0 ? buySellRatio.toFixed(2) : '--'}
          </span>
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
        smallTitle={false}
      />
      
      {/* Hover Dialog */}
      {showTooltip && isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={cn("text-sm font-medium mb-1", buySellRatio > 1 ? 'text-emerald-400' : 'text-red-400')}>
                Trading Sentiment
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {buySellRatio > 1 
                  ? `Ratio of ${buySellRatio.toFixed(2)} means more buying than selling pressure, indicating bullish sentiment.`
                  : `Ratio of ${buySellRatio.toFixed(2)} means more selling than buying pressure, indicating bearish sentiment.`
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricTraders: React.FC<{ className?: string; tId?: string; tokenData?: Pool }> = ({ className, tId, tokenData }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const traders = asset?.stats24h?.numTraders;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = traders === undefined
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="Traders"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {traders !== undefined ? traders.toLocaleString() : '--'}
          </span>
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
      />
      
      {/* Hover Dialog */}
      {isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-400 mb-1">
                Active Traders
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Number of unique addresses that traded this coin in the last 24 hours. Higher numbers indicate more community engagement.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricNetBuyers: React.FC<{ className?: string; tId?: string; tokenData?: Pool }> = ({ className, tId, tokenData }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const netBuyers = asset?.stats24h?.numNetBuyers;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = netBuyers === undefined
    ? 'text-slate-400'
    : netBuyers > 0
    ? 'bg-gradient-to-r from-green-400 via-emerald to-green-400 text-transparent bg-clip-text'
    : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="Net Buyers"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {netBuyers !== undefined ? (netBuyers > 0 ? '+' : '') + netBuyers.toLocaleString() : '--'}
          </span>
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
      />
      
      {/* Hover Dialog */}
      {isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={cn("text-sm font-medium mb-1", netBuyers > 0 ? 'text-emerald' : 'text-red-400')}>
                Net Trading Activity
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {netBuyers > 0 
                  ? `Net ${netBuyers.toLocaleString()} more buyers than sellers indicates positive sentiment and buying pressure.`
                  : `Net ${Math.abs(netBuyers).toLocaleString()} more sellers than buyers indicates negative sentiment and selling pressure.`
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricOrganicScore: React.FC<{ className?: string; tId?: string; tokenData?: Pool }> = ({ className, tId, tokenData }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const organicScore = asset?.organicScore;
  const [isHovered, setIsHovered] = useState(false);

  const gradientClass = organicScore === undefined
    ? 'text-slate-400'
    : organicScore >= 0.7
    ? 'bg-gradient-to-r from-green-400 via-emerald to-green-400 text-transparent bg-clip-text'
    : organicScore >= 0.4
    ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-transparent bg-clip-text'
    : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="Organic"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {organicScore !== undefined ? (organicScore).toFixed(0) + '%' : '--'}
          </span>
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
      />
      
      {/* Hover Dialog */}
      {isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={cn("text-sm font-medium mb-1", 
                organicScore >= 0.7 ? 'text-emerald' : 
                organicScore >= 0.4 ? 'text-yellow-400' : 'text-red-400'
              )}>
                Organic Growth Rating
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {organicScore >= 0.7 
                  ? 'High organic score indicates genuine community growth and natural token adoption.'
                  : organicScore >= 0.4 
                  ? 'Moderate organic score suggests mixed growth patterns with some artificial activity.'
                  : 'Low organic score may indicate artificial trading activity or manipulation.'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricTokenAge: React.FC<{ 
  className?: string; 
  tId?: string;
  tokenData?: Pool;
  showTooltip?: boolean;
  smallTitle?: boolean;
}> = ({ className, tId, tokenData, showTooltip = true, smallTitle = false }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const [isHovered, setIsHovered] = useState(false);

  // Calculate token age from creation date
  const getTokenAge = () => {
    if (!asset?.firstPool?.createdAt) return undefined;
    
    const createdAt = new Date(asset.firstPool.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return '<1h';
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
    return `${Math.floor(diffDays / 365)}y`;
  };

  const tokenAge = getTokenAge();
  const gradientClass = tokenAge === undefined
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 text-transparent bg-clip-text';

  return (
    <div
      className="relative cursor-default"
      onMouseEnter={() => showTooltip && setIsHovered(true)}
      onMouseLeave={() => showTooltip && setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="Age"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {tokenAge || '--'}
          </span>
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
        smallTitle={smallTitle}
      />
      
      {/* Hover Dialog */}
      {showTooltip && isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-400 mb-1">
                Coin Age
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {asset?.firstPool?.createdAt 
                  ? `Created on ${new Date(asset.firstPool.createdAt).toLocaleDateString()} at ${new Date(asset.firstPool.createdAt).toLocaleTimeString()}`
                  : 'Creation date not available.'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricCategory: React.FC<{ 
  className?: string; 
  tId?: string;
  tokenData?: Pool;
  showTooltip?: boolean;
  smallTitle?: boolean;
}> = ({ className, tId, tokenData, showTooltip = true, smallTitle = false }) => {
  // Get category data using the same hook as TokenHeader
  // Only fetch if tId is provided (launchpad tokens only)
  const { data: categoryData } = useTokenCategory(tId);
  
  // Don't render anything if no tId
  if (!tId) return null;
  
  const category = categoryData;
  const [isHovered, setIsHovered] = useState(false);

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'meme':
        return 'bg-gradient-to-r from-pink-400 via-pink-400 to-pink-500 text-transparent bg-clip-text';
      case 'art':
        return 'bg-gradient-to-r from-purple-400 via-purple-400 to-purple-500 text-transparent bg-clip-text';
      case 'tech':
        return 'bg-gradient-to-r from-blue-400 via-blue-400 to-blue-500 text-transparent bg-clip-text';
      case 'fundraiser':
        return 'bg-gradient-to-r from-green-400 via-green-400 to-green-500 text-transparent bg-clip-text';
      case 'utility':
        return 'bg-gradient-to-r from-orange-400 via-orange-400 to-orange-500 text-transparent bg-clip-text';
      default:
        return 'bg-gradient-to-r from-slate-400 via-slate-400 to-slate-500 text-transparent bg-clip-text';
    }
  };

  const gradientClass = category ? getCategoryColor(category) : 'text-slate-400';

  return (
    <AnimatePresence>
      {category && (
        <motion.div
          key={category}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div
            className="relative cursor-default"
            onMouseEnter={() => showTooltip && setIsHovered(true)}
            onMouseLeave={() => showTooltip && setIsHovered(false)}
          >
            <CompactMetric
              className={className}
              label="Category"
              value={
                <span className={cn(
                  'font-semibold', 
                  gradientClass,
                  category?.toLowerCase() === 'fundraiser' ? 'text-[10px]' : ''
                )}>
                  {category || '--'}
                </span>
              }
              labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
              smallTitle={smallTitle}
            />
          
          {/* Hover Dialog */}
          {showTooltip && isHovered && (
            <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className={cn("text-sm font-medium mb-1", 
                    category ? 
                      category.toLowerCase() === 'meme' ? 'text-pink-400' :
                      category.toLowerCase() === 'art' ? 'text-purple-400' :
                      category.toLowerCase() === 'tech' ? 'text-blue-400' :
                      category.toLowerCase() === 'fundraiser' ? 'text-green-400' :
                      category.toLowerCase() === 'utility' ? 'text-orange-400' :
                      'text-slate-400'
                    : 'text-slate-400'
                  )}>
                    Coin Category
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {category 
                      ? (() => {
                          switch (category.toLowerCase()) {
                            case 'meme':
                              return 'Meme coins are typically created for entertainment and community engagement. They often feature humorous themes and viral marketing campaigns.';
                            case 'art':
                              return 'Art coins represent creative projects, digital art collections, or artistic communities. They focus on creativity and cultural expression.';
                            case 'tech':
                              return 'Tech coins are associated with technology projects, software development, or innovative solutions. They aim to solve real-world problems.';
                            case 'fundraiser':
                              return 'Fundraiser coins are created to raise funds for specific causes, projects, or charitable initiatives. They have clear fundraising goals.';
                            case 'utility':
                              return 'This is a one-of-a-kind utility coin on launchpad.fun, created to be the utility token powering the launchpad.fun ecosystem.';
                            default:
                              return `This coin is categorized as "${category}". Categories help users understand the coin's purpose and market segment.`;
                          }
                        })()
                      : 'No category has been assigned to this coin yet.'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MetricTop10Holders: React.FC<{ className?: string; tId?: string; tokenData?: Pool; showTooltip?: boolean }> = ({ className, tId, tokenData, showTooltip = true }) => {
  // Use passed tokenData if available, otherwise fall back to useTokenInfo
  const { data: baseAsset } = useTokenInfo((data) => data?.baseAsset, tokenData ? undefined : tId);
  const asset = tokenData?.baseAsset || baseAsset;
  
  const audit = asset?.audit;
  const [isHovered, setIsHovered] = useState(false);

  const value =
    audit?.topHoldersPercentage !== undefined
      ? audit.topHoldersPercentage / 100
      : undefined;

  const passed = audit && isAuditTopHoldersPass(audit);

  const gradientClass =
    value === undefined
      ? 'text-slate-400'
      : passed
      ? 'bg-gradient-to-r from-green-400 via-emerald to-green-400 text-transparent bg-clip-text'
      : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-transparent bg-clip-text';

  return (
    <div 
      className="relative cursor-default"
      onMouseEnter={() => showTooltip && setIsHovered(true)}
      onMouseLeave={() => showTooltip && setIsHovered(false)}
    >
      <CompactMetric
        className={className}
        label="Top 10"
        value={
          <span className={cn('font-semibold', gradientClass)}>
            {formatReadablePercentChange(value, { hideSign: 'positive' })}
          </span>  
        }
        labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
      />
      
      {/* Hover Dialog - Show for both passed and failed audits */}
      {showTooltip && isHovered && (
        <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={cn("text-sm font-medium text-white mb-1", passed ? 'text-emerald' : 'text-amber-400')}>
                {passed ? 'Good Holder Distribution' : 'High Holder Concentration'}
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {passed 
                  ? `Top 10 holders own ${value !== undefined ? `${(value * 100).toFixed(2)}%` : '--'} of the total supply, which is below the recommended threshold of ${AUDIT_TOP_HOLDERS_THRESHOLD.toFixed(0)}%. This indicates good decentralization.`
                  : `Top 10 holders own ${value !== undefined ? `${(value * 100).toFixed(2)}%` : '--'} of the total supply, which exceeds the recommended threshold of ${AUDIT_TOP_HOLDERS_THRESHOLD.toFixed(0)}%. This indicates potential centralization risk.`
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MetricTotalRaised: React.FC<{ 
  className?: string; 
  tId?: string; 
  tokenData?: Pool;
  totalRaised?: string;
  taggedUser?: { username: string; profileImageUrl?: string; twitterUrl?: string };
  creator?: { username: string; profileImageUrl?: string; twitterUrl?: string };
  showTooltip?: boolean;
  smallTitle?: boolean;
}> = ({ className, tId, tokenData, totalRaised, taggedUser, creator, showTooltip = true, smallTitle = false }) => {
  const { useSolToUsd } = require('@/lib/utils/solToUsd');
  const [isHovered, setIsHovered] = useState(false);
  const lastValidFormattedUsdRef = useRef<string | null>(null);

  // Always call useSolToUsd, but pass 0 if totalRaised is invalid
  const solAmount = totalRaised ? parseFloat(totalRaised) : 0;
  const { formattedUsd, isLoading: isPriceLoading } = useSolToUsd(solAmount);



  // Keep track of the last valid formatted USD value
  if (formattedUsd && formattedUsd !== 'Loading...' && formattedUsd !== 'Price unavailable') {
    lastValidFormattedUsdRef.current = formattedUsd;
  }
  
  // Use the last valid value during loading, or the current value if available
  const displayValue = isPriceLoading && lastValidFormattedUsdRef.current 
    ? lastValidFormattedUsdRef.current 
    : formattedUsd;

  // Format the USD value using our formatting function for better readability
  const formatUsdValue = (usdString: string) => {
    if (!usdString || usdString === 'Loading...' || usdString === 'Price unavailable' || usdString === 'NaN') {
      return usdString;
    }
    // Extract the number from the USD string (remove $ and commas)
    const numericValue = parseFloat(usdString.replace(/[$,]/g, ''));
    if (isNaN(numericValue)) return usdString;
    
    // Format with K/M/B suffixes
    return `$${formatLargeNumber(numericValue)}`;
  };

  const formattedDisplayValue = formatUsdValue(displayValue);

  // Only show if we have valid totalRaised data
  if (!totalRaised || totalRaised === '0' || totalRaised === '') return null;

  if (isNaN(solAmount) || solAmount <= 0) return null;

  // Only show if we have a valid display value
  if (!displayValue || displayValue === 'Loading...' || displayValue === 'Price unavailable' || displayValue === 'NaN') return null;

  const gradientClass = 'bg-gradient-to-r from-cyan-400 via-cyan-400 to-cyan-500 text-transparent bg-clip-text';

  // Determine label and description based on whether there's a tagged user
  const label = taggedUser ? 'Raised' : 'Fees';
  const description = taggedUser 
    ? `Total amount raised by @${taggedUser.username} for their cause, charity, tech, or innovation.`
    : `Trading fees collected since launch. Can be claimed by ${creator?.username ? `@${creator.username}` : 'the creator of the coin'}.`;

  return (
    <AnimatePresence>
      {displayValue && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div
            className="relative cursor-default"
            onMouseEnter={() => showTooltip && setIsHovered(true)}
            onMouseLeave={() => showTooltip && setIsHovered(false)}
          >
            <CompactMetric
              className={className}
              label={label}
              value={
                <span className={cn('font-semibold', gradientClass)}>
                  {formattedDisplayValue}
                </span>
              }
              labelClassName={isHovered ? 'text-white' : 'text-slate-400'}
              smallTitle={smallTitle}
            />
          
          {/* Hover Dialog */}
          {showTooltip && isHovered && (
            <div className="absolute top-0 left-full ml-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px]">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-cyan-400 mb-1">
                    Trading Fees Collected
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {description}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

