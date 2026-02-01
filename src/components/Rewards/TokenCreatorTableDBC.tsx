import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ReadableNumber } from '@/components/ui/ReadableNumber';
import { TokenLogo } from '@/components/TokenLogo';
import { PillButton } from '@/components/ui/PillButton';
import { TokenNameSymbol } from '@/components/TokenHeader/TokenNameSymbol';
import { MetricMcap } from '@/components/TokenHeader/TokenMetric/TokenMetric';
import { appThemes } from '@/components/TokenHeader/themes';
import { cn } from '@/lib/utils';
import { MIGRATION_FEE_AMOUNT } from '@/lib/feeCalculator';

export type Token = {
  id: string;
  name: string;
  symbol: string;
  marketCap?: number;
  totalCreatorFees: number; // Already in SOL
  hasMigrationFees: boolean;
  poolFees: number; // Pool fees in SOL
  tokenLogo?: string;
  isMigrated?: boolean;
  poolId: string;
  type?: 'creator' | 'tagged';
  creatorAddress?: string;
  creatorUsername?: string;
  taggedUserAddress?: string;
  taggedUsername?: string;
  // Additional enriched data from Jupiter API
  price?: number;
  volume24h?: number;
  holderCount?: number;
  organicScore?: number;
};

type TokenTableProps = {
  tokens: Token[];
  onClaimAllFees: (tokenId: string) => void;
};



export const TokenCreatorTable: React.FC<TokenTableProps> = ({
  tokens,
  onClaimAllFees,
}) => {
  const router = useRouter();
  const [claimingTokenId, setClaimingTokenId] = useState<string | null>(null);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleClaimClick = async (e: React.MouseEvent, tokenId: string) => {
    stop(e);
    setClaimingTokenId(tokenId);
    try {
      await onClaimAllFees(tokenId);
    } finally {
      setClaimingTokenId(null);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-4xl">
      {tokens.map((token) => {
        const tradingFeesSOL = token.totalCreatorFees;
        const migrationFeesSOL = token.hasMigrationFees ? MIGRATION_FEE_AMOUNT : 0; // Migration fees are 1.66 SOL for creators
        const poolFeesSOL = token.poolFees || 0;
        
        // Calculate total claimable with minimum thresholds
        let totalClaimableSOL = 0;
        
        // Add trading fees only if above minimum threshold (0.01 SOL)
        if (tradingFeesSOL >= 0.01) {
          totalClaimableSOL += tradingFeesSOL;
        }
        
        // Add migration fees (no minimum threshold since they're always high value)
        totalClaimableSOL += migrationFeesSOL;
        
        // Add pool fees only if above minimum threshold (0.01 SOL) and migrated
        if (poolFeesSOL >= 0.01 && token.isMigrated) {
          totalClaimableSOL += poolFeesSOL;
        }
        
        const hasAnyRewards = totalClaimableSOL > 0;
        
        // Determine styling based on token type and rewards availability
        const isCreator = token.type === 'creator';
        const isTagged = token.type === 'tagged';
        
        // Choose theme based on token type and rewards status
        let theme;
        if (hasAnyRewards) {
          if (isCreator) {
            theme = appThemes.cyan; // Creator with rewards
          } else if (isTagged) {
            theme = appThemes.purple; // Tagged with rewards
          } else {
            theme = appThemes.slate; // Fallback
          }
        } else {
          theme = appThemes.slate; // No rewards - use slate theme
        }

        return (
          <div
            key={token.id}
            className={cn(
              "flex flex-col p-4 sm:p-6 border border-slate-700/50 rounded-lg transition-all duration-200", 
              theme.background,
              theme.border
            )}
          >
            {/* Top Row - Token Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-4 gap-3 sm:gap-0">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                  <TokenLogo
                    src={token.tokenLogo || 'https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora'}
                    alt={token.symbol}
                    size="md"
                    className="w-full h-full"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1 ml-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white leading-none tracking-tight text-sm">
                      {token.name}
                    </span>
                    {token.symbol && (
                      <span className="font-medium text-primary border border-primary rounded-full px-1.5 py-0.5 text-[10px] flex-shrink-0">
                        {token.symbol}
                      </span>
                    )}
                    {/* Migration Status */}
                    {token.isMigrated && (
                      <span className={`w-fit text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${appThemes.blue.background} ${appThemes.blue.text} border ${appThemes.blue.border}`}>
                        Migrated
                      </span>
                    )}
                    {/* Tagged creator info - shown on desktop only */}
                    {isTagged && token.creatorUsername && (
                      <a 
                        href={`https://x.com/${token.creatorUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer border border-slate-700/50 rounded-full px-2 py-1"
                      >
                        Tagged by @{token.creatorUsername}
                      </a>
                    )}
                    {/* Creator royalties info - shown on desktop only */}
                    {isCreator && token.taggedUsername && (
                      <a
                        href={`https://x.com/${token.taggedUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer border border-slate-700/50 rounded-full px-2 py-1"
                      >
                        Royalties go to @{token.taggedUsername}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-row justify-between mt-1 gap-2">
                    {/* Creator royalties info - shown on mobile only */}
                    <MetricMcap tId={token.id} />
                    <div className="sm:hidden">
                      {isCreator && token.taggedUsername && (
                        <a
                          href={`https://x.com/${token.taggedUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer border border-slate-700/50 rounded-full px-2 py-1"
                        >
                          Royalties go to @{token.taggedUsername}
                        </a>
                      )}
                    </div>
                    {/* Tagged creator info - shown on mobile only */}
                    <div className="sm:hidden">
                      {isTagged && token.creatorUsername && (
                        <a 
                          href={`https://x.com/${token.creatorUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer border border-slate-700/50 rounded-full px-2 py-1"
                        >
                          Tagged by @{token.creatorUsername}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              
              {/* View Details Button */}
              <PillButton
                theme="green"
                size="sm"
                onClick={() => router.push(`/coin/${token.id}`)}
                className=""
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Go To Coin
              </PillButton>
            </div>

            {/* Rewards Section */}
            {hasAnyRewards && (
              <div className="border-t border-slate-700/50 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Total Claimable Amount */}
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-400">Total Claimable</span>
                    <span className={`text-lg sm:text-xl font-bold ${theme.text}`}>
                      {totalClaimableSOL.toFixed(4)} SOL
                    </span>
                    {/* Fee Breakdown */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1 text-xs text-slate-500">
                      {tradingFeesSOL > 0 && (
                        <span>
                          Trading: {tradingFeesSOL.toFixed(4)} SOL
                          {tradingFeesSOL < 0.01 && (
                            <span className="text-orange-400 ml-1">(below 0.01 SOL min)</span>
                          )}
                        </span>
                      )}
                      {migrationFeesSOL > 0 && (
                        <span>Migration: {migrationFeesSOL.toFixed(4)} SOL</span>
                      )}
                      {poolFeesSOL > 0 && (
                        <span>
                          Pool: {poolFeesSOL.toFixed(4)} SOL
                          {poolFeesSOL < 0.01 && (
                            <span className="text-orange-400 ml-1">(below 0.01 SOL min)</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unified Claim Button */}
                  <PillButton
                    theme="yellow"
                    size="md"
                    onClick={(e) => handleClaimClick(e, token.id)}
                    disabled={claimingTokenId === token.id}
                    className="w-full sm:w-auto min-w-[140px]"
                  >
                    {claimingTokenId === token.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Claiming...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="iconify ph--gift-bold w-4 h-4" />
                        Claim All Rewards
                      </div>
                    )}
                  </PillButton>
                </div>
              </div>
            )}

            {/* No Rewards Message */}
            {!hasAnyRewards && (
              <div className="border-t border-slate-700/50 pt-4">
                <div className="text-center text-slate-500 text-sm">
                  {tradingFeesSOL > 0 || migrationFeesSOL > 0 || poolFeesSOL > 0 ? (
                    <div>
                      <div>Fees available but below minimum threshold</div>
                      <div className="text-xs text-orange-400 mt-1">
                        Trading and pool fees must be ≥ 0.01 SOL to claim
                      </div>
                      {poolFeesSOL > 0 && !token.isMigrated && (
                        <div className="text-xs text-blue-400 mt-1">
                          Pool fees require migration to claim
                        </div>
                      )}
                    </div>
                  ) : (
                    'No rewards available for this coin yet'
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
