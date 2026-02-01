import { useTokenAddress } from '@/hooks/queries';
import { BondingCurve } from './BondingCurve';
import { TokenMetrics } from './TokenMetrics';

type TokenMetricsProps = {
  tId?: string
};

export const TokenDetails: React.FC<TokenMetricsProps> = ({ tId }) => {
  const tokenId = tId ? tId : useTokenAddress();

  return (
    <div className="flex flex-col gap-y-4 w-full"> {/* removed overflow-y-auto */}
      <TokenMetrics key={`token-metrics-${tokenId}`} tId={tId} />
      <BondingCurve key={`bonding-curve-${tokenId}`} tId={tId} className="px-2" />
    </div>
  );
};
