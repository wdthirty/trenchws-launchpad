import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import Page from '@/components/ui/Page/Page';
import { getUserProfileDataByIdentifier } from '@/lib/database';
import { useUser } from '@/contexts/UserProvider';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { useSolPrice } from '@/contexts/SolPriceProvider';
import { SendFlow } from '@/components/SendFlow/SendFlow';
import { ReceiveFlow } from '@/components/ReceiveFlow/ReceiveFlow';
import { PrivateKeyFlow } from '@/components/PrivateKeyFlow/PrivateKeyFlow';
import CopyIconSVG from '@/icons/CopyIconSVG';
import { TokenLogo } from '@/components/TokenLogo';
import { TokenCardVolumeMetric, TokenCardMcapMetric, TokenCardAgeMetric } from '@/components/TokenCard/TokenCardMetric';
import { TokenNameSymbol } from '@/components/TokenHeader/TokenNameSymbol';
import { useTokenInfo } from '@/hooks/queries';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import PillButton from '@/components/ui/PillButton';
import { formatLargeNumber } from '@/lib/format/number';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Pool } from 'pg';
import { getProfileDisplayIcon } from '@/lib/utils/user-icon';

type ProfileProps = {
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  walletAddress: string | null;
  isWalletOnly: boolean;
  stats: {
    coinsCreated: number;
    coinsGraduated: number;
    totalPnl: number;
  };
  createdCoins: Array<{ 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    isGraduated: boolean;
  }>;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const identifier = ctx.params?.username as string;
  if (!identifier) return { notFound: true };



  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Use optimized single query to fetch all profile data
    const { user, coins, totalPnl } = await getUserProfileDataByIdentifier(pool, identifier);
    
    if (!user) {
      return { notFound: true };
    }

    // Fetch all token information from Jupiter pools API using only addresses from DB
    let createdCoinsWithData: Array<{ coinName: string; coinSymbol: string; coinAddress: string; isGraduated: boolean; mcap: number }> = [];
    if (coins.length > 0) {
      try {
        // Batch token addresses into groups of 50 for Jupiter API
        const batchSize = 50;
        const addressBatches = [];
        for (let i = 0; i < coins.length; i += batchSize) {
          addressBatches.push(coins.slice(i, i + batchSize));
        }

        // Fetch all token data from Jupiter pools API
        const allCoinsWithData = [];
        
        for (const batch of addressBatches) {
          try {
            const assetIds = batch.map(coin => coin.coinAddress).join(',');
            const response = await fetch(`https://datapi.jup.ag/v1/pools?assetIds=${encodeURIComponent(assetIds)}`);
            
            if (response.ok) {
              const data = await response.json();
              
              // Process each token address in the batch
              for (const coin of batch) {
                const poolData = data.pools?.find((pool: any) => pool.baseAsset?.id === coin.coinAddress);
                
                if (poolData?.baseAsset) {
                  // Use all data from Jupiter API
                  allCoinsWithData.push({
                    coinName: poolData.baseAsset.name || coin.coinName || '',
                    coinSymbol: poolData.baseAsset.symbol || coin.coinSymbol || '',
                    coinAddress: coin.coinAddress || '',
                    isGraduated: coin.isGraduated || false,
                    mcap: poolData.baseAsset.mcap || 0
                  });
                } else {
                  // Fallback to DB data if not found in Jupiter API
                  allCoinsWithData.push({
                    coinName: coin.coinName || '',
                    coinSymbol: coin.coinSymbol || '',
                    coinAddress: coin.coinAddress || '',
                    isGraduated: coin.isGraduated || false,
                    mcap: 0
                  });
                }
              }
            } else {
              // If Jupiter API fails for this batch, use DB data
              for (const coin of batch) {
                allCoinsWithData.push({
                  coinName: coin.coinName || '',
                  coinSymbol: coin.coinSymbol || '',
                  coinAddress: coin.coinAddress || '',
                  isGraduated: coin.isGraduated || false,
                  mcap: 0
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch Jupiter pools data for batch:`, error);
            // Add coins from this batch using DB data
            for (const coin of batch) {
              allCoinsWithData.push({
                coinName: coin.coinName || '',
                coinSymbol: coin.coinSymbol || '',
                coinAddress: coin.coinAddress || '',
                isGraduated: coin.isGraduated || false,
                mcap: 0
              });
            }
          }
        }

        // Sort by market cap (highest first)
        createdCoinsWithData = allCoinsWithData.sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
      } catch (error) {
        console.error('Error fetching token data:', error);
        // Fallback to original coins without market cap
        createdCoinsWithData = coins.map((c: any) => ({
          coinName: c.coinName || '',
          coinSymbol: c.coinSymbol || '',
          coinAddress: c.coinAddress || '',
          isGraduated: c.isGraduated || false,
          mcap: 0
        }));
      }
    }



    // Cache SSR response at the CDN for short period to reduce TTFB
    try {
      ctx.res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    } catch {}

    const props = {
      username: user.twitterUsername || user.privyWalletAddress || '',
      displayName: user.twitterDisplayName || user.walletDisplayName || null,
      profileImageUrl: user.twitterImageUrl || 'https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora',
      walletAddress: user.privyWalletAddress || '',
      isWalletOnly: user.isWalletOnly || false,
      stats: {
        coinsCreated: user.coinsCreated || 0,
        coinsGraduated: user.coinsGraduated || 0,
        totalPnl: totalPnl || 0,
      },
      createdCoins: createdCoinsWithData,
    };



    return { props };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return { notFound: true };
  } finally {
    // Close the pool connection
    if (pool) {
      pool.end();
    }
  }
};

export default function UserProfilePage({ username, displayName, profileImageUrl, walletAddress, isWalletOnly, stats, createdCoins }: ProfileProps) {
  const viewer = useUser();
  const { logout: privyLogout } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  
  // Custom logout function that clears localStorage and disconnects external wallets
  const logout = useCallback(async () => {
    try {
      // First, disconnect external wallets if any are connected
      if (solanaWallets && solanaWallets.length > 0) {
        for (const wallet of solanaWallets) {
          if (wallet.walletClientType !== 'privy') {
            try {
              await wallet.disconnect();
            } catch (error) {
              console.warn('Failed to disconnect external wallet:', error);
            }
          }
        }
      }
      
      // Clear entire localStorage
      localStorage.clear();
      
      // Call Privy logout
      await privyLogout();
      
      // Show logout toast
      toast.success('Logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
    }
  }, [privyLogout, solanaWallets]);
  const { solPrice } = useSolPrice();
  const [isClient, setIsClient] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const [showSendFlow, setShowSendFlow] = useState(false);
  const [showReceiveFlow, setShowReceiveFlow] = useState(false);
  const [showPrivateKeyFlow, setShowPrivateKeyFlow] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // New state for coins held
  const [heldCoins, setHeldCoins] = useState<Array<{ 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    balance: number;
    mcap?: number;
    usdValue?: number;
  }>>([]);
  const [isLoadingHeldCoins, setIsLoadingHeldCoins] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const isOwner = viewer?.username?.toLowerCase() === username.toLowerCase();

  // Fetch wallet balance only for the owner
  useEffect(() => {
    if (!isOwner || !walletAddress || !isClient) return;

    const fetchWalletBalance = async () => {
      setIsLoadingBalance(true);
      try {
        const res = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${walletAddress}`);
        const obj = await res.json();
        setWalletBalance(obj.SOL?.uiAmount ?? 0);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setWalletBalance(0);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchWalletBalance();
  }, [isOwner, walletAddress, isClient]);

  // Fetch held coins for the profile owner
  useEffect(() => {
    if (!walletAddress || !isClient) return;

    const fetchHeldCoins = async () => {
      setIsLoadingHeldCoins(true);
      try {
        // Fetch token balances from Jupiter API
        const res = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${walletAddress}`);
        const obj = await res.json();
        
        // Filter out SOL and get only tokens with non-zero balances
        const tokenMints = Object.keys(obj).filter(mint => 
          mint !== 'SOL' && obj[mint]?.uiAmount > 0
        );

        if (tokenMints.length === 0) {
          setHeldCoins([]);
          return;
        }

        // Batch token addresses into groups of 50 for Jupiter pools API
        const batchSize = 50;
        const addressBatches = [];
        for (let i = 0; i < tokenMints.length; i += batchSize) {
          addressBatches.push(tokenMints.slice(i, i + batchSize));
        }

        // Fetch all token data from Jupiter pools API
        const allHeldCoins = [];
        
        for (const batch of addressBatches) {
          try {
            const assetIds = batch.join(',');
            const response = await fetch(`https://datapi.jup.ag/v1/pools?assetIds=${encodeURIComponent(assetIds)}`);
            
            if (response.ok) {
              const data = await response.json();
              // Process each token address in the batch
              for (const mint of batch) {
                const poolData = data.pools?.find((pool: any) => pool.baseAsset?.id === mint);
                const balanceData = obj[mint];
                
                if (poolData?.baseAsset && balanceData) {
                  // Only include tokens that have valid data from Jupiter API
                  const price = poolData.baseAsset.usdPrice || 0;
                  const usdValue = (balanceData.uiAmount || 0) * price;
                  allHeldCoins.push({
                    coinName: poolData.baseAsset.name || '',
                    coinSymbol: poolData.baseAsset.symbol || '',
                    coinAddress: mint,
                    balance: balanceData.uiAmount || 0,
                    mcap: poolData.baseAsset.mcap || 0,
                    usdValue: usdValue,
                    decimals: poolData.baseAsset.decimals || 6
                  });
                }
                // Skip tokens not found in Jupiter API (likely NFTs or invalid tokens)
              }
                                      } else {
               // If Jupiter API fails for this batch, skip these tokens
               // We only want to show tokens with valid data
           }
        } catch (error) {
          console.warn(`Failed to fetch Jupiter pools data for batch:`, error);
          // Skip tokens from this batch - we only want tokens with valid data
        }
        }

        // Sort by USD value (highest first), tokens without USD values go to bottom sorted by balance
        const sortedHeldCoins = allHeldCoins.sort((a, b) => {
          const aUsdValue = a.usdValue || 0;
          const bUsdValue = b.usdValue || 0;
          
          // If both have USD values, sort by USD value
          if (aUsdValue > 0 && bUsdValue > 0) {
            return bUsdValue - aUsdValue;
          }
          
          // If one has USD value and the other doesn't, prioritize the one with USD value
          if (aUsdValue > 0 && bUsdValue === 0) {
            return -1; // a comes first
          }
          if (aUsdValue === 0 && bUsdValue > 0) {
            return 1; // b comes first
          }
          
          // If both have 0 USD value, sort by balance
          return (b.balance || 0) - (a.balance || 0);
        });
        

        
        setHeldCoins(sortedHeldCoins);
      } catch (error) {
        console.error('Error fetching held coins:', error);
        setHeldCoins([]);
      } finally {
        setIsLoadingHeldCoins(false);
      }
    };

    fetchHeldCoins();
  }, [walletAddress, isClient]);

  const handleCopyAddress = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  // Show loading spinner while client is not ready
  if (!isClient) {
    return (
      <Page>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Head>
        <title>{`${isWalletOnly ? displayName : `@${username}`} | launchpad.fun`}</title>
        <meta name="description" content={`Check out ${isWalletOnly ? displayName : `@${username}`}'s profile on launchpad.fun`} />
        <meta name="robots" content="index,follow" />
        
        <meta property="og:title" content={`${isWalletOnly ? displayName : `@${username}`} | launchpad.fun`} />
        <meta property="og:description" content={`Check out ${isWalletOnly ? displayName : `@${username}`}'s profile on launchpad.fun`} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`${baseUrl}/profile/${username}`} />
        <meta property="og:image" content={`${baseUrl}/api/og/profile/${username}/opengraph`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${isWalletOnly ? displayName : `@${username}`}'s profile`} />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${isWalletOnly ? displayName : `@${username}`} | launchpad.fun`} />
        <meta name="twitter:description" content={`Check out ${isWalletOnly ? displayName : `@${username}`}'s profile on launchpad.fun`} />
        <meta name="twitter:image" content={`${baseUrl}/api/og/profile/${username}/twitter`} />
        <meta name="twitter:image:alt" content={`${isWalletOnly ? displayName : `@${username}`}'s profile`} />
      </Head>

      <motion.div 
        className="max-w-4xl mx-auto px-4 py-6 pb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Profile Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.img 
              src={getProfileDisplayIcon(profileImageUrl)} 
              alt={username} 
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-slate-600/30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            />
            <div className="flex-1 flex items-center gap-4">
              <div>
                <motion.div 
                  className="text-lg sm:text-xl font-semibold text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                >
                  {displayName || (isWalletOnly ? username : `@${username}`)}
                </motion.div>
                {!isWalletOnly && (
                  <motion.div 
                    className="text-sm sm:text-base text-slate-400"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
                  >
                    @{username}
                  </motion.div>
                )}
              </div>
              {isClient && isOwner && (
                <motion.div 
                  className="hidden sm:block"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
                >
                  <PillButton
                    theme="slate"
                    size="sm"
                    onClick={() => logout()}
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                      />
                    </svg>
                    Log Out
                  </PillButton>
                </motion.div>
              )}
            </div>
            {isClient && isOwner && (
              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.5 }}
              >
                {!isWalletOnly && (
                  <PillButton
                    theme="green"
                    size="sm"
                    onClick={() => setShowSendFlow(true)}
                  >
                    <svg 
                      className="w-4 h-4 sm:w-5 sm:h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
                      />
                    </svg>
                    Send
                  </PillButton>
                )}
                <PillButton
                  theme="purple"
                  size="sm"
                  onClick={() => setShowReceiveFlow(true)}
                >
                  <svg 
                    className="w-4 h-4 sm:w-5 sm:h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1 1v1a1 1 0 001 1z" 
                    />
                  </svg>
                  Receive
                </PillButton>
              </motion.div>
            )}
          </div>
          

        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.6 }}
        >
          <Stat label="Coins Launched" value={stats.coinsCreated} />
          <Stat label="Coins Graduated" value={stats.coinsGraduated} />
          <Stat 
            label="Total PnL (SOL)" 
            value={Math.abs(Number(stats.totalPnl)) < 0.001 ? '0' : (Number(stats.totalPnl) >= 0 ? '+' + Number(stats.totalPnl).toFixed(3) : Number(stats.totalPnl).toFixed(3))}
            valueClassName={Math.abs(Number(stats.totalPnl)) < 0.001 ? 'text-white' : (Number(stats.totalPnl) >= 0 ? 'text-emerald-400' : 'text-red-400')}
          />
        </motion.div>

        {/* Wallet Section */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Wallet</h2>
            {isClient && isOwner && !isWalletOnly && (
              <PillButton
                theme="blue"
                size="sm"
                onClick={() => setShowPrivateKeyFlow(true)}
              >
                <svg 
                  className="w-4 h-4 mr-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" 
                  />
                </svg>
                Export Private Key
              </PillButton>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Wallet Balance - Only show for owner */}
            {isOwner && (
              <div className="flex items-center justify-between p-4 bg-[#0B0F13] rounded-xl border border-slate-600/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <img src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" alt="Solana" className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Balance</div>
                    <div className="text-xl font-bold text-emerald-400">
                      {isLoadingBalance ? (
                        <span className="text-slate-400">Loading...</span>
                      ) : (
                        walletBalance === null ? '—' :
                        walletBalance === 0 ? '0' : 
                        walletBalance < 0.001 ? Math.floor(walletBalance * 1000000) / 1000000 :
                        walletBalance < 1 ? Math.floor(walletBalance * 1000) / 1000 :
                        walletBalance < 10 ? Math.floor(walletBalance * 100) / 100 :
                        walletBalance < 100 ? Math.floor(walletBalance * 10) / 10 :
                        Math.floor(walletBalance).toLocaleString()
                      )} SOL
                    </div>
                  </div>
                </div>
                <div className="text-xs text-emerald-400 bg-emerald-700/20 px-2 py-1 rounded">
                  ${solPrice && walletBalance !== null ? (walletBalance * solPrice).toLocaleString() : '...'}
                </div>
              </div>
            )}

            {/* Wallet Address */}
            {walletAddress && (
              <div className="p-4 bg-[#0B0F13] rounded-xl border border-slate-600/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1 1v1a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-400">Address</div>
                    <div
                      className="relative group cursor-pointer"
                      onClick={handleCopyAddress}
                    >
                      <div className={`text-sm font-mono break-all leading-relaxed flex items-center gap-2 ${copied ? 'text-emerald-400' : 'text-slate-300'}`}>
                        <span className="hidden sm:inline">{walletAddress}</span>
                        <span className="sm:hidden">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                        {copied ? (
                          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <CopyIconSVG width={16} height={16} className="text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 sm:hidden">
                        Click to copy full address
                      </div>
                      
                      {/* Full address tooltip on hover - only show on mobile */}
                      <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-[#0B0F13] border border-slate-600/20 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 sm:hidden">
                        <div className="text-xs text-slate-200 font-mono break-all">
                          {walletAddress}
                        </div>
                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Coins Lists Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Created Coins Section */}
          {createdCoins.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Coins Launched</h2>
              <ProfileList items={createdCoins} />
            </div>
          )}

          {/* Coins Held Section */}
          {isLoadingHeldCoins ? (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Coins Held</h2>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : heldCoins.length > 0 ? (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Coins Held</h2>
              <HeldCoinsList items={heldCoins} />
            </div>
          ) : null}
        </motion.div>
      </motion.div>

      {/* Modal Flows */}
      {showSendFlow && (
        <SendFlow
          onClose={() => setShowSendFlow(false)}
          heldCoins={heldCoins}
          initialData={{
            usdValue: `~$${solPrice ? ((isOwner && viewer?.walletBalance !== null ? viewer.walletBalance : walletBalance) * solPrice).toFixed(2) : '0'}`,
          }}
        />
      )}

      {showReceiveFlow && (
        <ReceiveFlow
          walletAddress={viewer?.publicKey?.toBase58() ?? "N/A"}
          onClose={() => setShowReceiveFlow(false)}
        />
      )}

      {showPrivateKeyFlow && (
        <PrivateKeyFlow
          privateKey=""
          onClose={() => setShowPrivateKeyFlow(false)}
        />
      )}
    </Page>
  );
}

function Stat({ label, value, valueClassName }: { label: string; value: string | number; valueClassName?: string }) {
  return (
    <motion.div 
      className="border border-slate-600/20 rounded-xl p-4 bg-[#0B0F13]"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={cn("text-lg font-semibold", valueClassName || "text-white")}>{value}</div>
    </motion.div>
  );
}

function ProfileTokenCard({ coin, index }: { 
  coin: { 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    isGraduated: boolean;
    mcap?: number; // Added mcap to the type
  }; 
  index: number;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // Use basic coin data - frontend queries will handle Jupiter data
  const tokenName = coin.coinName;
  const tokenSymbol = coin.coinSymbol;
  const tokenId = coin.coinAddress;

  // Use useTokenInfo to get the token icon and other data
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
      onClick={() => {
        if (tokenData) {
          if (isMobile) {
            // On mobile, navigate directly to the token page
            router.push(`/coin/${tokenId}`);
          } else {
            // On desktop, set the selected pool and navigate to home page
            router.push(`/coin/${tokenId}`);
          }
        }
      }}
      className="relative flex items-center cursor-pointer px-2 text-xs h-[80px] w-full hover:bg-slate-600/30"
    >
      {/* Left Column: Token Icon (full height) */}
      <div className="flex items-center justify-center mr-3 relative w-16 h-16 flex-shrink-0">
        <TokenLogo
          src={tokenData?.baseAsset?.icon}
          alt={tokenSymbol}
          size="lg"
          className="rounded-md"
        />
        {/* Launchpad icon overlay */}
        {tokenData?.baseAsset?.launchpad === 'launchpad.fun' && (
          <div className="absolute -bottom-1 -right-1 bg-[#0B0F13]/80 border border-slate-600/40 rounded-full p-0.5 z-10 transition-all duration-200 shadow-lg backdrop-blur-2xl">
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="launchpad"
              className="w-[10px] h-[10px]"
            />
          </div>
        )}
      </div>

      {/* Center Column: Content (two rows) */}
      <div className="flex-1 flex flex-col min-w-0 mr-2">
        {/* Row 1: Metrics */}
        <div className="flex items-center gap-4 mb-2">
          <TokenCardAgeMetric createdAt={tokenData?.baseAsset?.firstPool?.createdAt} />
          <TokenCardVolumeMetric
            buyVolume={tokenData?.baseAsset?.stats24h?.buyVolume}
            sellVolume={tokenData?.baseAsset?.stats24h?.sellVolume}
          />
          <TokenCardMcapMetric mcap={tokenData?.baseAsset?.mcap} />
        </div>

        {/* Row 2: Name/Ticker and Graduated Badge - constrained to not overflow metrics */}
        <div className="flex items-center min-w-0 gap-2">
          <div className="flex flex-col min-w-0 overflow-hidden">
            <TokenNameSymbol 
              name={tokenName}
              symbol={tokenSymbol}
              size="md"
            />
          </div>
          {/* Graduated badge inline with name/symbol */}
          {coin.isGraduated && (
            <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex-shrink-0">
              <span className="text-xs text-green-400 font-medium">Graduated</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Divider below each card */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-600/30" />
    </motion.div>
  );
}

function ProfileList({ items }: { items: Array<{ coinName: string; coinSymbol: string; coinAddress: string; isGraduated: boolean; mcap?: number }> }) {
  if (!items) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <span className="inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((coin, index) => (
        <ProfileTokenCard key={coin.coinAddress} coin={coin} index={index} />
      ))}
    </div>
  );
}

function HeldCoinsList({ items }: { items: Array<{ coinName: string; coinSymbol: string; coinAddress: string; balance: number; mcap?: number; usdValue?: number }> }) {
  if (!items) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <span className="inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((coin, index) => (
        <HeldTokenCard key={coin.coinAddress} coin={coin} index={index} />
      ))}
    </div>
  );
}

function HeldTokenCard({ coin, index }: { 
  coin: { 
    coinName: string; 
    coinSymbol: string; 
    coinAddress: string; 
    balance: number;
    mcap?: number;
    usdValue?: number;
  }; 
  index: number;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const tokenName = coin.coinName;
  const tokenSymbol = coin.coinSymbol;
  const tokenId = coin.coinAddress;

  // Use useTokenInfo to get the token icon and other data
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
      onClick={() => {
        if (tokenData) {
          if (isMobile) {
            // On mobile, navigate directly to the token page
            router.push(`/coin/${tokenId}`);
          } else {
            // On desktop, set the selected pool and navigate to home page
            router.push(`/coin/${tokenId}`);
          }
        }
      }}
      className="relative flex items-center cursor-pointer px-2 text-xs h-[80px] w-full hover:bg-slate-600/30"
    >
      {/* Left Column: Token Icon (full height) */}
      <div className="flex items-center justify-center mr-3 relative w-16 h-16 flex-shrink-0">
        <TokenLogo
          src={tokenData?.baseAsset?.icon}
          alt={tokenSymbol}
          size="lg"
          className="rounded-md"
        />
        {/* Launchpad icon overlay */}
        {tokenData?.baseAsset?.launchpad === 'launchpad.fun' && (
          <div className="absolute -bottom-1 -right-1 bg-[#0B0F13]/80 border border-slate-600/40 rounded-full p-0.5 z-10 transition-all duration-200 shadow-lg backdrop-blur-2xl">
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="launchpad"
              className="w-[10px] h-[10px]"
            />
          </div>
        )}
      </div>

      {/* Center Column: Content (two rows) */}
      <div className="flex-1 flex flex-col min-w-0 mr-2">
        {/* Row 1: Metrics */}
        <div className="flex items-center gap-4 mb-2">
          <TokenCardAgeMetric createdAt={tokenData?.baseAsset?.firstPool?.createdAt} />
          <TokenCardVolumeMetric
            buyVolume={tokenData?.baseAsset?.stats24h?.buyVolume}
            sellVolume={tokenData?.baseAsset?.stats24h?.sellVolume}
          />
          <TokenCardMcapMetric mcap={tokenData?.baseAsset?.mcap} />
        </div>

        {/* Row 2: Name/Ticker and Balance */}
        <div className="flex items-center justify-between min-w-0">
          <div className="flex flex-col min-w-0 overflow-hidden">
            <TokenNameSymbol 
              name={tokenName}
              symbol={tokenSymbol}
              size="md"
            />
          </div>
          <div className="flex flex-col items-end ml-2">
            <div className="text-xs text-slate-400">Balance</div>
            <div className="text-sm font-semibold text-emerald-400">
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
      
      {/* Divider below each card */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-600/30" />
    </motion.div>
  );
}


