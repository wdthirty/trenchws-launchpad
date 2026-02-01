import React from 'react';
import { cn } from '@/lib/utils';
import { appThemes } from '@/components/TokenHeader/themes';
import Image from 'next/image';

interface QuickBuyCardProps {
  amount?: string;
  onAmountChange?: (amount: string) => void;
}

export const QuickBuyCard: React.FC<QuickBuyCardProps> = ({ 
  amount = '0.01', 
  onAmountChange
}) => {



  return (
    <div className="relative">
      {/* Input field and icon row - with shaded background */}
      <div
        className={cn(
          "relative flex items-center gap-2 px-2 py-1 rounded-lg h-fit transition-all duration-200 bg-[#0B0F13] border border-slate-600/40 hover:bg-white/[7%] hover:border-white/50 shadow-lg"
        )}
      >
        {/* Quick Buy label overlaid on top left corner */}
        <div className="absolute -top-2 right-1 text-emerald-400 text-[10px] uppercase tracking-wide font-semibold bg-[#0B0F13] px-1 z-10">
          Quick Buy
        </div>
        <input
          type="text"
          value={amount}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d*\.?\d*$/.test(v)) {
              onAmountChange?.(v);
            }
          }}
          placeholder="0.01"
          inputMode="decimal"
          className={cn(
            "w-20 bg-transparent text-white text-sm font-medium focus:outline-none focus:ring-0 focus:border-none border-none transition-all duration-200",
            "placeholder:text-slate-400"
          )}
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        
        {/* Solana icon */}
        <div className="flex items-center justify-center w-6 h-6">
          <Image
            src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
            alt="SOL"
            width={20}
            height={20}
                      className="w-5 h-5 transition-all duration-200 hover:scale-110"
          />
        </div>
      </div>
      

    </div>
  );
}; 
