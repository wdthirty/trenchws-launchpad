import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { PrivyClient } from '@privy-io/server-auth';
import { Pool } from 'pg';
import { ImprovedCoinCreationService, initializeCoinCreationStatesTable } from '@/lib/services/coin-creation';

const {
  RPC_URL, 
  DATABASE_URL, 
  PRIVY_APP_ID, 
  PRIVY_APP_SECRET, 
  PRIVY_SESSION_SIGNER_PRIVATE_KEY,
  AUTHORITY_PRIVATE_KEY
} = process.env;

// Initialize services
const connection = new Connection(RPC_URL!, 'confirmed');
const privy = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!, { 
  walletApi: { authorizationPrivateKey: PRIVY_SESSION_SIGNER_PRIVATE_KEY } 
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { stateId } = req.query;

  if (!stateId || typeof stateId !== 'string') {
    return res.status(400).json({ error: 'State ID is required' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Initialize coin creation states table if it doesn't exist
    await initializeCoinCreationStatesTable(pool);

    // Initialize improved coin creation service
    const coinCreationService = new ImprovedCoinCreationService(
      connection,
      pool,
      privy,
      AUTHORITY_PRIVATE_KEY!
    );

    // Get coin creation status
    const status = await coinCreationService.getCoinCreationStatus(stateId);

    if (!status) {
      return res.status(404).json({ error: 'Coin creation state not found' });
    }

    return res.status(200).json({
      success: true,
      status: status.status,
      mintAddress: status.mintAddress,
      configAddress: status.configAddress,
      metadataUrl: status.metadataUrl,
      imageUrl: status.imageUrl,
      error: status.error,
      completedSteps: status.completedSteps,
      failedSteps: status.failedSteps,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    });

  } catch (error) {
    console.error('❌ Error getting coin creation status:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
