import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicBondingCurveClient, DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { CpAmm, getUnClaimReward } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT } from '@solana/spl-token';
import { findUserByWalletAddress } from '@/lib/database';
import { findTaggedWalletByTwitterUsername } from '@/lib/database/tagged_wallets';
import { MIGRATION_FEE_AMOUNT } from '@/lib/feeCalculator';
import { Pool } from 'pg';
import bs58 from 'bs58';

// Constants
const NEXT_PUBLIC_POOL_CONFIG_KEY = process.env.NEXT_PUBLIC_POOL_CONFIG_KEY || '';

export interface ExternalWalletClaimRequest {
  walletAddress: string;
  tokenId: string;
  tokenType: 'creator' | 'tagged';
}

export interface ExternalWalletClaimResponse {
  success: boolean;
  transactionData?: {
    poolId: string;
    actualCreatorPublicKey: string;
    receiverAddress: string;
    dammV2PoolAddress?: string;
    dammPoolState?: any;
    userPositions?: any[];
    availableRewards: {
      trading: boolean;
      migration: boolean;
      pool: boolean;
    };
    claimedTypes: string[];
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExternalWalletClaimResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const { walletAddress, tokenId, tokenType }: ExternalWalletClaimRequest = req.body;
    
    if (!walletAddress || !tokenId || !tokenType) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    if (!NEXT_PUBLIC_POOL_CONFIG_KEY) {
      return res.status(500).json({ success: false, error: 'Pool config key not configured' });
    }

    // Initialize DBC client
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Initialize DAMM v2 client
    const cpAmm = new CpAmm(connection);

    const receiverAddress = new PublicKey(walletAddress);
    const tokenPublicKey = new PublicKey(tokenId);

    // For tagged token types, we need to fetch the tagged wallet and use its address as creatorPublicKey
    let actualCreatorPublicKey = new PublicKey(walletAddress);
    
    if (tokenType === 'tagged') {
      try {
        const user = await findUserByWalletAddress(dbPool, walletAddress);
        if (user && user.twitterUsername) {
          const taggedWallet = await findTaggedWalletByTwitterUsername(dbPool, user.twitterUsername);
          if (taggedWallet) {
            actualCreatorPublicKey = new PublicKey(taggedWallet.walletAddress);
          } else {
            console.warn('⚠️ Tagged wallet not found for Twitter username:', user.twitterUsername);
          }
        } else {
          console.warn('⚠️ User not found or has no Twitter username');
        }
      } catch (error) {
        console.warn('⚠️ Error fetching tagged wallet, using original wallet address:', error);
      }
    }

    // Get pool data to check eligibility
    const pool = await client.state.getPoolByBaseMint(tokenPublicKey);
    const poolId = pool.publicKey;

    // Get the pool config to find the migration fee option
    const poolConfig = await client.state.getPoolConfig(pool.account.config);

    // Get the DAMM v2 config address based on migration fee option
    const dammConfigAddressString = DAMM_V2_MIGRATION_FEE_ADDRESS[poolConfig.migrationFeeOption];
    if (!dammConfigAddressString) {
      throw new Error(`Migration fee address not found for option: ${poolConfig.migrationFeeOption}`);
    }
    const dammConfigAddress = new PublicKey(dammConfigAddressString);
    
    // Derive the DAMM v2 pool address from the DBC pool
    const dammV2PoolAddress = deriveDammV2PoolAddress(
      dammConfigAddress,     // damm config
      pool.account.baseMint, // base mint
      NATIVE_MINT // quote mint
    );
    
    // Get pool state from DAMM v2 (only if pool is migrated)
    let dammPoolState: any = null;
    if (pool.account.isMigrated) {
      try {
        dammPoolState = await cpAmm.fetchPoolState(dammV2PoolAddress);
      } catch (error) {
        console.warn('⚠️ Failed to fetch DAMM v2 pool state:', error);
        // Continue without pool state - this means no pool fees are available
      }
    }
    
    // Check what rewards are actually available for this user
    const availableRewards = {
      trading: false,
      migration: false,
      pool: false
    };

    // Check trading fees availability (for both creators and tagged users)
    try {
      // Check if there are trading fees to claim by looking at pool data
      const creatorQuoteFee = pool.account.creatorQuoteFee?.toNumber() || 0;
      const creatorQuoteFeeSOL = creatorQuoteFee / 1e9;
      const minTradingFeeSOL = 0.01; // Minimum 0.01 SOL for trading fees
      availableRewards.trading = creatorQuoteFeeSOL >= minTradingFeeSOL;
    } catch (error) {
      console.warn('⚠️ Could not check trading fees availability:', error);
    }

    // Check migration fees availability (ONLY for creator coins, not tagged coins)
    try {
      // Only creator coins can claim migration fees
      if (tokenType === 'creator') {
        // TODO: Get actual migration status and fee availability from pool data
        const isMigrated = pool.account.isMigrated || false; // Placeholder - should check actual migration status
        const hasMigrationFees = !pool.account.migrationFeeWithdrawStatus || false; // Placeholder - should check if migration fees are available
        
        availableRewards.migration = isMigrated && hasMigrationFees;
      } else {
        // Tagged coins cannot claim migration fees
        availableRewards.migration = false;
      }
    } catch (error) {
      console.warn('⚠️ Could not check migration fees availability:', error);
      // Ensure migration fees are disabled on error for tagged coins
      if (tokenType !== 'creator') {
        availableRewards.migration = false;
      }
    }

    // Check pool fees availability
    let userPositions: any[] = []; // Declare userPositions at function scope
    try {
      // Check if pool is actually migrated to DAMM v2
      const isMigrated = pool.account.isMigrated || false; // Use actual migration status from pool
      
      // Both creators and tagged users can claim pool fees if migrated
      const canClaimPoolFees = isMigrated;
      
      if (canClaimPoolFees && isMigrated && dammPoolState) {
        try {
          // Get user positions for this specific pool
          userPositions = await cpAmm.getUserPositionByPool(
            dammV2PoolAddress, // DAMM v2 pool address
            actualCreatorPublicKey    // user wallet address
          );
          
          if (userPositions.length > 0) {
            const firstPosition = userPositions[0];
            
            // Get position state
            const positionState = await cpAmm.fetchPositionState(firstPosition.position);
            
            // Get unclaimed rewards (pool fees) using getUnClaimReward
            const unClaimedReward = getUnClaimReward(dammPoolState, positionState);
            
            // For SOL pools, we want the SOL fees with proper decimal conversion
            // Check which token is SOL using NATIVE_MINT
            // SOL has 9 decimals, so divide by 10^9
            let poolFees = 0;
            if (dammPoolState.tokenBMint.equals(NATIVE_MINT)) {
              poolFees = unClaimedReward.feeTokenB.toNumber() / 1e9;
            } else if (dammPoolState.tokenAMint.equals(NATIVE_MINT)) {
              poolFees = unClaimedReward.feeTokenA.toNumber() / 1e9;
            }
            
            const minPoolFeeSOL = 0.01; // Minimum 0.01 SOL for pool fees
            availableRewards.pool = poolFees >= minPoolFeeSOL;
          } else {
            availableRewards.pool = false;
          }
        } catch (error) {
          console.warn('⚠️ Could not check pool fees amount:', error);
          availableRewards.pool = false;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not check pool fees availability:', error);
    }

    // Log what rewards are available
    const availableTypes = Object.entries(availableRewards)
      .filter(([_, available]) => available)
      .map(([type, _]) => type);
    
    const claimedTypes: string[] = [];

    // Determine which types of rewards can be claimed
    if (availableRewards.trading) {
      claimedTypes.push('trading');
    }
    if (availableRewards.migration && tokenType === 'creator') {
      claimedTypes.push('migration');
    }
    if (availableRewards.pool) {
      claimedTypes.push('pool');
    }

    // Check if we have any rewards to claim
    if (claimedTypes.length === 0) {
      const availableMessage = availableTypes.length > 0 
        ? `Available rewards: ${availableTypes.join(', ')}` 
        : 'No rewards available';
      
      // Return a specific error message for no rewards
      const errorMessage = availableTypes.length === 0 
        ? 'You need at least 0.01 SOL in fees to claim rewards. Trading fees and pool fees require a minimum of 0.01 SOL each.'
        : `No eligible fees to claim for this token. ${availableMessage}`;
      
      return res.status(400).json({ 
        success: false,
        error: errorMessage
      });
    }

    // Prepare transaction data for client-side execution
    const transactionData = {
      poolId: poolId.toBase58(),
      actualCreatorPublicKey: actualCreatorPublicKey.toBase58(),
      receiverAddress: receiverAddress.toBase58(),
      dammV2PoolAddress: dammV2PoolAddress.toBase58(),
      dammPoolState: dammPoolState,
      userPositions: userPositions,
      availableRewards,
      claimedTypes,
      // Pool data for client-side calculations
      poolData: {
        creatorQuoteFee: pool.account.creatorQuoteFee?.toNumber() || 0,
        isMigrated: pool.account.isMigrated || false,
        migrationFeeWithdrawStatus: pool.account.migrationFeeWithdrawStatus || false,
        baseMint: pool.account.baseMint.toBase58(),
        config: pool.account.config.toBase58(),
      },
      // Pool config data
      poolConfig: {
        migrationFeeOption: poolConfig.migrationFeeOption,
      }
    };

    return res.status(200).json({
      success: true,
      transactionData
    });

  } catch (error: any) {
    console.error('💥 === EXTERNAL CLAIM API ENDPOINT FAILED ===');
    console.error('❌ Error preparing external claim:', error);
    return res.status(500).json({ 
      success: false,
      error: `Failed to prepare claim: ${error.message || 'Unknown error'}` 
    });
  } finally {
    // Close the pool connection
    await dbPool.end();
  }
}
