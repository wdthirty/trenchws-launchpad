import { useQuery } from '@tanstack/react-query';
import { UserInfo } from '@/lib/utils/profile-url';

export type { UserInfo };

export interface TransferStatus {
  currentOwner: UserInfo | null;
  previousOwner: UserInfo | null;
  status: 'CTO' | 'Acquired';
  transferredAt?: string;
}

export interface TokenCreatorInfo {
  creator?: UserInfo;
  taggedUser?: UserInfo;
  transferStatus?: TransferStatus;
  totalRaised: string;
  isDexPaid: boolean;
  boosts?: number;
  category?: string;
}

// Function to check if token has DEX paid and get boosts via DEX Screener API
async function checkDexPaidAndBoosts(tokenAddress: string): Promise<{ isDexPaid: boolean; boosts?: number }> {
  try {
    const url = `https://api.dexscreener.com/tokens/v1/solana/${tokenAddress}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return { isDexPaid: false };
    }
    
    const data = await response.json();
    
    // Check if we have any pairs data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { isDexPaid: false };
    }
    
    // Get the first pair (most relevant)
    const firstPair = data[0];
    
    // Check if DEX is paid by looking for "info" field
    const isDexPaid = !!firstPair.info;
    
    // Get boosts if available
    const boosts = firstPair.boosts?.active;
    
    return { isDexPaid, boosts };
  } catch (error) {
    console.error(`❌ Error checking DEX paid for ${tokenAddress}:`, error);
    return { isDexPaid: false };
  }
}

export const useTokenCreatorInfo = (tokenId?: string) => {
  return useQuery({
    queryKey: ['tokenCreatorInfo', tokenId],
    queryFn: async (): Promise<TokenCreatorInfo> => {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }
      
      // Fetch basic creator info from our API
      const response = await fetch(`/api/token/${tokenId}/creator-info`);
      if (!response.ok) {
        throw new Error('Failed to fetch token creator info');
      }
      
      const creatorInfo = await response.json();
      
      // Check DEX paid status and boosts on client-side to avoid rate limits
      try {
        const { isDexPaid, boosts } = await checkDexPaidAndBoosts(tokenId);
        return {
          ...creatorInfo,
          isDexPaid,
          boosts
        };
      } catch (dexError) {
        console.warn('⚠️ Failed to check DEX paid status:', dexError);
        // Return creator info without DEX paid status if it fails
        return {
          ...creatorInfo,
          isDexPaid: false
        };
      }
    },
    enabled: !!tokenId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if it's a DEX API rate limit error
      if (error.message?.includes('DEX Screener API error') && error.message?.includes('429')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
