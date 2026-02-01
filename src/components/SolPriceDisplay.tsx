import { useSolPrice } from '@/contexts/SolPriceProvider';
import { useRef } from 'react';

export const SolPriceDisplay: React.FC = () => {
  const { solPrice, isLoading, error, refreshSolPrice } = useSolPrice();
  
  // Keep track of the last valid SOL price
  const lastValidPriceRef = useRef<number | null>(null);
  
  // Update the last valid price when we get a good price
  if (solPrice && !isLoading) {
    lastValidPriceRef.current = solPrice;
  }
  
  // Use the last valid price during loading, or the current price if available
  const displayPrice = isLoading && lastValidPriceRef.current 
    ? lastValidPriceRef.current 
    : solPrice;

  if (error) {
    return (
      <div className="text-xs text-red-400">
        SOL: Error
      </div>
    );
  }

  // Don't show anything if we don't have a price yet
  if (!displayPrice) {
    return null;
  }

  return (
    <div className="text-xs text-[#DEDEDE] flex items-center gap-1">
      <img 
        src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
        alt="SOL" 
        className="w-3 h-3 rounded"
      />
      <span>${displayPrice.toFixed(2)}</span>
      <div className="w-1.5 h-1.5 bg-[#3ce3ab] rounded-full shadow-lg shadow-[#3ce3ab]/50 animate-[pulse_3s_ease-in-out_infinite] ml-1"></div>
    </div>
  );
};
