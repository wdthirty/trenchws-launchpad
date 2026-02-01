import { Pool } from 'pg';
import { calculateLaunchpadRewardWithBoost } from '../LaunchpadRewards';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin } from './connection';

// Database interfaces

export interface TradeHistory {
  id: number;
  userWalletAddress: string;
  coinAddress: string;
  transactionSignature: string;
  tradeType: 'BUY' | 'SELL';
  solAmount: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}




// Trade history table schema
export const TRADE_HISTORY_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS trade_history (
    id SERIAL PRIMARY KEY,
    user_wallet_address VARCHAR(255) NOT NULL,
    coin_address VARCHAR(255) NOT NULL,
    transaction_signature VARCHAR(255) UNIQUE NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    sol_amount DECIMAL(20, 9) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;


// Trade history table indexes
export const TRADE_HISTORY_TABLE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_trade_history_wallet ON trade_history(user_wallet_address);
  CREATE INDEX IF NOT EXISTS idx_trade_history_coin ON trade_history(coin_address);
  CREATE INDEX IF NOT EXISTS idx_trade_history_timestamp ON trade_history(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_trade_history_signature ON trade_history(transaction_signature);
`;

// Initialize trade history database table
export async function initializeTradeHistoryTable(pool: Pool) {
  try {
    await pool.query(TRADE_HISTORY_TABLE_SCHEMA);
    await pool.query(TRADE_HISTORY_TABLE_INDEXES);
  } catch (error) {
    console.error('❌ Error initializing trade history table:', error);
    throw error;
  }
}



// Log a trade
export async function logTrade(
  userWalletAddress: string,
  coinAddress: string,
  transactionSignature: string,
  tradeType: 'BUY' | 'SELL',
  solAmount: number,
  pool: Pool
): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO trade_history (
        user_wallet_address, coin_address, transaction_signature, trade_type, sol_amount, timestamp
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [userWalletAddress, coinAddress, transactionSignature, tradeType, solAmount]);
  } catch (error) {
    console.error('❌ Error in logTrade:', error);
    throw error;
  }
}

// Process buy transaction
export async function processBuyTransaction(
  userWalletAddress: string,
  coinAddress: string,
  solAmount: number,
  transactionSignature: string,
  pool: Pool
): Promise<{ LaunchpadReward: number; isBoosted: boolean; boostMultiplier: number }> {
  const { LaunchpadReward, isBoosted, boostMultiplier } = calculateLaunchpadRewardWithBoost(solAmount, coinAddress);
  
  // Only log the trade - no position tracking needed
  await logTrade(userWalletAddress, coinAddress, transactionSignature, 'BUY', solAmount, pool);
  
  return { LaunchpadReward, isBoosted, boostMultiplier };
}

// Process sell transaction
export async function processSellTransaction(
  userWalletAddress: string,
  coinAddress: string,
  solAmount: number,
  transactionSignature: string,
  pool: Pool
): Promise<{ LaunchpadReward: number; realizedPnl: number; isBoosted: boolean; boostMultiplier: number }> {
  const { LaunchpadReward, isBoosted, boostMultiplier } = calculateLaunchpadRewardWithBoost(solAmount, coinAddress);
  
  // Calculate realized PnL from trade history
  const realizedPnl = await calculateRealizedPnlFromTrades(userWalletAddress, coinAddress, solAmount, pool);
  
  // Only log the trade
  await logTrade(userWalletAddress, coinAddress, transactionSignature, 'SELL', solAmount, pool);
  
  return { LaunchpadReward, realizedPnl, isBoosted, boostMultiplier };
}

// Calculate realized PnL from trade history
async function calculateRealizedPnlFromTrades(
  userWalletAddress: string,
  coinAddress: string,
  sellAmount: number,
  pool: Pool
): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT 
        SUM(CASE WHEN trade_type = 'BUY' THEN sol_amount ELSE 0 END) as total_sol_in,
        SUM(CASE WHEN trade_type = 'SELL' THEN sol_amount ELSE 0 END) as total_sol_out
      FROM trade_history 
      WHERE user_wallet_address = $1 AND coin_address = $2
    `, [userWalletAddress, coinAddress]);
    
    const totalSolIn = parseFloat(result.rows[0]?.total_sol_in || '0');
    const totalSolOut = parseFloat(result.rows[0]?.total_sol_out || '0');
    
    // Calculate realized PnL: (total SOL out + current sell) - total SOL in
    const realizedPnl = (totalSolOut + sellAmount) - totalSolIn;
    return realizedPnl / LAMPORTS_PER_SOL; // Convert from lamports to SOL
  } catch (error) {
    console.error('❌ Error calculating realized PnL from trades:', error);
    return 0;
  }
}


// Get user's total PnL across all coins (convert from lamports to SOL)
export async function getUserTotalPnl(userWalletAddress: string, pool: Pool): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN trade_type = 'SELL' THEN sol_amount
          WHEN trade_type = 'BUY' THEN -sol_amount
          ELSE 0
        END
      ), 0) as total_pnl
      FROM trade_history 
      WHERE user_wallet_address = $1
    `, [userWalletAddress]);
    
    const totalPnlLamports = parseFloat(result.rows[0]?.total_pnl || '0');
    return totalPnlLamports / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('❌ Error in getUserTotalPnl:', error);
    throw error;
  }
}

// Get user's total SOL traded (raw amount without boosts)
export async function getUserTotalSolTraded(userWalletAddress: string, pool: Pool): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT SUM(sol_amount) as total_sol_traded_lamports
      FROM trade_history 
      WHERE user_wallet_address = $1
    `, [userWalletAddress]);
    
    const totalSolTradedLamports = parseFloat(result.rows[0]?.total_sol_traded_lamports || '0');
    return totalSolTradedLamports / LAMPORTS_PER_SOL; // Convert lamports to SOL
  } catch (error) {
    console.error('❌ Error in getUserTotalSolTraded:', error);
    throw error;
  }
}

// Get user's total $Launchpad rewards earned with boosts (convert from lamports to SOL)
export async function getUserTotalLaunchpadRewards(userWalletAddress: string, pool: Pool): Promise<number> {
  try {
    // Get detailed trade history to calculate boosts per coin
    const result = await pool.query(`
      SELECT coin_address, SUM(sol_amount) as total_sol_traded_lamports
      FROM trade_history 
      WHERE user_wallet_address = $1
      GROUP BY coin_address
    `, [userWalletAddress]);
    
    let totalLaunchpadRewards = 0;
    
    for (const row of result.rows) {
      const coinAddress = row.coin_address;
      const solAmount = parseFloat(row.total_sol_traded_lamports) / LAMPORTS_PER_SOL; // Convert lamports to SOL
      
      // Calculate Launchpad rewards with potential boost for this specific coin
      const { LaunchpadReward } = calculateLaunchpadRewardWithBoost(solAmount, coinAddress);
      totalLaunchpadRewards += LaunchpadReward;
    }
    
    return totalLaunchpadRewards;
  } catch (error) {
    console.error('❌ Error in getUserTotalLaunchpadRewards:', error);
    throw error;
  }
}

// Get user's trade history
export async function getUserTradeHistory(
  userWalletAddress: string,
  limit: number = 50,
  offset: number = 0,
  pool: Pool
): Promise<TradeHistory[]> {
  try {
    const result = await pool.query(`
      SELECT * FROM trade_history 
      WHERE user_wallet_address = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `, [userWalletAddress, limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      userWalletAddress: row.user_wallet_address,
      coinAddress: row.coin_address,
      transactionSignature: row.transaction_signature,
      tradeType: row.trade_type,
      solAmount: parseFloat(row.sol_amount) / LAMPORTS_PER_SOL, // Convert lamports to SOL
      timestamp: row.timestamp,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('❌ Error in getUserTradeHistory:', error);
    throw error;
  }
}

// Get coin's trade history
export async function getCoinTradeHistory(
  coinAddress: string,
  limit: number = 50,
  offset: number = 0,
  pool: Pool
): Promise<TradeHistory[]> {
  try {
    const result = await pool.query(`
      SELECT * FROM trade_history 
      WHERE coin_address = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `, [coinAddress, limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      userWalletAddress: row.user_wallet_address,
      coinAddress: row.coin_address,
      transactionSignature: row.transaction_signature,
      tradeType: row.trade_type,
      solAmount: parseFloat(row.sol_amount) / LAMPORTS_PER_SOL, // Convert lamports to SOL
      timestamp: row.timestamp,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('❌ Error in getCoinTradeHistory:', error);
    throw error;
  }
}



// Get coin by address
export async function getCoin(coinAddress: string, pool: Pool): Promise<Coin | null> {
  try {
    const result = await pool.query(`
      SELECT * FROM coins WHERE coin_address = $1
    `, [coinAddress]);
    
    if (!result.rows[0]) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      coinName: row.coin_name,
      coinSymbol: row.coin_symbol,
      coinAddress: row.coin_address,
      creatorPrivyUserId: row.creator_privy_user_id,
      taggedWalletTwitterUsername: row.tagged_wallet_twitter_username,
      coinFeeRate: row.coin_fee_rate,
      metadataUri: row.metadata_uri,
      isGraduated: row.is_graduated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in getCoin:', error);
    throw error;
  }
}

// Check if coin exists in our database (was created on launchpad.fun)
export async function isLaunchpadCoin(coinAddress: string, pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM coins WHERE coin_address = $1
    `, [coinAddress]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('❌ Error in isLaunchpadCoin:', error);
    throw error;
  }
}
