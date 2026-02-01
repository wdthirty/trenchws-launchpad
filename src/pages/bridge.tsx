import React from 'react';
import { NextPage, GetServerSideProps } from 'next';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { LiFiSwapWidget } from '@/components/LiFiWidget';
import { PillButton } from '@/components/ui/PillButton';
import { TruncatedAddress } from '@/components/TruncatedAddress/TruncatedAddress';
import { useUser } from '@/contexts/UserProvider';
import { toast } from 'sonner';
import Page from '@/components/ui/Page/Page';
import LogoBackground from '@/components/LogoBackground';

interface BridgePageProps {
  referrerToken: {
    address: string;
    symbol: string;
    name: string;
  } | null;
}

const BridgePage: NextPage<BridgePageProps> = ({ referrerToken }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const user = useUser();

  const handleCopyAddress = (address: string, label: string) => {
    navigator.clipboard.writeText(address);
    toast.success(`${label} copied to clipboard`);
  };

  // Check if left column has content
  const hasLeftColumnContent = referrerToken || user?.publicKey;

  return (
    <>
      <Head>
        <title>Cross-Chain Bridge - launchpad.fun</title>
        <meta name="description" content="Bridge tokens across multiple blockchains with the best rates on launchpad.fun" />
        
        <meta property="og:title" content="Cross-Chain Bridge - launchpad.fun" />
        <meta property="og:description" content="Bridge tokens across multiple blockchains with the best rates on launchpad.fun" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${baseUrl}/bridge`} />
        <meta property="og:image" content={`${baseUrl}/api/og/bridge/opengraph`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Cross-Chain Bridge - launchpad.fun" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cross-Chain Bridge - launchpad.fun" />
        <meta name="twitter:description" content="Bridge tokens across multiple blockchains with the best rates on launchpad.fun" />
        <meta name="twitter:image" content={`${baseUrl}/api/og/bridge/twitter`} />
        <meta name="twitter:image:alt" content="Cross-Chain Bridge - launchpad.fun" />
      </Head>
      
      <Page scrollable={true}>
        <LogoBackground />
        <div className="min-h-screen">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3 pt-12 sm:space-y-4 mb-6"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Cross-Chain Bridge</h1>
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
              Bridge from any chain to any coin
            </p>
            <p className="text-xs">
              Powered by <a href="https://x.com/lifiprotocol" target="_blank" rel="noopener noreferrer" className="text-pink-300">LI.FI</a>
            </p>
          </motion.div>

          {/* Main Content - Two Column Layout on Desktop */}
          <div className="w-fit mx-auto pb-24">
            <div className={`grid gap-2 justify-center ${hasLeftColumnContent ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Left Column - Context Sections (Desktop) / Full Width (Mobile) */}
              {hasLeftColumnContent && (
                <div className="space-y-4 w-full flex flex-col justify-start items-center md:items-end px-6"> 
                {/* Referrer Token Section */}
                {referrerToken && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="backdrop-blur-sm rounded-xl p-4 sm:p-6 w-full sm:w-[325px] border border-slate-600/30"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-semibold text-white mb-2">Coin to Bridge</h3>
                        <p className="text-slate-300 text-sm mb-3">
                          {referrerToken.name} ({referrerToken.symbol})
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          <TruncatedAddress address={referrerToken.address} />
                        </div>
                      </div>
                      <PillButton
                        onClick={() => handleCopyAddress(referrerToken.address, 'Token address')}
                        theme="ghost"
                        size="sm"
                        className="w-full lg:w-auto"
                      >
                        <span className="iconify ph--copy-bold text-xs mr-1" />
                        Copy CA
                      </PillButton>
                    </div>
                  </motion.div>
                )}

                {/* User Address Section */}
                {user?.publicKey && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: referrerToken ? 0.3 : 0.2 }}
                    className="backdrop-blur-sm rounded-xl p-4 sm:p-6 w-full sm:w-[325px] border border-slate-600/30"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-semibold text-white mb-2">Your Solana Address</h3>
                        <p className="text-slate-300 text-sm mb-3">
                          Destination wallet for below
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          <TruncatedAddress address={user.publicKey.toBase58()} />
                        </div>
                      </div>
                      <PillButton
                        onClick={() => handleCopyAddress(user.publicKey.toBase58(), 'Wallet address')}
                        theme="ghost"
                        size="sm"
                        className="w-full lg:w-auto"
                      >
                        <span className="iconify ph--copy-bold text-xs mr-1" />
                        Copy Address
                      </PillButton>
                    </div>
                  </motion.div>
                )}
                </div>
              )}

              {/* Widget Column - Takes full width when no left column content */}
              <div className="w-full">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: referrerToken || user?.publicKey ? 0.4 : 0.2 }}
                  className="backdrop-blur-sm rounded-xl border border-slate-600/30"
                >
                  <LiFiSwapWidget className="w-full" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </Page>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<BridgePageProps> = async (context) => {
  const { from_token, token_symbol, token_name } = context.query;

  let referrerToken = null;
  
  if (from_token && token_symbol && token_name) {
    referrerToken = {
      address: from_token as string,
      symbol: token_symbol as string,
      name: token_name as string,
    };
  }

  return {
    props: {
      referrerToken,
    },
  };
};

export default BridgePage;