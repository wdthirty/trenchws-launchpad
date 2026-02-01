"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenLogo } from '@/components/TokenLogo';

import { TokenNameSymbol } from '@/components/TokenHeader/TokenNameSymbol';
import { useTokenInfo } from '@/hooks/queries';
import { formatLargeNumber } from '@/lib/format/number';

type TokenSelectionModalProps = {
  heldCoins: Array<{ 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    balance: number;
    mcap?: number;
    usdValue?: number;
    decimals?: number;
  }>;
  onSelectToken: (token: { 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    balance: number;
    mcap?: number;
    usdValue?: number;
    decimals?: number;
  }) => void;
  onClose: () => void;
  onSelectSOL: () => void;
  solBalance?: number;
  solPrice?: number;
};

export const TokenSelectionModal: React.FC<TokenSelectionModalProps> = ({ 
  heldCoins, 
  onSelectToken, 
  onClose,
  onSelectSOL,
  solBalance = 0,
  solPrice = 0
}) => {
  return (
    <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-0">
          <h2 className="text-lg font-semibold text-white">Send From Wallet</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* SOL Option */}
          <div 
            onClick={onSelectSOL}
            className="flex items-center cursor-pointer p-3 rounded-lg border border-[#21262d]/30 hover:border-[#21262d]/50 hover:bg-[#161B22]/50 transition-all duration-200 mb-3"
          >
            <div className="flex items-center justify-center mr-3 w-10 h-10 bg-emerald-500/20 rounded-lg">
              <img src="hhttps://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" alt="Solana" className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-white">Solana</div>
                  <div className="text-xs text-slate-400">SOL</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Balance</div>
                  <div className="text-base font-semibold text-emerald-400">
                    {solBalance === 0 ? '0' :
                      solBalance < 0.001 ? Math.floor(solBalance * 10000) / 10000 :
                        solBalance < 1 ? Math.floor(solBalance * 1000) / 1000 :
                          solBalance < 10 ? Math.floor(solBalance * 100) / 100 :
                            solBalance < 100 ? Math.floor(solBalance * 10) / 10 :
                              Math.floor(solBalance).toLocaleString()} SOL
                  </div>
                  {solPrice > 0 && (
                    <div className="text-xs text-slate-500">
                      ~${(solBalance * solPrice).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Token List */}
          {heldCoins.length > 0 ? (
            <div className="space-y-1.5">
              <h3 className="text-xs font-medium text-slate-400 mb-2">Your Coins</h3>
              {heldCoins.map((coin, index) => (
                <TokenSelectionCard 
                  key={coin.coinAddress} 
                  coin={coin} 
                  index={index}
                  onSelect={() => onSelectToken(coin)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-400 mb-2">No coins found</div>
              <div className="text-sm text-slate-500">You don't have any coins to send</div>
            </div>
          )}
        </div>
    </div>
  );
};

function TokenSelectionCard({ 
  coin, 
  index, 
  onSelect 
}: { 
  coin: { 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    balance: number;
    mcap?: number;
    usdValue?: number;
    decimals?: number;
  }; 
  index: number;
  onSelect: () => void;
}) {
  const tokenId = coin.coinAddress;
  const { data: tokenData } = useTokenInfo(undefined, tokenId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.03, 
        duration: 0.3,
        ease: "easeOut"
      }}
      onClick={onSelect}
      className="flex items-center cursor-pointer p-3 rounded-lg border border-[#21262d]/30 hover:border-[#21262d]/50 hover:bg-[#161B22]/50 transition-all duration-200"
    >
      {/* Token Icon */}
      <div className="flex items-center justify-center mr-3 relative w-10 h-10 flex-shrink-0">
        <TokenLogo
          src={tokenData?.baseAsset?.icon}
          alt={coin.coinSymbol}
          size="md"
          className="rounded-md"
        />
      </div>

      {/* Token Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <TokenNameSymbol 
              name={coin.coinName}
              symbol={coin.coinSymbol}
              size="md"
            />
          </div>
          <div className="text-right ml-3">
            <div className="text-xs text-slate-400">Balance</div>
            <div className="text-base font-semibold text-emerald-400">
              {coin.balance < 0.001 ? 
                coin.balance.toFixed(6) : 
                coin.balance < 1 ? 
                  coin.balance.toFixed(3) : 
                  formatLargeNumber(coin.balance)
              }
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
