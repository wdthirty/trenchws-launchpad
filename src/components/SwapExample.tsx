'use client';

import React, { useState } from 'react';
import { useSwapClient } from '@/hooks/useSwapClient';
import { useSwapFees } from '@/contexts/SwapFeesProvider';
import { toast } from 'sonner';

export const SwapExample: React.FC = () => {
  const { executeSwap, getQuote, isAuthenticated, userAddress } = useSwapClient();
  const { fees } = useSwapFees();
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  const handleGetQuote = async () => {
    try {
      // Example: Get quote for 1 SOL to USDC
      const solMint = 'So11111111111111111111111111111111111111112';
      const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const amount = '1000000000'; // 1 SOL in lamports
      
      const quoteResult = await getQuote(solMint, usdcMint, amount, 50);
      setQuote(quoteResult);
      toast.success('Quote received!');
    } catch (error) {
      toast.error('Failed to get quote');
      console.error('Quote error:', error);
    }
  };

  const handleExecuteSwap = async () => {
    if (!fees) {
      toast.error('Fees not loaded yet');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      // Example: Swap 0.1 SOL to USDC
      const solMint = 'So11111111111111111111111111111111111111112';
      const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const amount = '100000000'; // 0.1 SOL in lamports
      
      const result = await executeSwap(solMint, usdcMint, amount, 50, fees, false, 'USDC');
      
      if (result.success) {
        toast.success(`Swap successful! Signature: ${result.signature.slice(0, 8)}...`);
      } else {
        toast.error('Swap failed');
      }
    } catch (error) {
      toast.error('Swap execution failed');
      console.error('Swap error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Swap Client Example</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400">User Address: {userAddress || 'Not connected'}</p>
          <p className="text-sm text-gray-400">Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Fees Status:</h3>
          {fees ? (
            <div className="text-sm text-green-400">
              <p>Tip: {fees.tipLamports} lamports</p>
              <p>Priority: {fees.priorityMicroLamports} micro-lamports</p>
              <p>Compute Units: {fees.computeUnits}</p>
            </div>
          ) : (
            <p className="text-sm text-yellow-400">Loading fees...</p>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleGetQuote}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Get Quote (1 SOL → USDC)
          </button>

          <button
            onClick={handleExecuteSwap}
            disabled={!fees || !isAuthenticated || isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white"
          >
            {isLoading ? 'Executing...' : 'Execute Swap (0.1 SOL → USDC)'}
          </button>
        </div>

        {quote && (
          <div className="mt-4 p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Latest Quote:</h3>
            <pre className="text-xs text-gray-300 overflow-auto">
              {JSON.stringify(quote, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
