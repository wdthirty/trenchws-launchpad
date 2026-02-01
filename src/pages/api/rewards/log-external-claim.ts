import { NextApiRequest, NextApiResponse } from 'next';
import { recordClaimedFees } from '@/lib/database/claimedFees';
import { Pool } from 'pg';

export interface ExternalWalletClaimLogRequest {
  coinAddress: string;
  userWalletAddress: string;
  feeTypes: string[];
  transactionSignatures: string[];
  amounts: { [feeType: string]: number }; // fee type -> amount in SOL
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message?: string; error?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const { 
      coinAddress, 
      userWalletAddress, 
      feeTypes, 
      transactionSignatures, 
      amounts 
    }: ExternalWalletClaimLogRequest = req.body;

    // Validate required parameters
    if (!coinAddress || !userWalletAddress || !feeTypes || !Array.isArray(feeTypes) || feeTypes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: coinAddress, userWalletAddress, feeTypes' 
      });
    }

    if (!transactionSignatures || !Array.isArray(transactionSignatures)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid transactionSignatures array' 
      });
    }

    if (!amounts || typeof amounts !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid amounts object' 
      });
    }

    // Record each fee type that was claimed
    const loggedFees = [];
    const errors = [];

    for (const feeType of feeTypes) {
      try {
        // Validate fee type
        if (!['trading', 'migration', 'pool'].includes(feeType)) {
          console.warn(`⚠️ Invalid fee type: ${feeType}, skipping...`);
          continue;
        }

        // Get the amount for this fee type
        const amount = amounts[feeType];
        if (typeof amount !== 'number' || amount <= 0) {
          console.warn(`⚠️ Invalid or zero amount for ${feeType}: ${amount}, skipping...`);
          continue;
        }

        // Use the first transaction signature (for combined transactions) or find a specific one
        const transactionSignature = transactionSignatures[0] || '';

        // Record the claimed fee
        await recordClaimedFees(
          dbPool,
          coinAddress,
          userWalletAddress,
          feeType as 'trading' | 'migration' | 'pool',
          amount,
          transactionSignature
        );

        loggedFees.push({ feeType, amount, transactionSignature });
        console.log(`✅ Logged ${feeType} fee claim: ${amount} SOL for ${userWalletAddress} on coin ${coinAddress}`);
      } catch (error: any) {
        console.error(`❌ Failed to log ${feeType} fee claim:`, error);
        errors.push({ feeType, error: error.message });
      }
    }

    // Return results
    if (loggedFees.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid fees could be logged',
        message: `Errors: ${errors.map(e => `${e.feeType}: ${e.error}`).join(', ')}`
      });
    }

    const message = errors.length > 0 
      ? `Successfully logged ${loggedFees.length}/${feeTypes.length} fee types. Errors: ${errors.map(e => e.feeType).join(', ')}`
      : `Successfully logged all ${loggedFees.length} fee types`;

    return res.status(200).json({ 
      success: true, 
      message,
      loggedFees: loggedFees.length
    });

  } catch (error: any) {
    console.error('💥 === EXTERNAL CLAIM LOGGING FAILED ===');
    console.error('❌ Error logging external claim:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Failed to log external claim: ${error.message || 'Unknown error'}` 
    });
  } finally {
    // Close the pool connection
    await dbPool.end();
  }
}
