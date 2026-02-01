import { useQuery } from '@tanstack/react-query';
import ky from 'ky';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

export interface TokenDescriptionResponse {
  description: string;
}

export class TokenClient {
  static async getTokenDescription(tokenId: string): Promise<TokenDescriptionResponse> {
    return ky.get(`${BASE_URL}/api/token/${tokenId}/description`).json();
  }
}

export function useTokenDescription(tokenAddress?: string) {
  return useQuery({
    queryKey: ['token', 'description', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) throw new Error('No token address');
      return TokenClient.getTokenDescription(tokenAddress);
    },
    enabled: !!tokenAddress,
    staleTime: 30 * 60 * 1000, // 30 minutes - descriptions rarely change
    cacheTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
    retry: (failureCount, error: any) => {
      // Don't retry 404 errors (no description found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    onError: (error: any) => {
      if (error?.response?.status !== 404) {
        console.error(`❌ Error fetching token description:`, error);
      }
    },
  });
}
