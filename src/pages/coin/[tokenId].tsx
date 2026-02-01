import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Page from '@/components/ui/Page/Page';
import { DataStreamProvider, useDataStream } from '@/contexts/DataStreamProvider';
import { TokenChartProvider } from '@/contexts/TokenChartProvider';
import { useTokenInfo } from '@/hooks/queries';
import { TokenPageMsgHandler } from '@/components/Token/TokenPageMsgHandler';
import { TokenChart } from '@/components/TokenChart/TokenChart';
import { TokenHeader } from '@/components/TokenHeader/TokenHeader';
import { TokenMetrics } from '@/components/TokenHeader/TokenMetrics';
import { TxnsTab } from '@/components/TokenTable/TxnsTab';
import { HoldersTab } from '@/components/TokenTable/HoldersTab';
import { BottomPanelTab, bottomPanelTabAtom } from '@/components/TokenTable/config';
import { TabToggle } from '@/components/TokenTable';
import { useAtom } from 'jotai';
import { useIsMobile } from '@/hooks/useIsMobile';
import { TokenMobileHeader } from '@/components/TokenHeader/TokenMobileHeader';
import { GetServerSideProps } from 'next';
import { useTokenCreatorInfo, TokenCreatorInfo } from '@/hooks/useTokenCreatorInfo';
import { cn } from '@/lib/utils';

interface TokenPageProps {
  serverTokenData: any;
  tokenId: string;
}

// Custom TokenBottomPanel for coin page (matching sidebar)
const CoinPageTokenBottomPanel: React.FC<{ className?: string }> = ({ className }) => {
  const [tab, setTab] = useAtom(bottomPanelTabAtom);
  const [paused, setPaused] = useState<boolean>(false);

  return (
    <div className={cn('flex flex-col h-full overflow-hidden gap-2', className)}>
      <div className="h-[38px] flex items-center justify-center py-1">
        <TabToggle
          activeTab={tab}
          onTabChange={() => setTab(tab === BottomPanelTab.TXNS ? BottomPanelTab.HOLDERS : BottomPanelTab.TXNS)}
          paused={paused}
          onPauseToggle={() => setPaused(!paused)}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === BottomPanelTab.TXNS && (
          <div className="h-full overflow-auto">
            <TxnsTab paused={paused} setPaused={setPaused} />
          </div>
        )}

        {tab === BottomPanelTab.HOLDERS && (
          <div className="h-full overflow-auto">
            <HoldersTab />
          </div>
        )}
      </div>
    </div>
  );
};

export const TokenPageWithContext = ({ serverTokenData, tokenId }: TokenPageProps) => {
  const isMobile = useIsMobile();
  const { data: poolId } = useTokenInfo((d) => d?.id);
  const { data: tokenData } = useTokenInfo();
  const { subscribeTxns, unsubscribeTxns, subscribePools, unsubscribePools } = useDataStream();

  // Use server data as fallback for metadata
  const finalTokenData = tokenData || serverTokenData;
  const tokenAddress = finalTokenData?.baseAsset?.id;

  // Fetch creator info for launchpad.fun tokens or tokens with manual configuration
  const isLaunchpadToken = finalTokenData?.baseAsset?.launchpad === 'launchpad.fun';
  const { data: creatorInfo } = useTokenCreatorInfo(tokenAddress) as { data: TokenCreatorInfo | undefined };

  // Socials dropdown state (mobile only)
  const [isSocialsOpen, setIsSocialsOpen] = useState(false);
  const socialsButtonRef = useRef<HTMLButtonElement>(null);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  const unifiedId = finalTokenData?.baseAsset?.id || poolId || tokenId;

  // Ensure localStorage is always updated when tokenData changes
  useEffect(() => {
    if (finalTokenData && typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedPool', JSON.stringify(finalTokenData));
      } catch (error) {
        console.error('❌ Backup: Failed to update selectedPool in localStorage:', error);
      }
    }
  }, [finalTokenData]);

  // Trigger animation on every mount/reload
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animation props
  const animationProps = {
    initial: { opacity: 0, y: 20 },
    animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { 
      delay: 0.1,
      duration: 0.6,
      ease: "easeOut" as const
    }
  };

  useEffect(() => {
    if (!tokenAddress) return undefined;

    subscribeTxns([tokenAddress]);
    subscribePools([tokenAddress]);

    return () => {
      unsubscribeTxns([tokenAddress]);
      unsubscribePools([tokenAddress]);
    };
  }, [tokenAddress, subscribeTxns, unsubscribeTxns, subscribePools, unsubscribePools]);

  const handleToggleSocials = () => {
    setIsSocialsOpen(prev => !prev);
  };

  return (
    <Page scrollable={true}>
      <Head>
        <title>{finalTokenData?.baseAsset?.symbol || 'Token'} | launchpad.fun</title>
        <meta property="og:title" content={`$${finalTokenData?.baseAsset?.symbol || 'Coin'} | launchpad.fun`} />
        <meta property="og:description" content={`Buy $${finalTokenData?.baseAsset?.symbol || 'Coin'} on launchpad.fun`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/coin/${unifiedId}`} />
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_BASE_URL}/api/og/coin/${unifiedId}/opengraph`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${finalTokenData?.baseAsset?.symbol || 'Coin'}`} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`$${finalTokenData?.baseAsset?.symbol || 'Coin'} | launchpad.fun`} />
        <meta name="twitter:description" content={`Buy $${finalTokenData?.baseAsset?.symbol || 'Coin'} on launchpad.fun`} />
        <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_BASE_URL}/api/og/coin/${unifiedId}/twitter`} />
        <meta name="twitter:image:alt" content={`${finalTokenData?.baseAsset?.symbol || 'Coin'}`} />
      </Head>
      <TokenPageMsgHandler />
      {isMobile ? (
        <motion.div 
          {...animationProps}
          className="flex flex-col tracking-tighter pb-4"
        >
          <motion.div 
            {...animationProps}
            transition={{ ...animationProps.transition, delay: 0.2 }}
            className="flex flex-col gap-4 max-sm:w-full lg:min-w-[400px] bg-[#0B0F13] px-2 pt-2"
          >
            <TokenMobileHeader
              isSocialsOpen={isSocialsOpen}
              onToggleSocials={handleToggleSocials}
              socialsButtonRef={socialsButtonRef}
            />
          </motion.div>
          <motion.div 
            {...animationProps}
            transition={{ ...animationProps.transition, delay: 0.3 }}
            className="w-full bg-[#0B0F13] p-1"
          >
            <div className="flex flex-col h-[450px] w-full">
              <TokenChartProvider>
                <TokenChart />
              </TokenChartProvider>
            </div>
          </motion.div>
          <motion.div 
            {...animationProps}
            transition={{ ...animationProps.transition, delay: 0.4 }}
            className="w-full bg-[#0B0F13] py-1 px-2"
          >
            <div className="h-[500px] relative mt-4">
              <div className="absolute inset-0 overflow-auto">
                <CoinPageTokenBottomPanel className="flex flex-col min-h-full" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div 
          {...animationProps}
          className="flex flex-col h-[calc(100vh-100px)] w-full"
        >
          {/* Rounded rectangle container with transparent background and drop shadow */}
          <div className="shadow-2xl backdrop-blur-sm rounded-md h-full w-full flex flex-col">
            <div className="px-2 w-full h-full flex flex-col">
              {finalTokenData && (
                <div className="flex flex-col h-full">
                  {/* Token Header */}
                  <motion.div
                    {...animationProps}
                    transition={{ ...animationProps.transition, delay: 0.2 }}
                  >
                    <TokenHeader />
                  </motion.div>

                  {/* Chart Section */}
                  <motion.div 
                    {...animationProps}
                    transition={{ ...animationProps.transition, delay: 0.3 }}
                    className="flex-1 min-h-0 h-[calc(100%-100px)] flex"
                  >
                    {/* Left Column: Token Metrics */}
                    <motion.div 
                      {...animationProps}
                      transition={{ ...animationProps.transition, delay: 0.4 }}
                      className="w-[72px] flex flex-col"
                    >
                      <TokenMetrics
                        key={`token-metrics-${tokenAddress}`}
                        tId={tokenAddress}
                        totalRaised={creatorInfo?.totalRaised}
                        taggedUser={creatorInfo?.taggedUser}
                        creator={creatorInfo?.creator}
                        isLaunchpadToken={isLaunchpadToken}
                        className="flex flex-col gap-4 h-full" />
                    </motion.div>

                    {/* Middle Column: Chart */}
                    <motion.div 
                      {...animationProps}
                      transition={{ ...animationProps.transition, delay: 0.5 }}
                      className="flex-1 min-h-0 flex flex-col"
                    >
                      <div className="flex-1 min-h-0">
                        <TokenChartProvider key={tokenAddress}>
                          <TokenChart />
                        </TokenChartProvider>
                      </div>
                    </motion.div>

                    {/* Right Column: Tables */}
                    <motion.div 
                      {...animationProps}
                      transition={{ ...animationProps.transition, delay: 0.6 }}
                      className="w-[360px] flex flex-col gap-4 ml-4"
                    >
                      <div className="w-full overflow-hidden">
                        <CoinPageTokenBottomPanel className="h-full" />
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </Page>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { tokenId } = context.params || {};
  
  if (!tokenId || Array.isArray(tokenId)) {
    return {
      notFound: true,
    };
  }

  try {
    // Fetch token data server-side for metadata
    const res = await fetch(
      `https://datapi.jup.ag/v1/pools?assetIds=${encodeURIComponent(tokenId)}`,
      { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'launchpad.fun/1.0'
        },
        cache: 'no-store'
      }
    );
    
    let serverTokenData = null;
    if (res.ok) {
      const data = await res.json();
      serverTokenData = Array.isArray(data?.pools) ? data.pools[0] : null;
    }

    return {
      props: {
        serverTokenData,
        tokenId,
      },
    };
  } catch (error) {
    console.error('Error fetching token data:', error);
    return {
      props: {
        serverTokenData: null,
        tokenId,
      },
    };
  }
};

export default function TokenPage({ serverTokenData, tokenId }: TokenPageProps) {
  return (
    <DataStreamProvider>
      <TokenPageWithContext serverTokenData={serverTokenData} tokenId={tokenId} />
    </DataStreamProvider>
  );
}