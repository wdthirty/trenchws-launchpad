import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicBondingCurveClient, DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { BN } from 'bn.js';
import { CpAmm, getTokenProgram, getUnClaimReward } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT } from '@solana/spl-token';
import { PrivyClient } from '@privy-io/server-auth';
import { recordClaimedFees } from '@/lib/database/claimedFees';
import { findUserByWalletAddress } from '@/lib/database';
import { findTaggedWalletByTwitterUsername } from '@/lib/database/tagged_wallets';
import { MIGRATION_FEE_AMOUNT } from '@/lib/feeCalculator';
import { Pool } from 'pg';
import bs58 from 'bs58';

// Constants
const NEXT_PUBLIC_POOL_CONFIG_KEY = process.env.NEXT_PUBLIC_POOL_CONFIG_KEY || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    success: boolean;
    message: string;
    txid?: string;
    claimedTypes?: string[];
    transactionResults?: { type: string; txid: string; success: boolean; error?: string }[];
    successfulCount?: number;
    totalCount?: number;
  } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const { walletAddress, tokenId, tokenType, privyToken, privyWalletId } = req.body;
    if (!walletAddress || !tokenId || !tokenType || !privyWalletId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!NEXT_PUBLIC_POOL_CONFIG_KEY) {
      return res.status(500).json({ error: 'Pool config key not configured' });
    }

    // Initialize Privy client
    const privy = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!,
      { 
        walletApi: { 
          authorizationPrivateKey: process.env.PRIVY_SESSION_SIGNER_PRIVATE_KEY 
        } 
      }
    );
    
    // Initialize DBC client
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Initialize DAMM v2 client
    const cpAmm = new CpAmm(connection);

    const receiverAddress = new PublicKey(walletAddress);

    const tokenPublicKey = new PublicKey(tokenId);

    // For tagged token types, we need to fetch the tagged wallet and use its address as creatorPublicKey
    let actualCreatorPublicKey = new PublicKey(walletAddress);
    let taggedWalletKeypair: Keypair | null = null;
    
    if (tokenType === 'tagged') {
      try {
        const user = await findUserByWalletAddress(dbPool, walletAddress);
        if (user && user.twitterUsername) {
          const taggedWallet = await findTaggedWalletByTwitterUsername(dbPool, user.twitterUsername);
          if (taggedWallet) {
            actualCreatorPublicKey = new PublicKey(taggedWallet.walletAddress);
            
            // Build keypair from the tagged wallet's private key
            if (taggedWallet.walletPrivateKey) {
              try {
                // Decode base58 private key to Uint8Array
                const privateKeyBytes = bs58.decode(taggedWallet.walletPrivateKey);
                taggedWalletKeypair = Keypair.fromSecretKey(privateKeyBytes);
              } catch (keypairError) {
                console.warn('⚠️ Failed to build keypair from private key:', keypairError);
              }
            } else {
              console.warn('⚠️ Tagged wallet has no private key');
            }
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
    let combinedTransaction: any = null;
    const separateTransactions: any[] = [];

    // 1. Claim Trading Fees (only if available)
    if (availableRewards.trading) {
      try {
        // For tagged token types, use receiver param for claiming fees
        // For creator types, use the creator's wallet as both creator and receiver        
        const tradingTx = await client.creator.claimCreatorTradingFee2({
          creator: actualCreatorPublicKey,
          payer: receiverAddress,
          receiver: receiverAddress,
          pool: poolId,
          maxBaseAmount: new BN(1_000_000_000_000_000), // 1 billion base tokens
          maxQuoteAmount: new BN(1_000_000_000_000_000), // 1 trillion quote tokens (SOL)
        });

        if (combinedTransaction) {
          try {
            combinedTransaction.add(tradingTx);
          } catch (error) {
            separateTransactions.push(tradingTx);
          }
        } else {
          combinedTransaction = tradingTx;
        }
        claimedTypes.push('trading');
      } catch (error: any) {
        console.warn('⚠️ Could not claim trading fees:', error.message);
      }
    }

    // 2. Claim Migration Fees (only if available AND only for creator coins)
    if (availableRewards.migration && tokenType === 'creator') {
      try {
        const migrationTx = await client.creator.creatorWithdrawMigrationFee({
          virtualPool: poolId,
          sender: actualCreatorPublicKey,
        });

        if (combinedTransaction) {
          try {
            combinedTransaction.add(migrationTx);
          } catch (error) {
            separateTransactions.push(migrationTx);
          }
        } else {
          combinedTransaction = migrationTx;
        }
        claimedTypes.push('migration');
      } catch (error: any) {
        console.warn('⚠️ Could not claim migration fees:', error.message);
      }
    }

         // 3. Claim Pool Fees (only if available and migrated)
     if (availableRewards.pool) {
       try {
         // Use existing userPositions from earlier check
         if (userPositions.length > 0) {
           const firstPosition = userPositions[0];
           
           // Claim position fees using DAMM v2 SDK with correct parameters
           const poolFeeTx = await cpAmm.claimPositionFee2({
             owner: actualCreatorPublicKey,
             receiver: receiverAddress, // Use receiver param for tagged types
             pool: dammV2PoolAddress,
             position: firstPosition.position,
             positionNftAccount: firstPosition.positionNftAccount,
             tokenAVault: dammPoolState.tokenAVault,
             tokenBVault: dammPoolState.tokenBVault,
             tokenAMint: dammPoolState.tokenAMint,
             tokenBMint: dammPoolState.tokenBMint,
             tokenAProgram: getTokenProgram(dammPoolState.tokenAFlag),
             tokenBProgram: getTokenProgram(dammPoolState.tokenBFlag),
             feePayer: receiverAddress, // Always use user's wallet as fee payer
           });

           if (combinedTransaction) {
             try {
               combinedTransaction.add(poolFeeTx);
             } catch (error) {
               separateTransactions.push(poolFeeTx);
             }
           } else {
             combinedTransaction = poolFeeTx;
           }
           claimedTypes.push('pool');
         } else {
           console.warn('⚠️ No position found for this pool');
         }
       } catch (error: any) {
         console.warn('⚠️ Could not claim pool fees:', error.message);
       }
     }

    // Check if we have any transactions to send
    if (!combinedTransaction && separateTransactions.length === 0) {
      const availableMessage = availableTypes.length > 0 
        ? `Available rewards: ${availableTypes.join(', ')}` 
        : 'No rewards available';
      
      // Return a specific error message for no rewards
      const errorMessage = availableTypes.length === 0 
        ? 'You need at least 0.01 SOL in fees to claim rewards. Trading fees and pool fees require a minimum of 0.01 SOL each.'
        : `No eligible fees to claim for this token. ${availableMessage}`;
      
      res.status(400).json({ 
        error: errorMessage
      });
      return;
    }

    // Prepare all transactions for signing and sending
    const allTransactions = combinedTransaction ? [combinedTransaction, ...separateTransactions] : separateTransactions;
    const transactionResults: { type: string; txid: string; success: boolean; error?: string }[] = [];

    // Sign and send each transaction
    for (let i = 0; i < allTransactions.length; i++) {
      const transaction = allTransactions[i];
      const transactionType = i === 0 && combinedTransaction ? 'combined' : claimedTypes[i] || `transaction_${i}`;
      
      try {
        // Set transaction properties
        transaction.feePayer = receiverAddress;
        transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;

        // Sign with local keypairs first if we have a tagged wallet
        if (tokenType === 'tagged' && taggedWalletKeypair) {
          transaction.sign(taggedWalletKeypair);
        }
        
        // Then sign with Privy (user wallet)
        const { signedTransaction } = await privy.walletApi.solana.signTransaction({
          walletId: privyWalletId,
          transaction: transaction
        });
        
        const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });

        await connection.confirmTransaction(txid, 'confirmed');

        // Record claimed fees in database after successful transaction
        try {
          // For combined transactions, record all claimed fee types
          const feeTypesToRecord = transactionType === 'combined' ? claimedTypes : [transactionType];
          
          for (const feeType of feeTypesToRecord) {
            let feeAmount = 0;
            
            // Calculate the actual amount that was claimed for each fee type
            if (feeType === 'trading') {
                             // Get the trading fees amount that was actually claimed
               // We need to get this from the transaction or calculate it properly
               const creatorQuoteFee = pool.account.creatorQuoteFee?.toNumber() || 0;
               feeAmount = creatorQuoteFee / 1e9; // Convert lamports to SOL
            } else if (feeType === 'migration') {
              // Migration fees are fixed at 1.66 SOL for creator
              feeAmount = MIGRATION_FEE_AMOUNT;
            } else if (feeType === 'pool') {
              // Get pool fees amount that was actually claimed
              if (dammPoolState && userPositions && userPositions.length > 0) {
                const firstPosition = userPositions[0];
                const positionState = await cpAmm.fetchPositionState(firstPosition.position);
                const unClaimedReward = getUnClaimReward(dammPoolState, positionState);
                
                if (dammPoolState.tokenBMint.equals(NATIVE_MINT)) {
                  feeAmount = unClaimedReward.feeTokenB.toNumber() / 1e9;
                } else if (dammPoolState.tokenAMint.equals(NATIVE_MINT)) {
                  feeAmount = unClaimedReward.feeTokenA.toNumber() / 1e9;
                }
                
              }
            }
            
            if (feeAmount > 0) {
              await recordClaimedFees(dbPool, tokenId, walletAddress, feeType as 'trading' | 'migration' | 'pool', feeAmount, txid);
            } else {
              console.warn(`⚠️ No ${feeType} fees to record (amount: ${feeAmount})`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to record claimed fees for ${transactionType}:`, error);
          // Don't fail the entire transaction if recording fails
        }

        transactionResults.push({ type: transactionType, txid, success: true });
      } catch (error: any) {
        console.error(`❌ Failed to process ${transactionType} transaction:`, error);
        
        // Check for specific error types and provide helpful messages
        let errorMessage = error.message;
        if (error.message?.includes('Attempt to debit an account but found no record of a prior credit')) {
          errorMessage = 'Insufficient SOL in wallet to pay transaction fees. You need some SOL to claim rewards.';
        } else if (error.message?.includes('insufficient funds')) {
          errorMessage = 'Insufficient SOL in wallet to pay transaction fees. You need some SOL to claim rewards.';
        }
        
        transactionResults.push({ 
          type: transactionType, 
          txid: '', 
          success: false, 
          error: errorMessage 
        });
      }
    }

    // Check if any transactions succeeded
    const successfulTransactions = transactionResults.filter(result => result.success);
    const failedTransactions = transactionResults.filter(result => !result.success);

    if (successfulTransactions.length === 0) {
      // Find the most relevant error message
      const insufficientFundsError = failedTransactions.find(t => 
        t.error?.includes('Insufficient SOL in wallet') || 
        t.error?.includes('insufficient funds') ||
        t.error?.includes('Attempt to debit an account but found no record of a prior credit')
      );
      
      const errorMessage = insufficientFundsError 
        ? insufficientFundsError.error 
        : `All transactions failed. Failed types: ${failedTransactions.map(t => t.type).join(', ')}`;
      
      res.status(500).json({ 
        error: errorMessage
      });
      return;
    }

    // Return results
    const primaryTxid = successfulTransactions[0]?.txid;
    const message = failedTransactions.length > 0 
      ? `Partially successful: ${successfulTransactions.length}/${allTransactions.length} transactions succeeded`
      : `Successfully claimed ${claimedTypes.join(', ')} fees on token ${tokenId}`;



    res.status(200).json({
      success: true,
      message,
      txid: primaryTxid,
      claimedTypes,
      transactionResults,
      successfulCount: successfulTransactions.length,
      totalCount: allTransactions.length
    });

  } catch (error: any) {
    console.error('💥 === CLAIM API ENDPOINT FAILED ===');
    console.error('❌ Error claiming fees:', error);
    res.status(500).json({ error: `Failed to claim fees: ${error.message || 'Unknown error'}` });
  } finally {
    // Close the pool connection
    await dbPool.end();
  }
}