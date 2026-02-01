import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { usePrivy, useLoginWithOAuth } from '@privy-io/react-auth';
import { useUser } from '@/contexts/UserProvider';
import TopNavigationBar from '@/components/TopNavigationBar';
import PillButton from '@/components/ui/PillButton';

const LoginPage = () => {
  const router = useRouter();
  const { isAuthenticating } = useUser();
  const { login } = usePrivy();
  const { authenticated, ready } = usePrivy();

  // OAuth login hook for Twitter/X authentication
  const { initOAuth } = useLoginWithOAuth({
    onComplete: ({ user, isNewUser, wasAlreadyAuthenticated, loginMethod }) => {
      console.log('🔑 ✅ User successfully logged in with OAuth', {
        user,
        isNewUser,
        wasAlreadyAuthenticated,
        loginMethod,
      });
    },
    onError: (error) => {
      console.error('OAuth login error:', error);
      setIsLoading(null);
    },
  });

  // Check if we have OAuth callback parameters
  const hasOAuthParams = router.query.privy_oauth_code || router.query.privy_oauth_state || router.query.privy_oauth_provider;
  const isOAuthError = router.query.privy_oauth_code === 'error';


  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Redirect to main page immediately when user is authenticated
  useEffect(() => {
    if (ready && authenticated && typeof window !== 'undefined') {
      console.log('🔑 Login page: User authenticated, redirecting immediately...');
      router.replace('/');
    }
  }, [ready, authenticated, router]);


  const handleOAuthLogin = async (provider: 'twitter') => {
    setIsLoading(provider);
    try {
      // Use Privy's initOAuth method for direct OAuth authentication
      await initOAuth({ provider });
    } catch (error) {
      console.error(`${provider} OAuth login error:`, error);
      setIsLoading(null);
    }
  };

  const handleWalletLogin = async (provider: string) => {
    setIsLoading(provider);
    try {
      // Use Privy's login method for wallet authentication (opens modal)
      await login();
      
      // Check if user is still not authenticated after login resolves
      // This handles the case where user cancels the modal
      if (!authenticated) {
        setIsLoading(null);
      }
    } catch (error) {
      console.error(`${provider} wallet login error:`, error);
      setIsLoading(null);
    }
  };

  return (
    <>
      <Head>
        <title>Login | launchpad.fun</title>
        <meta name="description" content="Welcome to launchpad.fun - Log in to continue" />
      </Head>
      
      <TopNavigationBar />
      
      <div className="h-full bg-[#0B0F13] flex items-center justify-center p-4 pt-40">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20">
              <img 
                src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
                alt="launchpad.fun logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to launchpad.fun
            </h1>
            <p className="text-gray-400 text-sm">
              Log in below to begin your journey
            </p>
          </div>

          {/* Show loading state when authenticating or OAuth callback */}
          {isAuthenticating || (hasOAuthParams && !isOAuthError) ? (
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">
                {hasOAuthParams && !isOAuthError ? 'Processing authentication...' : 'Completing authentication...'}
              </p>
            </div>
          ) : (
            <div>
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-300">
                <div>Ready: {ready ? '✅' : '❌'}</div>
                <div>Authenticated: {authenticated ? '✅' : '❌'}</div>
              </div>
            )}

            {/* Login Buttons */}
            <div className="space-y-4">
            {/* X (Twitter) Login */}
            <PillButton
              onClick={() => handleOAuthLogin('twitter')}
              disabled={isLoading === 'twitter' || isAuthenticating}
              size="lg"
              className="w-full"
            >
              {isLoading === 'twitter' ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>Continue with X</span>
                </div>
              )}
            </PillButton>

            {/* Wallet Login */}
            <PillButton
              onClick={() => handleWalletLogin('wallet')}
              disabled={isLoading === 'wallet' || isAuthenticating}
              size="lg"
              className="w-full"
            >
              {isLoading === 'wallet' ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="iconify ph--wallet-bold text-white text-lg" />
                  <span>Continue with a wallet</span>
                </div>
              )}
            </PillButton>
          </div>
          </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-xs">
              By continuing, you agree to our{' '}
              <a 
                href="/tos" 
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms
              </a>
              {' '}and{' '}
              <a 
                href="/privacy" 
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default LoginPage;
