import { Pool } from 'pg';
import { Coin } from './connection';

// Coins table schema
export const COINS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS coins (
    coin_address VARCHAR(255) PRIMARY KEY,
    coin_name VARCHAR(255) NOT NULL,
    coin_symbol VARCHAR(50) NOT NULL,
    creator_privy_user_id VARCHAR(255) NOT NULL,
    tagged_wallet_twitter_username VARCHAR(255),
    coin_fee_rate DECIMAL(5, 2) NOT NULL,
    metadata_uri TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_graduated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

// Coins table indexes
export const COINS_TABLE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_coins_creator ON coins(creator_privy_user_id);
  CREATE INDEX IF NOT EXISTS idx_coins_graduated ON coins(is_graduated);
  CREATE INDEX IF NOT EXISTS idx_coins_creator_graduated ON coins(creator_privy_user_id, is_graduated);
  CREATE INDEX IF NOT EXISTS idx_coins_created_at ON coins(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_coins_tagged_wallet ON coins(tagged_wallet_twitter_username);
`;

// Initialize coins table
export async function initializeCoinsTable(pool: Pool) {
  try {
    await pool.query(COINS_TABLE_SCHEMA);
    await pool.query(COINS_TABLE_INDEXES);
  } catch (error) {
    console.error('❌ Error initializing coins table:', error);
    throw error;
  }
}

// Coin database operations
export async function findCoinByAddress(pool: Pool, coinAddress: string): Promise<Coin | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM coins WHERE coin_address = $1',
      [coinAddress]
    );
    
    if (!result.rows[0]) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Map database column names to interface property names
    return {
      coinName: row.coin_name,
      coinSymbol: row.coin_symbol,
      coinAddress: row.coin_address,
      creatorPrivyUserId: row.creator_privy_user_id,
      taggedWalletTwitterUsername: row.tagged_wallet_twitter_username,
      coinFeeRate: row.coin_fee_rate,
      metadataUri: row.metadata_uri,
      description: row.description,
      category: row.category,
      isGraduated: row.is_graduated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in findCoinByAddress:', error);
    throw error;
  }
}

export async function createCoin(pool: Pool, coinData: Omit<Coin, 'createdAt' | 'updatedAt'>): Promise<Coin> {
  try {
    const result = await pool.query(
      `INSERT INTO coins (
        coin_name, coin_symbol, coin_address, creator_privy_user_id,
        tagged_wallet_twitter_username, coin_fee_rate, metadata_uri,
        description, category, is_graduated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        coinData.coinName,
        coinData.coinSymbol,
        coinData.coinAddress,
        coinData.creatorPrivyUserId,
        coinData.taggedWalletTwitterUsername,
        coinData.coinFeeRate,
        coinData.metadataUri,
        coinData.description,
        coinData.category,
        coinData.isGraduated,
      ]
    );
    
    const row = result.rows[0];
    
    // Map database column names to interface property names
    return {
      coinName: row.coin_name,
      coinSymbol: row.coin_symbol,
      coinAddress: row.coin_address,
      creatorPrivyUserId: row.creator_privy_user_id,
      taggedWalletTwitterUsername: row.tagged_wallet_twitter_username,
      coinFeeRate: row.coin_fee_rate,
      metadataUri: row.metadata_uri,
      description: row.description,
      category: row.category,
      isGraduated: row.is_graduated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in createCoin:', error);
    throw error;
  }
}

export async function updateCoinStats(
  pool: Pool,
  coinAddress: string,
  updates: Partial<{
    isGraduated: boolean;
  }>
): Promise<void> {
  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.isGraduated !== undefined) {
      setClauses.push(`is_graduated = $${paramIndex}`);
      values.push(updates.isGraduated);
      paramIndex++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(coinAddress);

    await pool.query(
      `UPDATE coins SET ${setClauses.join(', ')} WHERE coin_address = $${paramIndex}`,
      values
    );
  } catch (error) {
    console.error('❌ Error in updateCoinStats:', error);
    throw error;
  }
}

export async function getTokenDescription(pool: Pool, coinAddress: string): Promise<string | null> {
  try {
    const result = await pool.query(
      'SELECT description FROM coins WHERE coin_address = $1',
      [coinAddress]
    );
    return result.rows[0]?.description || null;
  } catch (error) {
    console.error('❌ Error in getTokenDescription:', error);
    throw error;
  }
}

export async function getTokenCategory(pool: Pool, coinAddress: string): Promise<string | null> {
  try {
    const result = await pool.query(
      'SELECT category FROM coins WHERE coin_address = $1',
      [coinAddress]
    );
    return result.rows[0]?.category || null;
  } catch (error) {
    console.error('❌ Error in getTokenCategory:', error);
    throw error;
  }
}

export async function getUserCoinsByPrivyId(pool: Pool, privyUserId: string): Promise<any[]> {
  try {
    // Apply filtering: show coins with no tagging OR where creator tagged themselves
    const result = await pool.query(
      `SELECT 
        c.coin_name, c.coin_symbol, c.coin_address, c.is_graduated,
        c.metadata_uri, c.creator_privy_user_id, c.tagged_wallet_twitter_username
      FROM coins c
      LEFT JOIN tagged_wallets tw ON c.tagged_wallet_twitter_username = tw.twitter_username
      LEFT JOIN users creator_user ON creator_user.privy_user_id = c.creator_privy_user_id
      WHERE c.creator_privy_user_id = $1
      AND (
        c.tagged_wallet_twitter_username IS NULL OR
        c.tagged_wallet_twitter_username = '' OR
        LOWER(tw.twitter_username) = LOWER(creator_user.twitter_username)
      )
      ORDER BY c.created_at DESC`,
      [privyUserId]
    );
    
    // Just return the coin addresses and basic data - let frontend handle Jupiter data
    return result.rows.map(row => ({
      coinName: row.coin_name || '',
      coinSymbol: row.coin_symbol || '',
      coinAddress: row.coin_address || '',
      isGraduated: row.is_graduated || false,
      // Frontend will use coinAddress to fetch Jupiter data via queries
    }));
  } catch (error) {
    console.error('❌ Error in getUserCoinsByPrivyId:', error);
    throw error;
  }
}

export async function getUserCoins(pool: Pool, username: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT 
        c.coin_name, c.coin_symbol, c.coin_address, c.is_graduated,
        c.metadata_uri, c.creator_privy_user_id, c.tagged_wallet_twitter_username
      FROM coins c
      JOIN users u ON c.creator_privy_user_id = u.privy_user_id
      WHERE LOWER(u.twitter_username) = LOWER($1)
      ORDER BY c.created_at DESC`,
      [username]
    );
    
    // Just return the coin addresses and basic data - let frontend handle Jupiter data
    return result.rows.map(row => ({
      coinName: row.coin_name || '',
      coinSymbol: row.coin_symbol || '',
      coinAddress: row.coin_address || '',
      isGraduated: row.is_graduated || false,
      // Frontend will use coinAddress to fetch Jupiter data via queries
    }));
  } catch (error) {
    console.error('❌ Error in getUserCoins:', error);
    throw error;
  }
}

export async function getCoinsByTaggedUser(pool: Pool, taggedUserTwitterUsername: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT 
        c.coin_name, c.coin_symbol, c.coin_address, c.is_graduated,
        c.metadata_uri, c.creator_privy_user_id, c.tagged_wallet_twitter_username
      FROM coins c
      JOIN tagged_wallets tw ON c.tagged_wallet_twitter_username = tw.twitter_username
      WHERE LOWER(tw.twitter_username) = LOWER($1)
      ORDER BY c.created_at DESC`,
      [taggedUserTwitterUsername]
    );
    
    // Just return the coin addresses and basic data - let frontend handle Jupiter data
    return result.rows.map(row => ({
      coinName: row.coin_name || '',
      coinSymbol: row.coin_symbol || '',
      coinAddress: row.coin_address || '',
      isGraduated: row.is_graduated || false,
      creatorPrivyUserId: row.creator_privy_user_id || '',
      // Frontend will use coinAddress to fetch Jupiter data via queries
    }));
  } catch (error) {
    console.error('❌ Error in getCoinsByTaggedUser:', error);
    throw error;
  }
}


