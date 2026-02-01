import { useRouter } from 'next/router';
import { ApeQueries, QueryData, TokenInfoQueryData } from '@/components/Explore/queries';
import { useQuery } from '@tanstack/react-query';
import { formatPoolAsTokenInfo } from '@/components/Explore/pool-utils';
import { ApeClient } from '@/components/Explore/client';
import { GetTokenResponse } from '@/components/Explore/types';

export function useTokenAddress() {
  const router = useRouter();
  const { tokenId } = router.query;
  const address = Array.isArray(tokenId) ? tokenId[0] : tokenId;
  
  // Return undefined during SSR or when router is not ready
  if (!router.isReady) {
    return undefined;
  }
  
  return address;
}

export function usePageTokenInfo<T = TokenInfoQueryData>(select?: (data: TokenInfoQueryData) => T) {
  const tokenId = useTokenAddress();
  return useQuery({
    ...ApeQueries.tokenInfo({ id: tokenId || '' }),
    refetchInterval: 15 * 1000, // Match alpha version - 15s for faster updates
    enabled: !!tokenId && !!tokenId.trim(),
    select,
    // Match alpha version caching settings
    staleTime: 10 * 1000, // 10 seconds - data is fresh for 10s
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    refetchOnMount: false, // Don't refetch if data exists in cache
  });
}

export function useTokenInfo<T = QueryData<typeof ApeQueries.tokenInfo>>(
  select?: (data: QueryData<typeof ApeQueries.tokenInfo>) => T,
  tId?: string
) {
  const tokenId = tId ? tId : useTokenAddress();
  return useQuery({
    ...ApeQueries.tokenInfo({ id: tokenId || '' }),
    refetchInterval: 15 * 1000, // Match alpha version - 15s for faster updates
    enabled: !!tokenId && !!tokenId.trim(),
    select,
    // Match alpha version caching settings
    staleTime: 10 * 1000, // 10 seconds - data is fresh for 10s
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    refetchOnMount: false, // Don't refetch if data exists in cache
  });
}

export function useBatchTokenInfo(tokenIds: string[]) {
  // Filter out empty/undefined IDs and limit to 50 per batch
  const validIds = tokenIds.filter(id => id && id.trim()).slice(0, 50);
  
  return useQuery({
    ...ApeQueries.tokensInfo({ ids: validIds }),
    refetchInterval: 15 * 1000, // Match alpha version - 15s for faster updates
    enabled: validIds.length > 0,
    staleTime: 10 * 1000, // 10 seconds - data is fresh for 10s
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
  });
}

export function useMultipleBatchTokenInfo(tokenIds: string[]) {
  // Filter out empty/undefined IDs
  const validIds = tokenIds.filter(id => id && id.trim());
  
  // Create batches of 50 tokens each
  const batchSize = 50;
  const batches: string[][] = [];
  for (let i = 0; i < validIds.length; i += batchSize) {
    batches.push(validIds.slice(i, i + batchSize));
  }
  
  // Use a single query key that includes all batches
  const queryKey = ['explore', 'tokens', 'batch', validIds];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Fetch all batches in parallel
      const batchPromises = batches.map(batch => 
        ApeClient.getTokens({ ids: batch })
      );
      
      const batchResults: GetTokenResponse[] = await Promise.all(batchPromises);
      
      // Flatten all results into a single array
      return batchResults.flatMap(result => 
        result.pools.map(pool => ({
          ...pool,
          bondingCurveId: null as any,
        }))
      );
    },
    refetchInterval: 15 * 1000, // Match alpha version - 15s for faster updates
    enabled: validIds.length > 0,
    staleTime: 10 * 1000, // 10 seconds - data is fresh for 10s
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
  });
}

export function useTokensBySearch(query: string) {
  return useQuery({
    ...ApeQueries.tokensBySearch({ query: query || '' }),
    refetchInterval: 5 * 1000,
    enabled: !!query,
  });
}

export function useHolders() {
  const address = useTokenAddress();
  return useQuery({
    ...ApeQueries.tokenHolders({ id: address || '' }),
    refetchInterval: 5 * 1000,
    enabled: !!address && !!address.trim(),
  });
}

export function usePoolMinimalTokenInfo() {
  const tokenId = useTokenAddress();
  return useQuery({
    ...ApeQueries.tokenInfo({ id: tokenId || '' }),
    enabled: !!tokenId && !!tokenId.trim(),
    select: (pool) => {
      if (!pool) {
        return null;
      }
      return formatPoolAsTokenInfo(pool);
    },
    refetchInterval: 15 * 1000, // Match alpha version - 15s for faster updates
    staleTime: 10 * 1000, // 10 seconds - data is fresh for 10s
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
  });
}

export function useMinimalTokenInfo() {
  const main = usePoolMinimalTokenInfo();
  return main;
}
