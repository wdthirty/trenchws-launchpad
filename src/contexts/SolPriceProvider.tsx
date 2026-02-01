import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ApeClient } from '@/components/Explore/client';

interface SolPriceContextType {
  solPrice: number | null;
  isLoading: boolean;
  error: string | null;
  refreshSolPrice: () => Promise<void>;
}

const SolPriceContext = createContext<SolPriceContextType | null>(null);

export const useSolPrice = () => {
  const context = useContext(SolPriceContext);
  if (!context) {
    throw new Error('useSolPrice must be used within SolPriceProvider');
  }
  return context;
};

interface SolPriceProviderProps {
  children: React.ReactNode;
}

export const SolPriceProvider: React.FC<SolPriceProviderProps> = ({ children }) => {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSolPrice = useCallback(async (isInitial = false) => {
    try {
      // Only show loading state on initial load, not on refreshes
      if (isInitial) {
        setIsLoading(true);
      }
      setError(null);
      
      const price = await ApeClient.getSolPrice();
      
      setSolPrice(price);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch SOL price';
      setError(errorMessage);
      console.error('❌ Failed to fetch SOL price:', err);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshSolPrice = useCallback(async () => {
    await fetchSolPrice();
  }, [fetchSolPrice]);

  // Fetch SOL price on mount
  useEffect(() => {
    fetchSolPrice(true); // Initial load
  }, [fetchSolPrice]);

  // Refresh SOL price every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSolPrice(false); // Background refresh, no loading state
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchSolPrice]);

  const value: SolPriceContextType = {
    solPrice,
    isLoading,
    error,
    refreshSolPrice,
  };

  return (
    <SolPriceContext.Provider value={value}>
      {children}
    </SolPriceContext.Provider>
  );
};
