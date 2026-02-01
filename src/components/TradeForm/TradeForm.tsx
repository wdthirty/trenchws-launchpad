import React from 'react';
import { useTradeForm } from '@/contexts/TradeFormProvider';

interface TradeFormProps {
  inputMint: string;
  outputMint: string;
  symbol: string;
  tokenDecimals?: number;
  launchpad?: string;
  icon?: string;
}

export const TradeForm: React.FC<TradeFormProps> = ({ inputMint, outputMint, symbol, tokenDecimals, launchpad, icon }) => {
  const { openTradeForm } = useTradeForm();

  const handleTradeClick = () => {
    openTradeForm(inputMint, outputMint, symbol, tokenDecimals, launchpad, icon);
  };

  return (
    <button
      onClick={handleTradeClick}
      className="w-full py-3 px-4 font-semibold rounded-full bg-primary hover:bg-primary/90 text-black transition-all duration-200 hover:scale-[0.98] active:scale-[0.96] flex items-center justify-center gap-2"
    >
      <span className="text-base font-bold">Trade {symbol}</span>
    </button>
  );
}; 
