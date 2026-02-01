import { useTokenInfo } from '@/hooks/queries';
import { formatReadablePercentChange } from '@/lib/format/number';
import { cn } from '@/lib/utils';

type BondingCurveProps = {
  className?: string;
  tId?: string;
};

export const BondingCurve: React.FC<BondingCurveProps> = ({ className, tId }) => {
  const { data: bondingCurve } = useTokenInfo((data) => data?.bondingCurve, tId);

  if (bondingCurve === undefined || bondingCurve >= 100) {
    return null;
  }

  const progressWidth = `${(bondingCurve * 100)}%`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2 text-sm text-slight">
        home run:
        <span className="text-slight">
          {formatReadablePercentChange(bondingCurve / 100, { hideSign: 'positive' })}
        </span>
      </div>

      {/* Container without overflow-hidden so shadow shows */}
      <div className="h-2 w-full rounded-full bg-border relative">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: progressWidth,
            background: 'linear-gradient(to right, #ffdd6cff, #FDE047, #FDE047)',
            boxShadow: '0 0 8px rgba(235, 179, 5, 0.4), 0 0 16px rgba(235, 179, 5, 0.2)',
          }}
        />
      </div>
    </div>
  );
};


export const MobileBondingCurve: React.FC<BondingCurveProps> = ({ className, tId }) => {
  const { data: bondingCurve } = useTokenInfo((data) => data?.bondingCurve, tId);

  if (bondingCurve === undefined || bondingCurve >= 100) {
    return null;
  }

  const progressWidth = `${(bondingCurve * 100)}%`;

  return (
    <div className={cn('flex flex-col gap-1 pt-2', className)}>
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        home run:
        <span>{formatReadablePercentChange(bondingCurve / 100, { hideSign: 'positive' })}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-850 relative">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: progressWidth,
            background: 'linear-gradient(to right, rgba(255, 255, 255, 0.2), #FFD85A, #EBB305)',
            boxShadow: '0 0 10px rgba(235, 179, 5, 0.4), 0 0 20px rgba(235, 179, 5, 0.2)',
          }}
        />
      </div>
    </div>
  );
};
