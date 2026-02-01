'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SwapFees {
  tipLamports: number;
  priorityMicroLamports: number;
  computeUnits: number;
}

interface SwapFeesContextType {
  fees: SwapFees | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const SwapFeesContext = createContext<SwapFeesContextType | undefined>(undefined);

export const useSwapFees = () => {
  const context = useContext(SwapFeesContext);
  if (context === undefined) {
    throw new Error('useSwapFees must be used within a SwapFeesProvider');
  }
  return context;
};

interface SwapFeesProviderProps {
  children: React.ReactNode;
}

export const SwapFeesProvider: React.FC<SwapFeesProviderProps> = ({ children }) => {
  const [fees, setFees] = useState<SwapFees | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFees = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/swap/fees');
      if (!response.ok) {
        throw new Error(`Failed to fetch fees: ${response.status}`);
      }
      const data = await response.json();
      setFees(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch swap fees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch fees silently in background on mount
  useEffect(() => {
    fetchFees();
  }, []);

  return (
    <SwapFeesContext.Provider value={{ fees, isLoading, error, refetch: fetchFees }}>
      {children}
    </SwapFeesContext.Provider>
  );
};
