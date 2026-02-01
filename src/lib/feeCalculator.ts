import { DynamicBondingCurveClient, DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { CpAmm, getUnClaimReward } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
// Fee structure constants
export const MIGRATION_FEE_AMOUNT = 1.66; // 1.66 SOL for creator
const LAMPORTS_PER_SOL = 1e9;



export interface TotalFeesRaised {
  totalFeesRaised: number; // in SOL
}

export async function calculateTotalFeesRaised(
  tokenMintAddress: string,
  rpcUrl?: string,
): Promise<TotalFeesRaised> {
  const connection = new Connection(rpcUrl || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  const client = new DynamicBondingCurveClient(connection, 'confirmed');
  const cpAmm = new CpAmm(connection);

  try {
    // Get DBC pool state
    let pool;
    try {
      pool = await client.state.getPoolByBaseMint(new PublicKey(tokenMintAddress));
    } catch (error) {
      console.warn(`Failed to get pool for token ${tokenMintAddress}:`, error);
      // Return default values for tokens without pools
      return {
        totalFeesRaised: 0,
      };
    }
    
    if (!pool) {
      // Return default values for tokens without pools
      return {
        totalFeesRaised: 0,
      };
    }

    // 1. Calculate total trading fees for creator before migration
    let totalCreatorTradingFees = 0;
    try {
      const totalTradingFees = pool.account.metrics.totalTradingQuoteFee.toNumber() - pool.account.partnerQuoteFee.toNumber();
      const poolFeeOption = pool.account.partnerQuoteFee;
      console.log('poolFeeOption', poolFeeOption.toNumber());
      totalCreatorTradingFees = (totalTradingFees) / LAMPORTS_PER_SOL;
    } catch (error) {
      console.warn(`Failed to calculate trading fees for token ${tokenMintAddress}:`, error);
      totalCreatorTradingFees = 0;
    }

    // 2. Check migration status and unclaimed migration fees
    let isMigrated = false;
    let migrationFeeWithdrawStatus = false;
    let totalMigrationFees = 0;
    try {
      isMigrated = !!pool.account.isMigrated;
      migrationFeeWithdrawStatus = !!pool.account.migrationFeeWithdrawStatus;
      totalMigrationFees = isMigrated && !migrationFeeWithdrawStatus ? MIGRATION_FEE_AMOUNT : 0;
    } catch (error) {
      console.warn(`Failed to calculate migration fees for token ${tokenMintAddress}:`, error);
      isMigrated = false;
      migrationFeeWithdrawStatus = false;
      totalMigrationFees = 0;
    }

    // 3. Calculate unclaimed pool fees (DAMM v2) if migrated
    let totalPoolFees = 0;
    
    if (isMigrated) {
      try {
        // Get the pool config to find the migration fee option
        const poolConfig = await client.state.getPoolConfig(pool.account.config);
        
        // Get the DAMM v2 config address based on migration fee option
        const dammConfigAddressString = DAMM_V2_MIGRATION_FEE_ADDRESS[poolConfig.migrationFeeOption];
        if (dammConfigAddressString) {
          const dammConfigAddress = new PublicKey(dammConfigAddressString);
          
          // Derive the DAMM v2 pool address from the DBC pool
          const dammV2PoolAddress = deriveDammV2PoolAddress(
            dammConfigAddress,     // damm config
            pool.account.baseMint, // base mint
            NATIVE_MINT // quote mint
          );
          
          // Get pool state for total pool fees
          const poolState = await cpAmm.fetchPoolState(dammV2PoolAddress);
          
          // Use getUnClaimReward to get unclaimed fees from DAMM v2 pool
          // Get the creator's positions for this pool
          const userPositions = await cpAmm.getUserPositionByPool(
            dammV2PoolAddress, // DAMM V2 pool address
            pool.account.creator // creator's wallet address
          );
          
          if (userPositions.length > 0) {
            const firstPosition = userPositions[0];
            
            // Get position state
            const positionState = await cpAmm.fetchPositionState(firstPosition.position);
            
            const claimedReward = positionState.metrics.totalClaimedBFee;
            // Get unclaimed rewards (pool fees)
            const unClaimedReward = getUnClaimReward(poolState, positionState);
            
            const totalFees = unClaimedReward.feeTokenB.add(claimedReward);
            totalPoolFees = totalFees.toNumber() / LAMPORTS_PER_SOL;
          } else {
            totalPoolFees = 0;
          }
        }
      } catch (error) {
        console.warn(`Failed to get DAMM v2 pool fees for token ${tokenMintAddress}:`, error);
        totalPoolFees = 0;
      }
    }

    // 5. Calculate totals
    const totalFeesRaised = totalCreatorTradingFees + totalMigrationFees + totalPoolFees;

    return {
      totalFeesRaised,
    };

  } catch (error) {
    console.error(`Error calculating total fees raised for token ${tokenMintAddress}:`, error);
    throw error;
  }
}




