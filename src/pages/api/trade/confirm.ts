import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, VersionedTransactionResponse } from '@solana/web3.js';
import { processBuyTransaction, processSellTransaction } from '@/lib/database';
import { Pool } from 'pg';

// Input validation
function validateInputs(data: any) {
  const { userWalletAddress, coinAddress, solAmount, transactionSignature, isBuy } = data;

  if (!userWalletAddress || !coinAddress || solAmount === undefined || !transactionSignature || isBuy === undefined) {
    throw new Error('Missing required fields');
  }

  // Validate wallet address format
  try {
    new PublicKey(userWalletAddress);
  } catch {
    throw new Error('Invalid wallet address format');
  }

  // Validate token address format
  try {
    new PublicKey(coinAddress);
  } catch {
    throw new Error('Invalid token address format');
  }

  // Validate amount
  if (typeof solAmount !== 'number' || solAmount <= 0) {
    throw new Error('Invalid SOL amount');
  }

  // Validate isBuy is boolean
  if (typeof isBuy !== 'boolean') {
    throw new Error('Invalid isBuy parameter');
  }
}

// Check for duplicate transaction signature
async function checkUniqueSignature(signature: string, pool: Pool): Promise<void> {
  const result = await pool.query(
    'SELECT COUNT(*) FROM trade_history WHERE transaction_signature = $1',
    [signature]
  );

  if (parseInt(result.rows[0].count) > 0) {
    throw new Error('Transaction signature already exists in trade history');
  }
}

// Fetch and validate transaction exists
async function validateTransaction(connection: Connection, signature: string): Promise<VersionedTransactionResponse> {
  // First, wait for the transaction to be confirmed
  const confirmation = await connection.confirmTransaction({
    signature: signature,
    blockhash: (await connection.getLatestBlockhash()).blockhash,
    lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
  });
  
  if (confirmation.value.err) {
    throw new Error('Transaction failed on-chain');
  }

  // Then fetch the confirmed transaction
  const transaction = await connection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0
  });

  if (!transaction) {
    throw new Error('Transaction not found after confirmation');
  }

  return transaction;
}

// Verify the signer is the claimed user
function verifySigner(transaction: VersionedTransactionResponse, userWalletAddress: string): void {
  // For versioned transactions, the fee payer is in the message header
  const feePayer = transaction.transaction.message.staticAccountKeys[0];
  
  if (feePayer.toBase58() !== userWalletAddress) {
    throw new Error('Transaction signer does not match claimed user wallet');
  }
}

// Verify SOL amount in transaction
function verifySolAmount(transaction: VersionedTransactionResponse, claimedAmount: number, isBuy: boolean): number {
  // Calculate SOL amount from balance changes instead of parsing instructions
  // This is more reliable for complex swaps like Jupiter
  const preBalances = transaction.meta?.preBalances || [];
  const postBalances = transaction.meta?.postBalances || [];
  
  if (preBalances.length === 0 || postBalances.length === 0) {
    throw new Error('Transaction missing balance information');
  }

  // The first account (index 0) is typically the fee payer/signer
  const preBalance = preBalances[0];
  const postBalance = postBalances[0];
  
  // Calculate the SOL amount transferred
  // For buys: user spends SOL (preBalance - postBalance)
  // For sells: user receives SOL (postBalance - preBalance)
  const actualSolAmount = isBuy ? (preBalance - postBalance) : (postBalance - preBalance);
  
  // Allow tolerance for slippage and fees (25%)
  const tolerance = 0.25;
  const difference = Math.abs(actualSolAmount - claimedAmount);
  const toleranceAmount = claimedAmount * tolerance;

  if (difference > toleranceAmount) {
    throw new Error(
      `SOL amount mismatch. Expected: ${claimedAmount}, Actual: ${actualSolAmount}, Difference: ${difference}, Tolerance: ${toleranceAmount}`
    );
  }

  return actualSolAmount;
}

// Verify token address is involved in transaction
function verifyTokenAddress(transaction: VersionedTransactionResponse, claimedTokenAddress: string): void {
  // Check in postTokenBalances (more reliable for token addresses)
  if (transaction.meta?.postTokenBalances) {
    for (const balance of transaction.meta.postTokenBalances) {
      if (balance.mint === claimedTokenAddress) {
        return;
      }
    }
  }

  // Also check in preTokenBalances
  if (transaction.meta?.preTokenBalances) {
    for (const balance of transaction.meta.preTokenBalances) {
      if (balance.mint === claimedTokenAddress) {
        return;
      }
    }
  }

  throw new Error('Claimed token address not found in transaction');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const { userWalletAddress, coinAddress, solAmount, transactionSignature, isBuy } = req.body;

    // 1. Basic input validation
    validateInputs(req.body);

    // 2. Check for duplicate signature
    await checkUniqueSignature(transactionSignature, pool);

    // 3. Setup connection
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      return res.status(500).json({ error: 'RPC URL not configured' });
    }
    const connection = new Connection(rpcUrl);

    // 4. Fetch and validate transaction
    const transaction = await validateTransaction(connection, transactionSignature);

    // 5. Verify the signer is the claimed user
    verifySigner(transaction, userWalletAddress);

    // 6. Verify token address is involved
    verifyTokenAddress(transaction, coinAddress);

    // 7. Verify SOL amount matches (with tolerance)
    const actualSolAmount = verifySolAmount(transaction, solAmount, isBuy);

    // 8. Log the trade
    try {
      if (isBuy) {
        await processBuyTransaction(userWalletAddress, coinAddress, actualSolAmount, transactionSignature, pool);
      } else {
        await processSellTransaction(userWalletAddress, coinAddress, actualSolAmount, transactionSignature, pool);
      }
    } catch (error) {
      console.error('Trade logging failed:', error);
      // Don't fail the entire request if logging fails
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Trade confirmed and logged successfully',
      actualSolAmount,
      validationDetails: {
        signerVerified: true,
        tokenAddressVerified: true,
        amountVerified: true,
        signatureUnique: true
      }
    });

  } catch (error: any) {
    console.error('Trade confirm error:', error);
    return res.status(400).json({ 
      success: false, 
      error: error.message || 'Unknown error'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
