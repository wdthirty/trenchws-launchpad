import { useQuery } from '@tanstack/react-query';

export const useTokenCategory = (tokenAddress?: string) => {
  return useQuery({
    queryKey: ['tokenCategory', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) return null;
      
      const response = await fetch(`/api/token/${tokenAddress}/category`);
      if (!response.ok) {
        throw new Error('Failed to fetch token category');
      }
      
      const data = await response.json();
      return data.category;
    },
    enabled: !!tokenAddress,
    staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
    cacheTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
    retry: (failureCount, error: any) => {
      // Don't retry 404 errors (no category found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });
};
