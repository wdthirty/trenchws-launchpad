import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicBondingCurveClient, DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { CpAmm, getUnClaimReward } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { findUserByWalletAddress, getCoinsByTaggedUser, findUserByPrivyUserId } from '@/lib/database';
import { Pool } from 'pg';

export type TaggedCoin = {
  tokenAddress: string; // base_mint
  isMigrated: boolean;
  migrationFeeWithdrawStatus: boolean;
  creatorQuoteFee: number; // in lamports
  poolFee: number; // pool fees in lamports
  // Basic coin data from database
  name: string;
  symbol: string;
  creatorUsername?: string; // Twitter username of the creator
};

export type TaggedCoinsResponse = {
  coins: TaggedCoin[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TaggedCoinsResponse | { error: string; details?: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Create a new pool connection for this request
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // First, find the user by wallet address to get their Twitter username
    const user = await findUserByWalletAddress(dbPool, wallet);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.twitterUsername) {
      return res.status(200).json({ coins: [] });
    }

    // Get all coins tagged to this user's Twitter username
    const taggedUserCoins = await getCoinsByTaggedUser(dbPool, user.twitterUsername);

    if (taggedUserCoins.length === 0) {
      return res.status(200).json({ coins: [] });
    }

    // Initialize DBC client and DAMM v2 client
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');
    const cpAmm = new CpAmm(connection);

    // Get pool data for each coin using getPoolByBaseMint
    const coinsWithPoolData: TaggedCoin[] = [];
    
    for (const coin of taggedUserCoins) {
      try {
        // Get pool data using the coin's address as baseMint
        const pool = await client.state.getPoolByBaseMint(coin.coinAddress);
        
        if (pool) {
          let poolFee = 0;
          
          // If migrated, get pool fees from DAMM v2
          if (pool.account.isMigrated) {
            try {
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
              
              // Get user positions for this specific pool using the user's wallet address
              const userPositions = await cpAmm.getUserPositionByPool(
                dammV2PoolAddress, // DAMM V2 pool address
                new PublicKey(wallet) // user wallet address
              );
              
              if (userPositions.length > 0) {
                const firstPosition = userPositions[0];
                
                // Get pool state and position state
                const poolState = await cpAmm.fetchPoolState(dammV2PoolAddress);
                const positionState = await cpAmm.fetchPositionState(firstPosition.position);
                
                // Get unclaimed rewards (pool fees)
                const unClaimedReward = getUnClaimReward(poolState, positionState);
                
                // For SOL pools, we want the SOL fees
                // Check which token is SOL using NATIVE_MINT
                if (poolState.tokenBMint.equals(NATIVE_MINT)) {
                  poolFee = unClaimedReward.feeTokenB.toNumber();
                } else if (poolState.tokenAMint.equals(NATIVE_MINT)) {
                  poolFee = unClaimedReward.feeTokenA.toNumber();
                }
              }
            } catch (error) {
              console.warn(`Failed to get DAMM v2 pool fees for coin ${coin.coinAddress}:`, error);
            }
          }
          
          // Get creator username for this coin
          let creatorUsername: string | undefined;
          if (coin.creatorPrivyUserId) {
            try {
              const creatorUser = await findUserByPrivyUserId(dbPool, coin.creatorPrivyUserId);
              creatorUsername = creatorUser?.twitterUsername;
            } catch (error) {
              console.warn(`Failed to get creator username for coin ${coin.coinAddress}:`, error);
            }
          }
          
          coinsWithPoolData.push({
            tokenAddress: coin.coinAddress,
            isMigrated: !!pool.account.isMigrated,
            migrationFeeWithdrawStatus: !!pool.account.migrationFeeWithdrawStatus,
            creatorQuoteFee: pool.account.creatorQuoteFee.toNumber(), // creator_quote_fee in lamports
            poolFee: poolFee, // pool fees in lamports
            name: coin.coinName,
            symbol: coin.coinSymbol,
            creatorUsername: creatorUsername,
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get pool data for coin ${coin.coinAddress}:`, error);
        // Continue with other coins even if one fails
      }
    }

    const response: TaggedCoinsResponse = {
      coins: coinsWithPoolData,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error fetching tagged coins:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tagged coins data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Close the pool connection
    await dbPool.end();
  }
}

