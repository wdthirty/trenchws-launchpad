import { Pool } from 'pg';

export interface ClaimedFee {
  id: number;
  coinAddress: string;
  userWalletAddress: string;
  feeType: 'trading' | 'migration' | 'pool';
  amountSol: number;
  claimedAt: Date;
  transactionSignature?: string;
}

// Initialize claimed fees database table
export async function initializeClaimedFeesDatabase(pool: Pool): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS claimed_fees (
        id SERIAL PRIMARY KEY,
        coin_address VARCHAR(255) NOT NULL,
        user_wallet_address VARCHAR(255) NOT NULL,
        fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('trading', 'migration', 'pool')),
        amount_sol DECIMAL(20, 9) NOT NULL,
        claimed_at TIMESTAMP DEFAULT NOW(),
        transaction_signature VARCHAR(255),
        
        UNIQUE(coin_address, user_wallet_address, fee_type, transaction_signature)
      )
    `);

    // Create indexes for performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_claimed_fees_coin ON claimed_fees(coin_address)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_claimed_fees_user ON claimed_fees(user_wallet_address)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_claimed_fees_type ON claimed_fees(fee_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_claimed_fees_timestamp ON claimed_fees(claimed_at DESC)`);

  } catch (error) {
    console.error('❌ Error initializing claimed fees database:', error);
    throw error;
  }
}

// Record when fees are claimed
export async function recordClaimedFees(
  pool: Pool,
  coinAddress: string,
  userWalletAddress: string,
  feeType: 'trading' | 'migration' | 'pool',
  amountSol: number,
  transactionSignature?: string
): Promise<void> {
  try {
    // Try to insert, and if table doesn't exist, initialize it
    try {
      await pool.query(`
        INSERT INTO claimed_fees (
          coin_address, user_wallet_address, fee_type, amount_sol, transaction_signature
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (coin_address, user_wallet_address, fee_type, transaction_signature) DO NOTHING
      `, [coinAddress, userWalletAddress, feeType, amountSol, transactionSignature]);
    } catch (error: any) {
      // If table doesn't exist, initialize it and try again
      if (error.code === '42P01' && error.message.includes('relation "claimed_fees" does not exist')) {
        await initializeClaimedFeesDatabase(pool);
        
        // Try the insert again after initialization
        await pool.query(`
          INSERT INTO claimed_fees (
            coin_address, user_wallet_address, fee_type, amount_sol, transaction_signature
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (coin_address, user_wallet_address, fee_type, transaction_signature) DO NOTHING
        `, [coinAddress, userWalletAddress, feeType, amountSol, transactionSignature]);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error in recordClaimedFees:', error);
    throw error;
  }
}

// Get total claimed fees for a specific coin
export async function getTotalClaimedFeesForCoin(pool: Pool, coinAddress: string): Promise<{
  tradingFees: number;
  migrationFees: number;
  poolFees: number;
}> {
  // Validate inputs
  if (!pool || typeof pool.query !== 'function') {
    console.warn('Invalid database pool provided to getTotalClaimedFeesForCoin');
    return { tradingFees: 0, migrationFees: 0, poolFees: 0 };
  }
  
  if (!coinAddress || typeof coinAddress !== 'string') {
    console.warn('Invalid coin address provided to getTotalClaimedFeesForCoin');
    return { tradingFees: 0, migrationFees: 0, poolFees: 0 };
  }

  try {
    // Try to query the table, and if it doesn't exist, initialize it
    let result;
    try {
      result = await pool.query(`
        SELECT 
          fee_type,
          SUM(amount_sol) as total_amount
        FROM claimed_fees 
        WHERE coin_address = $1
        GROUP BY fee_type
      `, [coinAddress]);
    } catch (error: any) {
      // If table doesn't exist, initialize it and try again
      if (error.code === '42P01' && error.message.includes('relation "claimed_fees" does not exist')) {
        await initializeClaimedFeesDatabase(pool);
        
        // Try the query again after initialization
        result = await pool.query(`
          SELECT 
            fee_type,
            SUM(amount_sol) as total_amount
        FROM claimed_fees 
        WHERE coin_address = $1
        GROUP BY fee_type
      `, [coinAddress]);
      } else {
        throw error;
      }
    }

    // Initialize default values
    let tradingFees = 0;
    let migrationFees = 0;
    let poolFees = 0;

    // Process results
    for (const row of result.rows) {
      const amount = parseFloat(row.total_amount);
      switch (row.fee_type) {
        case 'trading':
          tradingFees = amount;
          break;
        case 'migration':
          migrationFees = amount;
          break;
        case 'pool':
          poolFees = amount;
          break;
      }
    }



    return { tradingFees, migrationFees, poolFees };
  } catch (error) {
    console.error('❌ Error in getTotalClaimedFeesForCoin:', error);
    throw error;
  }
}

// Get total claimed fees for a specific user and coin
export async function getTotalClaimedFeesForUserAndCoin(
  pool: Pool,
  userWalletAddress: string,
  coinAddress: string
): Promise<{
  tradingFees: number;
  migrationFees: number;
  poolFees: number;
}> {
  try {
    const result = await pool.query(`
      SELECT 
        fee_type,
        SUM(amount_sol) as total_amount
      FROM claimed_fees 
      WHERE user_wallet_address = $1 AND coin_address = $2
      GROUP BY fee_type
    `, [userWalletAddress, coinAddress]);

    // Initialize default values
    let tradingFees = 0;
    let migrationFees = 0;
    let poolFees = 0;

    // Process results
    for (const row of result.rows) {
      const amount = parseFloat(row.total_amount);
      switch (row.fee_type) {
        case 'trading':
          tradingFees = amount;
          break;
        case 'migration':
          migrationFees = amount;
          break;
        case 'pool':
          poolFees = amount;
          break;
      }
    }

    return { tradingFees, migrationFees, poolFees };
  } catch (error) {
    console.error('❌ Error in getTotalClaimedFeesForUserAndCoin:', error);
    throw error;
  }
}

// Get total claimed fees for a user across all coins
export async function getTotalClaimedFeesForUser(pool: Pool, userWalletAddress: string): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT SUM(amount_sol) as total_fees
      FROM claimed_fees 
      WHERE user_wallet_address = $1
    `, [userWalletAddress]);

    return parseFloat(result.rows[0]?.total_fees || '0');
  } catch (error) {
    console.error('❌ Error in getTotalClaimedFeesForUser:', error);
    throw error;
  }
}

// Get all claimed fees for a coin (with user details)
export async function getClaimedFeesHistoryForCoin(
  pool: Pool,
  coinAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<ClaimedFee[]> {
  try {
    const result = await pool.query(`
      SELECT * FROM claimed_fees 
      WHERE coin_address = $1
      ORDER BY claimed_at DESC
      LIMIT $2 OFFSET $3
    `, [coinAddress, limit, offset]);

    return result.rows.map(row => ({
      id: row.id,
      coinAddress: row.coin_address,
      userWalletAddress: row.user_wallet_address,
      feeType: row.fee_type,
      amountSol: parseFloat(row.amount_sol),
      claimedAt: row.claimed_at,
      transactionSignature: row.transaction_signature,
    }));
  } catch (error) {
    console.error('❌ Error in getClaimedFeesHistoryForCoin:', error);
    throw error;
  }
}

// Get all claimed fees for a user
export async function getClaimedFeesHistoryForUser(
  pool: Pool,
  userWalletAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<ClaimedFee[]> {
  try {
    const result = await pool.query(`
      SELECT * FROM claimed_fees 
      WHERE user_wallet_address = $1
      ORDER BY claimed_at DESC
      LIMIT $2 OFFSET $3
    `, [userWalletAddress, limit, offset]);

    return result.rows.map(row => ({
      id: row.id,
      coinAddress: row.coin_address,
      userWalletAddress: row.user_wallet_address,
      feeType: row.fee_type,
      amountSol: parseFloat(row.amount_sol),
      claimedAt: row.claimed_at,
      transactionSignature: row.transaction_signature,
    }));
  } catch (error) {
    console.error('❌ Error in getClaimedFeesHistoryForUser:', error);
    throw error;
  }
}
