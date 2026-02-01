import React, { useMemo } from 'react';
import { HoverPopover } from '../ui/HoverPopover';
import { Pool } from '../Explore/types';
import { cn } from '@/lib/utils';
import { isAuditDevHoldingsPass, isAuditTopHoldersPass } from '../Explore/pool-utils';
import { getNumberColorCn } from '../ui/ReadableNumber';
import { ReadableNumber } from '../ui/ReadableNumber';
import { formatReadablePercentChange } from '@/lib/format/number';
import CrownIcon from '@/icons/CrownIcon';
import UserIcon from '@/icons/UserIcon';
import ChefIcon from '@/icons/ChefIcon';
import CurveIcon from '@/icons/CurveIcon';
import { CompactMetric } from '../TokenHeader/TokenMetric/TokenMetric';
import { appThemes } from '../TokenHeader/themes';

type MetricProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  tooltip: string;
  className?: string;
};

export const Metric: React.FC<MetricProps> = ({ label, children, tooltip, className }) => {
  if (tooltip) {
    return (
      <HoverPopover content={tooltip} asChild>
        <button className={cn('z-[1] flex items-center gap-1 text-dim', className)}>
          {label}
          {children}
        </button>
      </HoverPopover>
    )
  }
  return (
    <button className={cn('z-[1] flex items-center gap-1 text-dim', className)}>
      {label}
      {children}
    </button>
  )
};

type TokenCardTopHoldersMetricProps = {
  audit: Pool['baseAsset']['audit'];
};

export const TokenCardTopHoldersMetric: React.FC<TokenCardTopHoldersMetricProps> = ({ audit }) => {
  const topHoldersPercentage = audit?.topHoldersPercentage;
  const isPass = isAuditTopHoldersPass(audit);

  const value =
    topHoldersPercentage !== undefined ? topHoldersPercentage / 100 : undefined;

  const gradientClass =
    value === undefined
      ? 'text-slight'
      : isPass
        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]'
        : 'bg-gradient-to-r from-rose-500 to-red-700 text-transparent bg-clip-text drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]';

  return (
    <Metric
      className="gap-1 dashed px-1.5 py-1"
      label={<div className="mr-px text-slight"><CrownIcon width={12} height={12} /></div>}
      tooltip="top_10_holders"
    >
      <span className={cn('font-medium', gradientClass)}>
        {formatReadablePercentChange(value, {
          hideSign: 'positive',
          decimals: 0,
        })}
      </span>
    </Metric>
  );
};


type TokenCardNetVolumeMetricProps = {
  buyVolume?: number;
  sellVolume?: number;
};

export const TokenCardNetVolumeMetric: React.FC<TokenCardNetVolumeMetricProps> = ({
  buyVolume,
  sellVolume,
}) => {
  const netVolume = (buyVolume ?? 0) - (sellVolume ?? 0);

  return (
    <Metric label={<MetricIcon label="NV" />} tooltip="Net Volume">
      <ReadableNumber
        className={cn('opacity-80', getNumberColorCn(netVolume))}
        format="compact"
        num={netVolume !== 0 ? Math.abs(netVolume) : undefined}
        prefix="$"
      />
    </Metric>
  );
};

type TokenCardNetBuyersMetricProps = {
  numNetBuyers?: number;
  numTraders?: number;
};

export const TokenCardNetBuyersMetric: React.FC<TokenCardNetBuyersMetricProps> = ({
  numNetBuyers,
  numTraders,
}) => {
  const isNetBuyersDominant =
    numNetBuyers && numTraders ? numNetBuyers / numTraders >= 0.5 : undefined;

  return (
    <Metric label={<MetricIcon label="NB" />} tooltip="Net Buyers">
      <ReadableNumber
        className={cn(
          'opacity-80',
          getNumberColorCn(isNetBuyersDominant === undefined ? undefined : isNetBuyersDominant ? 1 : -1)
        )}
        format="compact"
        num={numNetBuyers}
        integer
        color
      />
    </Metric>
  );
};

type TokenCardHoldersMetricProps = {
  holderCount?: number;
};

export const TokenCardHoldersMetric: React.FC<TokenCardHoldersMetricProps> = ({ holderCount }) => (
  <Metric className="gap-1 dashed px-1.5 py-1" label={<UserIcon/>} tooltip="holders">
    <ReadableNumber format="compact" className="text-slight" num={holderCount} integer />
  </Metric>
);

type TokenCardDevHoldingMetricProps = {
  audit: Pool['baseAsset']['audit'];
};

export const TokenCardDevHoldingMetric: React.FC<TokenCardDevHoldingMetricProps> = ({ audit }) => {
  const devHoldingPercentage = audit?.devBalancePercentage;
  const isPass = isAuditDevHoldingsPass(audit);

  const gradientClass =
    devHoldingPercentage === undefined
      ? 'text-slight'
      : isPass
        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]'
        : 'bg-gradient-to-r from-rose-500 to-red-700 text-transparent bg-clip-text drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]';

  return (
    <Metric
      className="gap-1 dashed px-1.5 py-1"
      label={<div className="mr-px text-slight"><ChefIcon width={12} height={12} /></div>}
      tooltip="dev_holding"
    >
      <span className={cn('font-medium', gradientClass)}>
        {formatReadablePercentChange(
          devHoldingPercentage === undefined ? undefined : devHoldingPercentage / 100,
          { hideSign: 'positive', decimals: 0 }
        )}
      </span>
    </Metric>
  );
};


type TokenCardDevMigrationsMetricProps = {
  migrations?: number;
};

export const TokenCardDevMigrationsMetric: React.FC<TokenCardDevMigrationsMetricProps> = ({ migrations }) => (
  <Metric className="gap-1 dashed px-1.5 py-1 text-dim" label={<CurveIcon width={12} height={12}/>} tooltip="dev_migrations">
    <ReadableNumber format="compact" num={migrations} integer />
  </Metric>
);

type TokenCardVolumeMetricProps = {
  buyVolume?: number;
  sellVolume?: number;
};

export const TokenCardVolumeMetric: React.FC<TokenCardVolumeMetricProps> = ({
  buyVolume,
  sellVolume,
}) => {
  const volume = (buyVolume ?? 0) + (sellVolume ?? 0);
  const gradientClass = volume === 0
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-transparent bg-clip-text';

  return (
    <CompactMetric
      label="Vol"
      labelClassName="text-xs md:text-[10px]"
      value={
        <ReadableNumber 
          className={cn('font-semibold bg-clip-text text-transparent text-sm md:text-xs', gradientClass)}
          num={ volume || undefined }
          prefix='$'
        />
      }
      smallTitle={true}
    />
  );
};

type TokenCardMcapMetricProps = {
  mcap?: number;
  header?: boolean;
};

export const TokenCardMcapMetric: React.FC<TokenCardMcapMetricProps> = ({ mcap, header }) => {
  const gradientClass = mcap === undefined
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 text-transparent bg-clip-text';

  return (
    <CompactMetric 
      label="MC"
      labelClassName="text-xs md:text-[10px]"
      value={
        <ReadableNumber
          format="compact"
          className={cn(gradientClass, 'text-sm md:text-xs')}
          num={mcap || undefined}
          prefix="$"
        />
      }
      smallTitle={true}
    />
  );
};


type TokenCardLiquidityMetricProps = {
  liquidity?: number;
};

export const TokenCardLiquidityMetric: React.FC<TokenCardLiquidityMetricProps> = ({
  liquidity,
}) => (
  <Metric label="L" tooltip="Liquidity">
    <ReadableNumber
      format="compact"
      className="font-medium text-slight"
      num={liquidity || undefined}
      prefix="$"
    />
  </Metric>
);

type TokenCardAgeMetricProps = {
  createdAt?: string;
};

export const TokenCardAgeMetric: React.FC<TokenCardAgeMetricProps> = ({ createdAt }) => {
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  React.useEffect(() => {
    if (!createdAt) return;

    const createdDate = new Date(createdAt);
    const ageInMs = currentTime - createdDate.getTime();
    const ageInSeconds = Math.floor(ageInMs / 1000);
    const ageInMinutes = Math.floor(ageInMs / (1000 * 60));
    const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

    let interval: NodeJS.Timeout;

    if (ageInMinutes < 1) {
      // Update every second for tokens less than 1 minute old
      interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    } else if (ageInHours < 1) {
      // Update every minute for tokens less than 1 hour old
      interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    } else if (ageInDays < 1) {
      // Update every hour for tokens less than 1 day old
      interval = setInterval(() => setCurrentTime(Date.now()), 3600000);
    } else {
      // Update every day for tokens 1 day or older
      interval = setInterval(() => setCurrentTime(Date.now()), 86400000);
    }

    return () => clearInterval(interval);
  }, [createdAt, currentTime]);

  const getTokenAge = () => {
    if (!createdAt) return undefined;
    
    const createdDate = new Date(createdAt);
    const ageInMs = currentTime - createdDate.getTime();
    const ageInSeconds = Math.floor(ageInMs / 1000);
    const ageInMinutes = Math.floor(ageInMs / (1000 * 60));
    const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    
    if (ageInMinutes < 1) return `${ageInSeconds}s`;
    if (ageInHours < 1) return `${ageInMinutes}m`;
    if (ageInDays < 1) return `${ageInHours}h`;
    return `${ageInDays}d`;
  };

  const tokenAge = getTokenAge();
  const gradientClass = tokenAge === undefined
    ? 'text-slate-400'
    : 'bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 text-transparent bg-clip-text text-xs sm:text-[10px]';

  return (
    <CompactMetric
      label="Age"
      labelClassName="text-xs md:text-[10px]"
      className='opacity-90'
      value={
        <span className={cn('font-semibold', gradientClass)}>
          {tokenAge || '--'}
        </span>
      }
      smallTitle={true}
    />
  );
};

// Utility for label icons
const MetricIcon: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-neutral-800 text-[8px] font-semibold leading-none text-neutral-500">
    {label}
  </div>
);
