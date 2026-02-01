import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '@/contexts/UserProvider';
import { usePrivy } from '@privy-io/react-auth';
import { useSignTransaction, useSendTransaction } from '@privy-io/react-auth/solana';
import { TokenCreatorTable, Token } from '@/components/Rewards/TokenCreatorTableDBC';
import { motion } from 'framer-motion';
import Page from '@/components/ui/Page/Page';
import { CreatorCoin } from '@/pages/api/rewards/[wallet]/creator-coins';
import { TaggedCoin } from '@/pages/api/rewards/[wallet]/tagged-coins';
import { useMultipleBatchTokenInfo } from '@/hooks/queries';
import { toast } from 'sonner';
import { Connection } from '@solana/web3.js';
import { GetServerSideProps } from 'next';
import LogoBackground from '@/components/LogoBackground';
import { PillButton } from '@/components/ui/PillButton';
import { MIGRATION_FEE_AMOUNT } from '@/lib/feeCalculator';
import { ExternalWalletRewardClaimBuilder } from '@/lib/services/external-wallet/reward-claim-builder.service';


// Combined token type for the UI
type CombinedToken = Token & {
  type: 'creator' | 'tagged';
  creatorAddress?: string;
  creatorUsername?: string;
  taggedWalletAddress?: string;
  taggedWalletUsername?: string;
};

// Enriched token type with Jupiter API data
type EnrichedToken = CombinedToken & {
  marketCap?: number;
  tokenLogo?: string;
  price?: number;
  volume24h?: number;
  holderCount?: number;
  organicScore?: number;
};

interface RewardsPageProps {
  initialTokens: CombinedToken[];
  initialTotalClaimable: number;
  initialTotalClaimed: number;
}

export default function RewardsPage({ initialTokens, initialTotalClaimable, initialTotalClaimed }: RewardsPageProps) {
  const router = useRouter();
  const user = useUser();
  const { user: privyUser } = usePrivy();
  const { signTransaction } = useSignTransaction();
  const { sendTransaction } = useSendTransaction();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const [tokens, setTokens] = useState<CombinedToken[]>(initialTokens);
  const [enrichedTokens, setEnrichedTokens] = useState<EnrichedToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalClaimable, setTotalClaimable] = useState(initialTotalClaimable);
  const [totalClaimed, setTotalClaimed] = useState(initialTotalClaimed);
  const [isLoadingClaimable, setIsLoadingClaimable] = useState(false);
  const [isLoadingClaimed, setIsLoadingClaimed] = useState(false);
  const isFetchingRef = useRef(false); // Track if fetch is in progress

  // Balance refresh state for after claiming
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [lastBalanceValue, setLastBalanceValue] = useState<number | null>(null);
  const balanceRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get token IDs for batch fetching
  const tokenIds = tokens.map(token => token.id);
  
  // Batch fetch token data from Jupiter API (handles batching automatically)
  const { data: allJupiterData, isLoading: isLoadingJupiterData } = useMultipleBatchTokenInfo(tokenIds);

  // Enrich tokens with Jupiter API data when both datasets are available
  useEffect(() => {
    if (tokens.length > 0 && allJupiterData) {
      const enriched = tokens.map(token => {
        const jupiterData = allJupiterData.find(jToken => jToken.baseAsset?.id === token.id);
        return {
          ...token,
          marketCap: jupiterData?.baseAsset?.mcap,
          tokenLogo: jupiterData?.baseAsset?.icon,
          price: jupiterData?.baseAsset?.usdPrice,
          volume24h: jupiterData?.baseAsset?.stats24h ? 
            (jupiterData.baseAsset.stats24h.buyVolume + jupiterData.baseAsset.stats24h.sellVolume) : undefined,
          holderCount: jupiterData?.baseAsset?.holderCount,
          organicScore: jupiterData?.baseAsset?.organicScore,
        };
      });
      setEnrichedTokens(enriched);
    }
  }, [tokens, allJupiterData]);

  // Fetch rewards data
  useEffect(() => {
    if (!user?.publicKey) {
      setIsLoading(false);
      return;
    }

    // Only fetch if we don't have initial data
    if (initialTokens.length > 0) {
      return;
    }

    // Prevent double fetching
    if (isFetchingRef.current) {
      return;
    }

    const fetchRewardsData = async () => {
      try {
        isFetchingRef.current = true;
        setIsLoading(true);
        setIsLoadingClaimable(true);
        setIsLoadingClaimed(true);
        const walletAddress = user.publicKey.toBase58();

        // Fetch both creator and tagged coins in parallel
        const [creatorResponse, taggedResponse] = await Promise.all([
          fetch(`/api/rewards/${walletAddress}/creator-coins`),
          fetch(`/api/rewards/${walletAddress}/tagged-coins`)
        ]);

        if (!creatorResponse.ok || !taggedResponse.ok) {
          throw new Error('Failed to fetch rewards data');
        }

        const creatorData = await creatorResponse.json();
        const taggedData = await taggedResponse.json();





        // Combine and transform the data (Jupiter data is already included from APIs)
        const combinedTokens: CombinedToken[] = [
          // Creator coins
          ...creatorData.coins.map((coin: CreatorCoin) => {
            const totalClaimable = coin.creatorQuoteFee / 1e9; // Convert lamports to SOL
            const poolFees = coin.poolFee / 1e9; // Convert lamports to SOL
            

            
            return {
              id: coin.tokenAddress,
              name: coin.name || `Token ${coin.tokenAddress.slice(0, 8)}`,
              symbol: coin.symbol || `TKN${coin.tokenAddress.slice(0, 4)}`,
              totalCreatorFees: totalClaimable,
              poolFees: poolFees,
              hasMigrationFees: coin.isMigrated && !coin.migrationFeeWithdrawStatus,
              isMigrated: coin.isMigrated,
              poolId: coin.tokenAddress,
              type: 'creator' as const,
                  taggedWalletAddress: undefined as string | undefined,
    taggedWalletUsername: undefined as string | undefined,
            };
          }),
          // Tagged coins
          ...taggedData.coins.map((coin: TaggedCoin) => {
            const totalClaimable = coin.creatorQuoteFee / 1e9; // Convert lamports to SOL
            const poolFees = coin.poolFee / 1e9; // Convert lamports to SOL
            
            return {
              id: coin.tokenAddress,
              name: coin.name || `Token ${coin.tokenAddress.slice(0, 8)}`,
              symbol: coin.symbol || `TKN${coin.tokenAddress.slice(0, 4)}`,
              totalCreatorFees: totalClaimable,
              poolFees: poolFees,
              hasMigrationFees: false, // Tagged users don't get migration fees
              isMigrated: coin.isMigrated,
              poolId: coin.tokenAddress,
              type: 'tagged' as const,
              creatorAddress: undefined as string | undefined,
              creatorUsername: coin.creatorUsername,
            };
          })
        ];

        // Sort by highest fees first
        const sortedTokens = combinedTokens.sort((a, b) => {
          const aFees = a.totalCreatorFees + (a.hasMigrationFees ? MIGRATION_FEE_AMOUNT : 0) + (a.poolFees >= 0.01 && a.isMigrated ? a.poolFees : 0);
          const bFees = b.totalCreatorFees + (b.hasMigrationFees ? MIGRATION_FEE_AMOUNT : 0) + (b.poolFees >= 0.01 && b.isMigrated ? b.poolFees : 0);
          return bFees - aFees;
        });

        // Filter out coins without claimable rewards
        const tokensWithRewards = sortedTokens.filter(token => {
          const tradingFeesSOL = token.totalCreatorFees;
                      const migrationFeesSOL = token.hasMigrationFees ? MIGRATION_FEE_AMOUNT : 0;
          const poolFeesSOL = token.poolFees || 0;
          
          // Check if there are any claimable rewards
          let totalClaimable = 0;
          
          // Add trading fees only if above minimum threshold
          if (tradingFeesSOL >= 0.01) {
            totalClaimable += tradingFeesSOL;
          }
          
          // Add migration fees (no minimum threshold)
          totalClaimable += migrationFeesSOL;
          
          // Add pool fees only if above minimum threshold and migrated
          if (poolFeesSOL >= 0.01 && token.isMigrated) {
            totalClaimable += poolFeesSOL;
          }
          
          return totalClaimable > 0;
        });
        setTokens(tokensWithRewards);
        
        // Calculate totals
        const totalClaimable = tokensWithRewards.reduce((sum, token) => {
          let fees = 0;
          
          // Add trading fees only if above minimum threshold
          if (token.totalCreatorFees >= 0.01) {
            fees += token.totalCreatorFees;
          }
          
          // Add migration fees (no minimum threshold since they're always high value)
          if (token.hasMigrationFees) {
            fees += MIGRATION_FEE_AMOUNT; // Migration fees are 1.66 SOL for creators
          }
          
          // Add pool fees only if above minimum threshold and migrated
          if (token.poolFees >= 0.01 && token.isMigrated) {
            fees += token.poolFees;
          }
          
          return sum + fees;
        }, 0);
        
        setTotalClaimable(totalClaimable);
        setIsLoadingClaimable(false);
        
        // Get total claimed fees from API
        try {
          const claimedResponse = await fetch(`/api/rewards/${walletAddress}/total-claimed`);
          if (claimedResponse.ok) {
            const { totalClaimed: totalClaimedFees } = await claimedResponse.json();
            setTotalClaimed(totalClaimedFees);
          } else {
            console.error('Failed to fetch total claimed fees');
            setTotalClaimed(0);
          }
        } catch (error) {
          console.error('Error fetching total claimed fees:', error);
          setTotalClaimed(0);
        }
        setIsLoadingClaimed(false);
      } catch (err) {
        setError('Failed to load your rewards');
        console.error('Error fetching rewards data:', err);
        setIsLoadingClaimable(false);
        setIsLoadingClaimed(false);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchRewardsData();
  }, [user?.publicKey?.toBase58()]); // Use the string representation for more stable dependency

  // Balance refresh effect after claiming
  useEffect(() => {
    if (isRefreshingBalance && user.publicKey) {
      // Start 1-second refresh interval
      balanceRefreshIntervalRef.current = setInterval(async () => {
        try {
          await user.refreshBalances();
          
          // Check if balance has changed
          if (lastBalanceValue !== null && user.walletBalance !== null) {
            if (user.walletBalance !== lastBalanceValue) {
              setIsRefreshingBalance(false);
              setLastBalanceValue(null);
              if (balanceRefreshIntervalRef.current) {
                clearInterval(balanceRefreshIntervalRef.current);
                balanceRefreshIntervalRef.current = null;
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing balance:', error);
        }
      }, 1000);

      // Cleanup function
      return () => {
        if (balanceRefreshIntervalRef.current) {
          clearInterval(balanceRefreshIntervalRef.current);
          balanceRefreshIntervalRef.current = null;
        }
      };
    }
    
    // Return undefined for the case when the effect doesn't run
    return undefined;
  }, [isRefreshingBalance, user.publicKey, user.refreshBalances, lastBalanceValue, user.walletBalance]);

  // Determine if we're still loading (rewards data OR Jupiter data)
  const isStillLoading = isLoading || (tokens.length > 0 && isLoadingJupiterData);
  
  // Use enriched tokens if available, otherwise fall back to basic tokens
  const displayTokens = enrichedTokens.length > 0 ? enrichedTokens : tokens;

  const handleClaimAllFees = async (tokenId: string) => {
    try {
      const token = tokens.find(t => t.id === tokenId);
      if (!token || !user?.publicKey) {
        return;
      }
      
      // Store current balance before claiming
      setLastBalanceValue(user.walletBalance);
      
      // Check user's SOL balance before attempting to claim
      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');
        const balance = await connection.getBalance(user.publicKey);
        const balanceSOL = balance / 1e9;
        
        if (balanceSOL < 0.004) {
          toast.error('Insufficient SOL balance. You need at least 0.004 SOL to claim rewards.');
          return;
        }
      } catch (balanceError) {
        console.warn('⚠️ Could not check SOL balance: ', balanceError);
        // Continue with the claim attempt even if balance check fails
      }

      // Check if user is using an external wallet (has wallet but no embedded wallet ID)
      const isExternalWallet = privyUser?.wallet && !privyUser.wallet.id;
      
      if (isExternalWallet) {
        // Use external wallet claim system
        await handleExternalWalletClaim(tokenId, token);
      } else {
        // Use embedded wallet claim system (existing logic)
        await handleEmbeddedWalletClaim(tokenId, token);
      }
    } catch (err) {
      console.error('💥 === CLAIM FAILED ===');
      console.error('❌ Error claiming all fees:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to claim rewards');
    }
  };

  const handleExternalWalletClaim = async (tokenId: string, token: CombinedToken) => {
    try {
      console.log('🔧 Using external wallet claim system...');
      
      // Prepare request payload for external wallet
      const requestPayload = {
        walletAddress: user.publicKey!.toBase58(),
        tokenId,
        tokenType: token.type,
      };
      
      // Call the external claim API to get transaction data
      const response = await fetch('/api/rewards/claim-external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to prepare claim');
      }

      const result = await response.json();

      if (!result.success || !result.transactionData) {
        throw new Error('Failed to prepare claim transactions');
      }

      // Initialize the transaction builder
      const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');
      const claimBuilder = new ExternalWalletRewardClaimBuilder(connection);

      // Execute the claim transactions using Privy's external wallet integration
      const signatures = await claimBuilder.executeClaimTransactionsWithPrivy(
        result.transactionData,
        user.publicKey!,
        signTransaction,
        sendTransaction,
        user.publicKey!.toBase58()
      );

      if (signatures.length > 0) {
        // Log the claimed fees to the database
        try {
          await claimBuilder.logClaimedFees(
            result.transactionData,
            user.publicKey!.toBase58(),
            signatures
          );
          console.log('✅ Successfully logged claimed fees for external wallet');
        } catch (loggingError) {
          console.warn('⚠️ Failed to log claimed fees, but claim was successful:', loggingError);
          // Don't fail the entire process if logging fails
        }

        // Start frequent balance refresh
        setIsRefreshingBalance(true);
        
        // Remove the claimed token from the list since it no longer has rewards
        setTokens(prev => prev.filter(token => token.id !== tokenId));

        // Show success toast with transaction signatures
        toast.success(`Successfully claimed rewards! ${signatures.length} transaction(s) completed.`);
        console.log('✅ External wallet claim completed with signatures:', signatures);
      } else {
        throw new Error('No transactions were executed');
      }
    } catch (err) {
      console.error('❌ External wallet claim failed:', err);
      throw err;
    }
  };

  const handleEmbeddedWalletClaim = async (tokenId: string, token: CombinedToken) => {
    try {
      console.log('🔧 Using embedded wallet claim system...');
      
      if (!privyUser?.wallet?.id) {
        throw new Error('Embedded wallet not found');
      }
      
      // Prepare request payload for embedded wallet
      const requestPayload = {
        walletAddress: user.publicKey!.toBase58(),
        tokenId,
        tokenType: token.type,
        privyWalletId: privyUser.wallet.id,
      };
      
      // Call the embedded claim API
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim fees');
      }

      const result = await response.json();

      if (result.success) {
        // Start frequent balance refresh
        setIsRefreshingBalance(true);
        
        // Remove the claimed token from the list since it no longer has rewards
        setTokens(prev => prev.filter(token => token.id !== tokenId));

        // Show success toast with transaction ID
        toast.success(`Successfully claimed rewards!`);
      } else {
        toast.warning('Claim completed but with some issues. Please chat with us on X.');
      }
    } catch (err) {
      console.error('❌ Embedded wallet claim failed:', err);
      throw err;
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      router.push('/');
    }
  }, [user, router]);

  if (user === null) {
    return null; // Will redirect
  }

  return (
    <Page scrollable={true}>
      <Head>
        <title>Rewards | launchpad.fun</title>
        <meta name="description" content="Easiest place to raise funds and earn fees" />
        
        <meta property="og:title" content="Rewards | launchpad.fun" />
        <meta property="og:description" content="Easiest place to raise funds and earn fees" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${baseUrl}/rewards`} />
        <meta property="og:image" content={`${baseUrl}/api/og/rewards/opengraph`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Rewards Dashboard" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rewards | launchpad.fun" />
        <meta name="twitter:description" content="Easiest place to raise funds and earn fees" />
        <meta name="twitter:image" content={`${baseUrl}/api/og/rewards/twitter`} />
        <meta name="twitter:image:alt" content="Rewards Dashboard" />
      </Head>

      <LogoBackground />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-24">
        {/* Main Container */}
        <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          
          {/* Header */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center space-y-3 sm:space-y-4"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Rewards</h1>
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
              Claim your trading and migration fees from your created and tagged coins
            </p>
          </motion.section>

          {/* Stats Cards */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
          >
            {/* Total Claimable */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-4 sm:p-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-400 mb-2">
                  {isLoadingClaimable ? (
                    <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    `${totalClaimable.toFixed(4)} SOL`
                  )}
                </h2>
                <p className="text-slate-300 text-sm sm:text-base">Total rewards to claim</p>
              </div>
            </div>

            {/* Total Claimed */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 sm:p-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-purple-400 mb-2">
                  {isLoadingClaimed ? (
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    `${totalClaimed.toFixed(4)} SOL`
                  )}
                </h2>
                <p className="text-slate-300 text-sm sm:text-base">Total rewards claimed</p>
              </div>
            </div>
          </motion.section>

          {/* Loading State */}
          {isStillLoading && (
            <motion.section 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 sm:py-20"
            >
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            </motion.section>
          )}

          {/* Error State */}
          {error && (
            <motion.section 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 sm:py-20"
            >
              <p className="text-red-400 mb-4 text-sm sm:text-base">{error}</p>
              <PillButton
                onClick={() => window.location.reload()}
                theme="ghost"
                size="md"
              >
                Try Again
              </PillButton>
            </motion.section>
          )}

          {/* No Rewards State */}
          {!isStillLoading && !error && tokens.length === 0 && (
            <motion.section 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 sm:py-20"
            >
              <h2 className="text-lg sm:text-xl font-bold text-white mb-2">No rewards yet</h2>
              <p className="text-slate-300 mb-6 text-xs sm:text-sm">
                Create some coins and start earning trading fees!
              </p>
              <div className="flex justify-center">
                <PillButton
                  onClick={() => router.push('/launch')}
                  theme="green"
                  size="md"
                >
                  Create Your First Coin
                </PillButton>
              </div>
            </motion.section>
          )}

          {/* Tokens List */}
          {!isStillLoading && !error && tokens.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Your Coins</h2>
                <p className="text-slate-300 text-sm sm:text-base">Click on a coin to view details and claim rewards</p>
              </div>
              <div className="flex justify-center">
                <TokenCreatorTable
                  tokens={displayTokens}
                  onClaimAllFees={handleClaimAllFees}
                />
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </Page>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    // For the rewards page, we can't fetch user-specific data on the server
    // since we need authentication. We'll return empty initial data
    // and let the client-side handle the authenticated requests
    
    return {
      props: {
        initialTokens: [],
        initialTotalClaimable: 0,
        initialTotalClaimed: 0,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    
    return {
      props: {
        initialTokens: [],
        initialTotalClaimable: 0,
        initialTotalClaimed: 0,
      },
    };
  }
};

