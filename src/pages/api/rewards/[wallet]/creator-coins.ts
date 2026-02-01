import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicBondingCurveClient, DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { CpAmm, getUnClaimReward } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { findUserByWalletAddress, getUserCoinsByPrivyId } from '@/lib/database';
import { Pool } from 'pg';

export type CreatorCoin = {
  tokenAddress: string; // base_mint
  isMigrated: boolean;
  migrationFeeWithdrawStatus: boolean;
  creatorQuoteFee: number; // in lamports
  poolFee: number; // pool fees in lamports
  // Basic coin data from database
  name: string;
  symbol: string;
};

export type CreatorCoinsResponse = {
  coins: CreatorCoin[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatorCoinsResponse | { error: string; details?: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {    
    // First, find the user by wallet address to get their privy_user_id
    const user = await findUserByWalletAddress(pool, wallet);
    if (!user) {
      console.log(`❌ User not found for wallet: ${wallet}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all coins created by this user from our database
    const userCoins = await getUserCoinsByPrivyId(pool, user.privyUserId);
        
    if (userCoins.length === 0) {
      return res.status(200).json({ coins: [] });
    }

    // Initialize DBC client and DAMM v2 client
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');
    const cpAmm = new CpAmm(connection);

    // Get pool data for each coin using getPoolByBaseMint
    const coinsWithPoolData: CreatorCoin[] = [];
    
    for (const coin of userCoins) {
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
              
              // Get user positions for this specific pool
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
          
          const creatorQuoteFeeSOL = pool.account.creatorQuoteFee.toNumber() / 1e9;
          const poolFeeSOL = poolFee / 1e9;
          
          console.log(`💰 Rewards for ${coin.coinName} (${coin.coinAddress.slice(0, 8)}):`, {
            creatorQuoteFee: `${creatorQuoteFeeSOL} SOL`,
            poolFee: `${poolFeeSOL} SOL`,
            isMigrated: !!pool.account.isMigrated,
            migrationFeeWithdrawStatus: !!pool.account.migrationFeeWithdrawStatus
          });

          coinsWithPoolData.push({
            tokenAddress: coin.coinAddress,
            isMigrated: !!pool.account.isMigrated,
            migrationFeeWithdrawStatus: !!pool.account.migrationFeeWithdrawStatus,
            creatorQuoteFee: pool.account.creatorQuoteFee.toNumber(), // creator_quote_fee in lamports
            poolFee: poolFee, // pool fees in lamports
            name: coin.coinName,
            symbol: coin.coinSymbol,
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get pool data for coin ${coin.coinAddress}:`, error);
        // Continue with other coins even if one fails
      }
    }

    console.log(`✅ Successfully processed ${coinsWithPoolData.length} coins with pool data`);

    const response: CreatorCoinsResponse = {
      coins: coinsWithPoolData,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error fetching creator coins:', error);
    res.status(500).json({ 
      error: 'Failed to fetch creator coins data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
