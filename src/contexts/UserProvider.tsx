import { PublicKey } from '@solana/web3.js';
import React, { createContext, useContext, useCallback, ReactNode, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useLogin } from '@privy-io/react-auth';
import { useSessionSigners } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { initializeAuthInterceptor } from '@/lib/auth/authInterceptor';

// Types
type User = {
  // Server user fields (matching backend)
  privyUserId: string | null;
  privyWalletId: string | null;
  privyWalletAddress: string | null;
  
  // Twitter fields (optional for wallet-only users)
  twitterId?: string;
  twitterUsername?: string;
  twitterDisplayName?: string;
  twitterImageUrl?: string;
  
  // Wallet-specific fields
  walletDisplayName?: string; // First 6 chars of wallet address
  isWalletOnly: boolean;
  walletType?: 'embedded' | 'external'; // Type of wallet connected
  
  // Stats
  coinsCreated: number;
  coinsGraduated: number;
  
  // Frontend-specific fields
  publicKey: PublicKey | null; // Solana public key (wallet address)
  walletBalance: number | null;
  tokenBalances: Record<string, { uiAmount: number; amount: string; decimals: number }>;
  
  // Computed properties for backward compatibility
  username?: string; // Twitter username or wallet address for routing
  displayName?: string; // Twitter display name or wallet display name
  displayIcon?: string; // Twitter image or wallet fallback image
};

type UserContextType = User & {
  refreshBalances: () => Promise<void>;
  getTokenBalance: (mint: string) => { uiAmount: number; amount: string; decimals: number } | null;
  login: () => void;
  logout: () => Promise<void>;
  isAuthenticating: boolean;
  showFirstTimeFlow: boolean;
  setShowFirstTimeFlow: (show: boolean) => void;
};

// Context setup
const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

const fetchBalances = async (publicKey: PublicKey): Promise<{
  solBalance: number;
  tokenBalances: Record<string, { uiAmount: number; amount: string; decimals: number }>;
}> => {
  const res = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${publicKey.toBase58()}`);
  const obj = await res.json();
  
  const solBalance = obj.SOL?.uiAmount ?? 0;
  const tokenBalances: Record<string, { uiAmount: number; amount: string; decimals: number }> = {};
  
  // Process all non-SOL tokens
  Object.entries(obj).forEach(([mint, balanceData]: [string, any]) => {
    if (mint !== 'SOL' && balanceData) {
      tokenBalances[mint] = {
        uiAmount: balanceData.uiAmount ?? 0,
        amount: balanceData.amount ?? '0',
        decimals: balanceData.decimals ?? 6,
      };
    }
  });
  
  return { solBalance, tokenBalances };
};

// Main component
type UserProviderProps = {
  children: ReactNode;
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { user: privyUser, authenticated, ready, logout: privyLogout } = usePrivy();
  const { addSessionSigners } = useSessionSigners();
  const { wallets: solanaWallets } = useSolanaWallets();

  const router = useRouter();
  
  // Balance state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [tokenBalances, setTokenBalances] = useState<Record<string, { uiAmount: number; amount: string; decimals: number }>>({});
  
  // Authentication state
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // First time user flow state
  const [showFirstTimeFlow, setShowFirstTimeFlow] = useState(false);

  // Handle login with backend using Privy user ID
  const handleLogin = async (privyUserId: string) => {
    try {
      // Use regular fetch for login since auth interceptor isn't initialized yet
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ privyUserId }),
      });

      if (!response.ok) {
        // Check for specific error messages
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403 && errorData.error === 'Early Access Ended') {
          console.warn('🚫 Twitter sign-ups disabled');
          toast.error(errorData.message || 'Early Access Ended, Please wait for v2');
          throw new Error('Twitter sign-ups disabled');
        }
        
        // Check for other auth errors during login
        if (response.status === 401 || response.status === 403) {
          console.warn('🔐 Authentication failed during login');
          toast.error('Authentication failed. Please try again.');
          throw new Error('Authentication failed');
        }
        throw new Error(`Login API error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      toast.error('Failed to sync user data');
      throw error; // Re-throw to be handled by the caller
    }
    // Don't hide overlay here - let the onComplete handler manage it
  };

  // Privy login hook
  const { login } = useLogin({
    onComplete: async ({ user, isNewUser }) => {
      // Show overlay only for new users or users logging in from login page
      const isOnLoginPage = router.pathname === '/login';
      const shouldShowOverlay = isNewUser || isOnLoginPage;
      
      if (shouldShowOverlay) {
        setIsAuthenticating(true);
      }
      
      try {
        // Only add session signers for embedded wallets (not external wallets)
        if (isNewUser && user.wallet?.walletClientType === 'privy') {
          addSessionSigners({
            address: user.wallet.address,
            signers: [{
              signerId: 'jjd2s46pvdcw4edqitei1z3y'
            }]
          }).catch((error) => {
            console.error('Failed to add session signers:', error);
          });
        };
        
        await handleLogin(user.id);
        
        // Show FirstTimeUserFlow only for new users with embedded wallets (not external wallets)
        if (isNewUser && user.wallet?.walletClientType === 'privy') {
          setShowFirstTimeFlow(true);
        }
      } catch (error) {
        console.error('Authentication completion error:', error);
        
        // Handle Twitter sign-ups disabled error
        if (error && typeof error === 'object' && error !== null) {
          const errorObj = error as any;
          if (errorObj.message === 'Twitter sign-ups disabled') {
            // Force logout to clear any partial authentication state
            try {
              await privyLogout();
              console.log('✅ Logged out after Twitter rejection');
            } catch (logoutError) {
              console.error('Failed to logout after Twitter rejection:', logoutError);
            }
            // Don't show error toast as it was already shown in handleLogin
          } else {
            toast.error('Authentication failed. Please try again.');
          }
        } else {
          toast.error('Authentication failed. Please try again.');
        }
      } finally {
        // Hide overlay when authentication process is complete
        if (shouldShowOverlay) {
          setIsAuthenticating(false);
        }
      }
    },
    onError: (error) => {
      console.error('Privy login error:', error);
      
      // Handle Twitter sign-ups disabled error
      if (error && typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.message === 'Twitter sign-ups disabled') {
          // Force logout to clear any partial authentication state
          privyLogout().catch((logoutError) => {
            console.error('Failed to logout after Twitter rejection:', logoutError);
          });
        } else {
          // Only show generic error toast when on login page for other errors
          if (router.pathname === '/login') {
            toast.error('Login failed. Please try again.');
          }
        }
      }
      
      setIsAuthenticating(false);
    }
  });

  // Use the original login function without overlay trigger
  const handleLoginWithOverlay = useCallback(() => {
    login();
  }, [login]);

  // Logout function that clears user state and disconnects wallets
  const handleLogout = useCallback(async () => {
    try {
      console.log('🔐 Automatic logout triggered due to authentication error');
      
      // Clear local state first
      setWalletBalance(null);
      setTokenBalances({});
      setIsAuthenticating(false);
      setShowFirstTimeFlow(false);
      
      // Disconnect external wallets if any are connected
      if (solanaWallets && solanaWallets.length > 0) {
        const externalWallets = solanaWallets.filter(wallet => 
          wallet.walletClientType !== 'privy'
        );

        for (const wallet of externalWallets) {
          try {
            await wallet.disconnect();
            console.log('🔌 Disconnected external wallet:', wallet.address);
          } catch (error) {
            console.error('Failed to disconnect wallet:', wallet.address, error);
          }
        }
      }
      
      // Call Privy logout - this should clear authentication state
      try {
        await privyLogout();
        console.log('✅ Privy logout completed');
      } catch (logoutError) {
        console.error('Privy logout error:', logoutError);
        // Continue with redirect even if logout fails
      }
      
      // Small delay to ensure logout is processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirect to login page
      router.push('/login');
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login even if logout fails
      router.push('/login');
    }
  }, [privyLogout, solanaWallets, router]);

  // Show overlay immediately when OAuth callback parameters are detected on login page
  useEffect(() => {
    const hasOAuthParams = router.query.privy_oauth_code || router.query.privy_oauth_state || router.query.privy_oauth_provider;
    const isOAuthError = router.query.privy_oauth_code === 'error';
    const isOnLoginPage = router.pathname === '/login';
    
    // Only show overlay for OAuth callbacks on the login page and when user is not already authenticated
    if (hasOAuthParams && !isOAuthError && !isAuthenticating && isOnLoginPage && !authenticated) {
      setIsAuthenticating(true);
    }
  }, [router.query, router.pathname, isAuthenticating, authenticated]);

  // Initialize auth interceptor when component mounts
  useEffect(() => {
    initializeAuthInterceptor({
      onAuthError: handleLogout,
      showErrorMessage: true,
      errorMessage: 'Your session has expired. Logging out...',
    });
  }, [handleLogout]);

  // Handle external wallet authentication
  useEffect(() => {
    if (!ready || !solanaWallets.length) return;

    // Check if we have connected external wallets that need authentication
    const unauthenticatedWallets = solanaWallets.filter(wallet => 
      wallet.walletClientType !== 'privy' && // External wallet
      !authenticated // User not authenticated
    );

    if (unauthenticatedWallets.length > 0) {
      // Automatically authenticate the first connected external wallet
      const walletToAuth = unauthenticatedWallets[0];
      console.log('🔗 Auto-authenticating external wallet:', walletToAuth.address);
      
      walletToAuth.loginOrLink().catch((error) => {
        console.error('Failed to authenticate external wallet:', error);
      });
    }
  }, [ready, solanaWallets, authenticated]);

  // Create user object
  const user: User = !ready || !authenticated || !privyUser || !privyUser.wallet || privyUser.wallet.chainType != "solana"
    ? {
        // Server user fields
        privyUserId: null,
        privyWalletId: null,
        privyWalletAddress: null,
        twitterId: undefined,
        twitterUsername: undefined,
        twitterDisplayName: undefined,
        twitterImageUrl: undefined,
        walletDisplayName: undefined,
        isWalletOnly: false,
        walletType: undefined,
        coinsCreated: 0,
        coinsGraduated: 0,
        
        // Frontend-specific fields
        publicKey: null,
        walletBalance: null,
        tokenBalances: {},
        
        // Computed properties for backward compatibility
        username: undefined,
        displayName: undefined,
        displayIcon: undefined,
      }
    : {
        // Server user fields
        privyUserId: privyUser.id,
        privyWalletId: privyUser.wallet?.id || null,
        privyWalletAddress: privyUser.wallet?.address || null,
        twitterId: privyUser.twitter?.subject,
        twitterUsername: privyUser.twitter?.username,
        twitterDisplayName: privyUser.twitter?.name,
        twitterImageUrl: privyUser.twitter?.profilePictureUrl,
        walletDisplayName: privyUser.wallet?.address ? privyUser.wallet.address.slice(0, 6) : undefined,
        isWalletOnly: !privyUser.twitter?.subject && !privyUser.twitter?.username,
        walletType: privyUser.wallet?.walletClientType === 'privy' ? 'embedded' : 'external',
        coinsCreated: 0, // Will be populated from server data
        coinsGraduated: 0, // Will be populated from server data
        
        // Frontend-specific fields
        publicKey: privyUser.wallet?.address ? (() => {
          try {
            return new PublicKey(privyUser.wallet.address);
          } catch (error) {
            console.error('Failed to create PublicKey from wallet address:', privyUser.wallet.address, error);
            return null;
          }
        })() : null,
        walletBalance: walletBalance,
        tokenBalances: tokenBalances,
        
        // Computed properties for backward compatibility
        username: privyUser.twitter?.username || privyUser.wallet?.address,
        displayName: privyUser.twitter?.name || (privyUser.wallet?.address ? privyUser.wallet.address.slice(0, 6) : undefined),
        displayIcon: privyUser.twitter?.profilePictureUrl || 'https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora',
      };

  // Balance management
  const refreshBalances = useCallback(async () => {
    if (!user.publicKey) return;

    try {
      const { solBalance, tokenBalances } = await fetchBalances(user.publicKey);
      setWalletBalance(solBalance);
      setTokenBalances(tokenBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
      toast.error("Error fetching balances");
    }
  }, [user.publicKey?.toBase58()]); // Use string representation for stability

  // Get token balance helper
  const getTokenBalance = useCallback((mint: string) => {
    return tokenBalances[mint] || null;
  }, [tokenBalances]);

  // Auto-refresh balances every 5 seconds when user is authenticated
  useEffect(() => {
    if (!user.publicKey) return undefined;

    // Initial balance fetch
    refreshBalances();

    // Set up 5-second interval
    const interval = setInterval(() => {
      refreshBalances();
    }, 10000);

    // Cleanup interval on unmount or user change
    return () => {
      clearInterval(interval);
    };
  }, [user.publicKey?.toBase58(), refreshBalances]); // Use string representation and include refreshBalances

  // Context value
  const contextValue: UserContextType = {
    ...user,
    refreshBalances,
    getTokenBalance,
    login: handleLoginWithOverlay,
    logout: handleLogout,
    isAuthenticating,
    showFirstTimeFlow,
    setShowFirstTimeFlow,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};