import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { Pool } from 'pg';
import { CoinStateService } from '@/lib/services/coin-creation/coin-state.service';

const {
  RPC_URL, 
  DATABASE_URL
} = process.env;

// Validate required environment variables
if (!RPC_URL || !DATABASE_URL) {
  console.error('❌ Missing required RPC or DATABASE environment variables');
  throw new Error('Blockchain or database configuration is incomplete');
}

// Initialize services
const connection = new Connection(RPC_URL, 'confirmed');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    const { stateId, transactionSignatures } = req.body;

    if (!stateId || !transactionSignatures || !Array.isArray(transactionSignatures)) {
      return res.status(400).json({ error: 'Missing required fields: stateId and transactionSignatures' });
    }

    // Initialize coin state service
    const coinStateService = new CoinStateService(pool, connection);

    // Get the coin state
    const coinState = await coinStateService.getCoinState(stateId);
    if (!coinState) {
      return res.status(404).json({ error: 'Coin creation state not found' });
    }

    // Verify all transactions were successful
    console.log('🔍 Verifying transaction signatures...');
    const verificationResults = await Promise.all(
      transactionSignatures.map(async (signature: string) => {
        try {
          const result = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
          });
          return {
            signature,
            success: result.value?.err === null,
            error: result.value?.err
          };
        } catch (error) {
          return {
            signature,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const failedTransactions = verificationResults.filter(result => !result.success);
    
    if (failedTransactions.length > 0) {
      console.error('❌ Some transactions failed:', failedTransactions);
      
      // Update coin state to failed
      await coinStateService.updateCoinState(stateId, {
        status: 'failed',
        error: `Transactions failed: ${failedTransactions.map(t => t.error).join(', ')}`
      });

      return res.status(400).json({
        success: false,
        error: 'Some transactions failed',
        failedTransactions
      });
    }

    // All transactions successful - mark as completed
    console.log('✅ All transactions verified successfully');
    await coinStateService.updateCoinState(stateId, {
      status: 'completed'
    });

    return res.status(200).json({
      success: true,
      message: 'All transactions executed successfully',
      transactionSignatures
    });

  } catch (error) {
    console.error('❌ Error in transaction execution API:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
