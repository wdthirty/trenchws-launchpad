import { useCallback, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { SwapClient, SwapFees } from '@/lib/swap/SwapClient';

// Global SwapClient instance
let swapClientInstance: SwapClient | null = null;

const getSwapClient = (): SwapClient => {
  if (!swapClientInstance) {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      throw new Error('NEXT_PUBLIC_RPC_URL environment variable is required');
    }
    swapClientInstance = new SwapClient(rpcUrl);
  }
  return swapClientInstance;
};

export const useSwapClient = () => {
  const { user, authenticated } = usePrivy();
  const { wallets, ready } = useSolanaWallets();
  
  
  // Clear swap client cache when user changes
  const swapClient = useMemo(() => {
    const client = getSwapClient();
    // Clear cache when user changes to ensure fresh state
    client.clearQuoteCache();
    return client;
  }, [user?.id, authenticated]);

  const signTransactionWithPrivy = useCallback(async (transaction: any) => {
    if (!user || !authenticated) {
      throw new Error('User must be authenticated to sign transactions');
    }

    if (!wallets || wallets.length === 0) {
      throw new Error('No Solana wallets available');
    }

    // Find the wallet that matches the current user's wallet address
    const userWalletAddress = user?.wallet?.address;
    const wallet = wallets.find(w => w.address === userWalletAddress) || wallets[0];
    

    try {
      // Use the wallet's signTransaction method directly
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // Ensure we return a VersionedTransaction
      if ('version' in signedTransaction) {
        return signedTransaction as any; // VersionedTransaction
      } else {
        throw new Error('Expected VersionedTransaction but got legacy Transaction');
      }
    } catch (error) {
      console.error('Transaction signing failed:', error);
      throw new Error('Failed to sign transaction');
    }
  }, [user, authenticated, wallets]);

  const executeSwap = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: string,
    slippage: number = 50,
    fees: SwapFees,
    isLaunchpadToken: boolean = false,
    tokenSymbol?: string
  ) => {
    if (!wallets || wallets.length === 0) {
      throw new Error('No Solana wallets available');
    }

    // Find the wallet that matches the current user's wallet address
    const userWalletAddress = user?.wallet?.address;
    const wallet = wallets.find(w => w.address === userWalletAddress) || wallets[0];
    
    const result = await swapClient.executeSwap(
      inputMint,
      outputMint,
      amount,
      slippage,
      fees,
      wallet.address,
      signTransactionWithPrivy,
      isLaunchpadToken
    );

    // Update token symbol if provided
    if (tokenSymbol && result.tokenAmount) {
      result.tokenSymbol = tokenSymbol;
    }

    return result;
  }, [swapClient, wallets, signTransactionWithPrivy]);

  const getQuote = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: string,
    slippage: number = 50
  ) => {
    if (!wallets || wallets.length === 0) {
      throw new Error('No Solana wallets available');
    }
    
    // Find the wallet that matches the current user's wallet address
    const userWalletAddress = user?.wallet?.address;
    const wallet = wallets.find(w => w.address === userWalletAddress) || wallets[0];
    
    return await swapClient.getQuote(inputMint, outputMint, amount, slippage, wallet.address);
  }, [swapClient, wallets, user?.wallet?.address]);



  return {
    swapClient,
    executeSwap,
    getQuote,
    clearQuoteCache: () => swapClient.clearQuoteCache(),
    isAuthenticated: authenticated && wallets && wallets.length > 0,
    userAddress: wallets && wallets.length > 0 ? wallets[0].address : null,
  };
};
