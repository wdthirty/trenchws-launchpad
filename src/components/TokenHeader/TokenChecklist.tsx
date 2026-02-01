import { useTokenInfo } from '@/hooks/queries';
import {
  AUDIT_TOP_HOLDERS_THRESHOLD,
  isAuditTopHoldersPass,
} from '../Explore/pool-utils';
import React from 'react';
import { cn } from '@/lib/utils';
import {
  HoverPopover,
  HoverPopoverContent,
  HoverPopoverTrigger,
} from '../ui/HoverPopover';
import { formatReadablePercentChange } from '@/lib/format/number';
import { StandardMetric } from './TokenMetric/TokenMetric';

type ChecklistProps = {
  className?: string;
  tId?: string;
};

export const Checklist: React.FC<ChecklistProps> = ({ className, tId }) => {
  return (
    <div className={cn('', className)}>
      <ChecklistTopHolders tId={tId} />
    </div>
  );
};

type ChecklistTopHoldersProps = {
  tId?: string;
};

const ChecklistTopHolders: React.FC<ChecklistTopHoldersProps> = ({ tId }) => {
  const { data: audit } = useTokenInfo((data) => data?.baseAsset.audit, tId);

  const value =
    audit?.topHoldersPercentage !== undefined
      ? audit.topHoldersPercentage / 100
      : undefined;

  const passed = audit && isAuditTopHoldersPass(audit);

  const gradientClass =
    value === undefined
      ? 'text-slate-400'
      : passed
      ? 'bg-gradient-to-r from-green-400 via-emerald to-green-400 text-transparent bg-clip-text drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]'
      : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-transparent bg-clip-text drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]';

  return (
    <HoverPopover root>
      <HoverPopoverTrigger>
        <StandardMetric
          label="Top 10 Holders"
          value={
            <div className={cn('inline-flex items-center text-sm font-semibold', gradientClass)}>
              {formatReadablePercentChange(value, { hideSign: 'positive' })}
            </div>
          }
        />
      </HoverPopoverTrigger>
      <HoverPopoverContent>
        <AuditTooltipInfo
          approved={passed}
          label="top_10_holders < 20%"
          description={`% owned by top 10 holders. checkmark if top 10 holders own less than ${AUDIT_TOP_HOLDERS_THRESHOLD.toFixed(0)}%`}
        />
      </HoverPopoverContent>
    </HoverPopover>
  );
};


export const AuditTooltipInfo: React.FC<{
  approved?: boolean;
  label: string;
  description: string;
}> = ({ approved, label, description }) => {
  return (
    <div
      className={cn('group space-y-1 text-slight', {
        'opacity-40': !approved,
      })}
    >
      <div className="flex items-center gap-x-1.5">
        <div
          className={cn('flex size-4 items-center justify-center', {
            'text-emerald': approved,
            'text-rose': !approved,
          })}
        >
          <span className="iconify text-emerald ph--check-bold" />
        </div>
        <div className="mt-0.5 whitespace-pre text-left text-xs font-medium leading-3">
          {label}
        </div>
      </div>
      <p className="text-xs text-dim">{description}</p>
    </div>
  );
};
