import { useSolPrice } from '@/contexts/SolPriceProvider';
import { useRef } from 'react';

/**
 * Hook to convert SOL amounts to USD using live SOL price
 * @param solAmount - Amount in SOL
 * @returns Object with USD amount and loading/error states
 */
export const useSolToUsd = (solAmount: number) => {
  const { solPrice, isLoading, error } = useSolPrice();
  const lastValidPriceRef = useRef<number | null>(null);

  // If we have a valid price, store it as the last valid price
  if (solPrice && !error) {
    lastValidPriceRef.current = solPrice;
  }

  // Only show loading on initial load (when we have no previous valid price)
  if (isLoading && !lastValidPriceRef.current) {
    return {
      usdAmount: null,
      isLoading: true,
      error: null,
      formattedUsd: 'Loading...',
    };
  }

  // Use current price if available, otherwise use last valid price
  const priceToUse = solPrice || lastValidPriceRef.current;

  if (error && !priceToUse) {
    return {
      usdAmount: null as null,
      isLoading: false,
      error: error || 'SOL price not available',
      formattedUsd: 'Price unavailable',
    };
  }

  if (!priceToUse) {
    return {
      usdAmount: null,
      isLoading: false,
      error: 'SOL price not available',
      formattedUsd: 'Price unavailable',
    };
  }

  const usdAmount = solAmount * priceToUse;

  return {
    usdAmount,
    isLoading: false,
    error: null as null,
    formattedUsd: `$${usdAmount.toFixed(2)}`,
  };
};

/**
 * Utility function to convert SOL to USD (for use outside of React components)
 * @param solAmount - Amount in SOL
 * @param solPrice - Current SOL price in USD
 * @returns USD amount
 */
export const convertSolToUsd = (solAmount: number, solPrice: number): number => {
  return solAmount * solPrice;
};

/**
 * Format SOL amount with USD equivalent
 * @param solAmount - Amount in SOL
 * @param solPrice - Current SOL price in USD
 * @returns Formatted string with both SOL and USD
 */
export const formatSolWithUsd = (solAmount: number, solPrice: number): string => {
  const usdAmount = convertSolToUsd(solAmount, solPrice);
  return `${solAmount.toFixed(4)} SOL ($${usdAmount.toFixed(2)})`;
};
