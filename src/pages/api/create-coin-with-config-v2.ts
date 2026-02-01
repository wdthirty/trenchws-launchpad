import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { PrivyClient } from '@privy-io/server-auth';
import { Pool } from 'pg';
import { CoinCreationService } from '@/lib/services/coin-creation';
import { CoinCreationRequest } from '@/lib/services/coin-creation/types';

const {
  RPC_URL, 
  DATABASE_URL, 
  PRIVY_APP_ID, 
  PRIVY_APP_SECRET, 
  PRIVY_SESSION_SIGNER_PRIVATE_KEY,
  AUTHORITY_PRIVATE_KEY
} = process.env;

// Validate required environment variables
if (!RPC_URL || !DATABASE_URL) {
  console.error('❌ Missing required RPC or DATABASE environment variables');
  throw new Error('Blockchain or database configuration is incomplete');
}

if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  console.error('❌ Missing required PRIVY environment variables');
  throw new Error("PRIVY_APP_ID / PRIVY_APP_SECRET are missing on the server");
}

if (!AUTHORITY_PRIVATE_KEY) {
  console.error('❌ Missing required AUTHORITY_PRIVATE_KEY environment variable');
  throw new Error("AUTHORITY_PRIVATE_KEY is missing on the server");
}

// Initialize services
const connection = new Connection(RPC_URL, 'confirmed');
const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, { 
  walletApi: { authorizationPrivateKey: PRIVY_SESSION_SIGNER_PRIVATE_KEY } 
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Basic presence check
    const { tokenLogo, tokenName, tokenSymbol, walletId } = req.body;
    if (!tokenLogo || !tokenName || !tokenSymbol || !walletId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare request data
    const coinCreationRequest: CoinCreationRequest = {
      tokenLogo,
      tokenName,
      tokenSymbol,
      tokenDescription: req.body.tokenDescription || '',
      website: req.body.website || '',
      twitter: req.body.twitter || '',
      telegram: req.body.telegram || '',
      preBuy: req.body.preBuy || '0',
      burnPercentage: req.body.burnPercentage || '0',
      walletId,
      xUserHandle: req.body.xUserHandle,
      creatorFee: req.body.creatorFee || '1',
      totalSupply: req.body.totalSupply || '1000000000',
      category: req.body.category,
    };

    // Initialize coin creation service
    const coinCreationService = new CoinCreationService(
      connection,
      pool,
      privy,
      AUTHORITY_PRIVATE_KEY
    );

    // Create the coin
    const result = await coinCreationService.createCoin(coinCreationRequest);

    if (result.success) {
      return res.status(200).json({
        success: true,
        tokenCA: result.tokenCA,
        configAddress: result.configAddress,
        metadataUrl: result.metadataUrl,
        imageUrl: result.imageUrl,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to create coin'
      });
    }

  } catch (error) {
    console.error('❌ Error in coin creation API:', error);
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
      sizeLimit: '3mb',
    },
  },
};
