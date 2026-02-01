import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'sonner';
import { useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from "@vercel/analytics/next"
import { PrivyProvider } from '@privy-io/react-auth';
import { AnimatePresence } from 'framer-motion';
import { cacheWarmupService } from '@/lib/services/cache-warmup.service';
import { scheduledCacheRefreshService } from '@/lib/services/scheduled-cache-refresh.service';

import { UserProvider } from '@/contexts/UserProvider';
import { DataStreamProvider } from '@/contexts/DataStreamProvider';
import { ExploreProvider } from '@/contexts/ExploreProvider';
import { TradeFormProvider } from '@/contexts/TradeFormProvider';
import { LaunchpadFilterProvider } from '@/contexts/LaunchpadFilterProvider';
import { SwapFeesProvider } from '@/contexts/SwapFeesProvider';
import { SolPriceProvider } from '@/contexts/SolPriceProvider';
import { TradeFormDialog } from '@/components/TradeForm/TradeFormDialog';
import { Footer } from '@/components/Footer/Footer';
import Head from 'next/head';
import { LaunchpadFilterDialog } from '@/components/LaunchpadFilter/LaunchpadFilterDialog';
import { AuthOverlay } from '@/components/AuthOverlay';
import { FirstTimeUserFlow } from '@/components/FirstTimeUserFlow';
import { useUser } from '@/contexts/UserProvider';
import { ReactNode } from 'react';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// Wrapper component to handle authentication overlay and first time user flow
const AuthOverlayWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticating, showFirstTimeFlow, setShowFirstTimeFlow, publicKey } = useUser();
  
  const handleFirstTimeFlowClose = () => {
    setShowFirstTimeFlow(false);
  };
  
  return (
    <div key="auth-overlay-wrapper">
      <AuthOverlay isVisible={isAuthenticating} />
      {showFirstTimeFlow && publicKey && (
        <FirstTimeUserFlow 
          walletAddress={publicKey.toBase58()} 
          onClose={handleFirstTimeFlowClose} 
        />
      )}
      {children}
    </div>
  );
};

export default function App({ Component, pageProps, router }: AppProps) {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
        retry: (failureCount, error: any) => {
          // Don't retry 404 errors
          if (error?.response?.status === 404) {
            return false;
          }
          // Retry other errors up to 2 times
          return failureCount < 2;
        },
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: false, // Don't refetch on reconnect
      },
    },
  }), []);

  // Warm up caches and start scheduled refresh on app initialization
  useEffect(() => {
    // Only warm up caches on the client side and not on login page
    if (typeof window !== 'undefined' && router.pathname !== '/login') {
      cacheWarmupService.warmupAllCaches().catch((error) => {
        console.error('Cache warmup failed:', error);
      });

      // Start scheduled cache refresh service
      scheduledCacheRefreshService.start();
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        scheduledCacheRefreshService.stop();
      }
    };
  }, [router.pathname]);

  // Add global error handler for image loading errors
  useMemo(() => {
    if (typeof window !== 'undefined') {
      // Override console.error to suppress rapidlaunch.io and ipfs.io errors
      const originalError = console.error;
      console.error = (...args) => {
        const message = args.join(' ');
        if ((message.includes('rapidlaunch.io') || message.includes('ipfs.io')) && (message.includes('404') || message.includes('410') || message.includes('failed to load'))) {
          console.debug('Suppressed error for external image:', message);
          return;
        }
        originalError.apply(console, args);
      };

      // Also override console.warn for Next.js Image optimization warnings
      const originalWarn = console.warn;
      console.warn = (...args) => {
        const message = args.join(' ');
        if ((message.includes('rapidlaunch.io') || message.includes('ipfs.io')) && (message.includes('404') || message.includes('410') || message.includes('failed to load'))) {
          console.debug('Suppressed warning for external image:', message);
          return;
        }
        originalWarn.apply(console, args);
      };

      // Add error event listener to window
      window.addEventListener('error', (event) => {
        if (event.target && (event.target as any).src && ((event.target as any).src.includes('rapidlaunch.io') || (event.target as any).src.includes('ipfs.io'))) {
          event.preventDefault();
          console.debug('Suppressed window error for external image:', (event.target as any).src);
        }
      }, true);

      // Add unhandledrejection listener for promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const message = event.reason?.message || event.reason?.toString() || '';
        if ((message.includes('rapidlaunch.io') || message.includes('ipfs.io')) && (message.includes('404') || message.includes('410'))) {
          event.preventDefault();
          console.debug('Suppressed unhandled rejection for external image:', message);
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Analytics />
      <PrivyProvider
        appId="appId"
        clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || "client-id"}
        config={{
          solanaClusters: [{name: 'mainnet-beta', rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=[API_KEY]'}],
          appearance: {
            logo: 'https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora',
            theme: 'dark',
            walletChainType: 'solana-only',
            walletList: ['phantom', 'solflare'],
          },
          embeddedWallets: {
            showWalletUIs: true,
            solana: {
              createOnLogin: 'users-without-wallets'
            }
          },
          loginMethods: ['wallet'],
          externalWallets: {
            solana: {connectors: toSolanaWalletConnectors()}
          }
        }}
      >
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(11, 15, 19, 0.5)',  // Match PillButton ghost background
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '9999px',            // Match PillButton rounded-full
                borderColor: 'rgba(71, 85, 105, 0.3)', // Match PillButton border-slate-600/30
                color: '#ffffff',                  // Match PillButton text-white
                padding: '0.7rem 1rem',           // Match PillButton md size
                fontSize: '0.875rem',             // text-sm
                fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Match PillButton shadow-lg
                backdropFilter: 'blur(8px)',      // Match PillButton backdrop-blur-sm
                transition: 'all 0.2s ease-in-out', // Match PillButton transition
                width: 'fit-content',             // Fit content width without extra whitespace
                maxWidth: 'calc(100vw - 2rem)',   // Prevent overflow on small screens
                whiteSpace: 'nowrap',             // Disable text wrapping
                // Force centering
                position: 'fixed',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '2rem',
                margin: '0',
              },
              className: 'toast-pill-button',
            }}
          />
          <div className={`${inter.className} ${inter.variable} ${jetbrainsMono.variable} bg-[#0B0F13] min-h-screen`}>
            <Head>
              <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
            </Head>
            <UserProvider>
              <AuthOverlayWrapper>
                {router.pathname === '/login' ? (
                  // Only render the login page without other providers
                  <Component key={router.route} {...pageProps} />
                ) : (
                  // Render full app with all providers
                  <SolPriceProvider>
                    <SwapFeesProvider>
                      <LaunchpadFilterProvider>
                        <DataStreamProvider>
                          <ExploreProvider>
                            <TradeFormProvider>
                              {/* <LogoBackground /> */}
                              <Component key={router.route} {...pageProps} />
                              <TradeFormDialog />
                              <LaunchpadFilterDialog />
                            </TradeFormProvider>
                          </ExploreProvider>
                        </DataStreamProvider>
                      </LaunchpadFilterProvider>
                    </SwapFeesProvider>
                    <Footer/>
                  </SolPriceProvider>
                )}
              </AuthOverlayWrapper>
            </UserProvider>
          </div>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
