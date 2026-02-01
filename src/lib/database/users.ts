import { Pool } from 'pg';
import { User } from './connection';

// Users table schema
export const USERS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    privy_user_id VARCHAR(255) PRIMARY KEY,
    privy_wallet_id VARCHAR(255) UNIQUE NOT NULL,
    privy_wallet_address VARCHAR(255) UNIQUE NOT NULL,
    twitter_id VARCHAR(255) UNIQUE NOT NULL,
    twitter_username VARCHAR(255) UNIQUE NOT NULL,
    twitter_display_name VARCHAR(255) NOT NULL,
    twitter_image_url TEXT NOT NULL,
    coins_created INTEGER DEFAULT 0,
    coins_graduated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

// Users table indexes
export const USERS_TABLE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_users_privy_wallet_id ON users(privy_wallet_id);
  CREATE INDEX IF NOT EXISTS idx_users_privy_wallet_address ON users(privy_wallet_address);
  CREATE INDEX IF NOT EXISTS idx_users_twitter_username ON users(twitter_username);
  CREATE INDEX IF NOT EXISTS idx_users_twitter_username_lower ON users(LOWER(twitter_username));
  CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
`;

// Initialize users table
export async function initializeUsersTable(pool: Pool) {
  try {
    await pool.query(USERS_TABLE_SCHEMA);
    await pool.query(USERS_TABLE_INDEXES);
  } catch (error) {
    console.error('❌ Error initializing users table:', error);
    throw error;
  }
}

export async function findUserByTwitterUsername(pool: Pool, twitterUsername: string): Promise<User | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(twitter_username) = LOWER($1)',
      [twitterUsername]
    );
    
    if (!result.rows[0]) return null;
    
    // Map snake_case database fields to camelCase TypeScript fields
    const user: User = {
      privyUserId: result.rows[0].privy_user_id,
      privyWalletId: result.rows[0].privy_wallet_id,
      privyWalletAddress: result.rows[0].privy_wallet_address,
      twitterId: result.rows[0].twitter_id,
      twitterUsername: result.rows[0].twitter_username,
      twitterDisplayName: result.rows[0].twitter_display_name,
      twitterImageUrl: result.rows[0].twitter_image_url,
      walletDisplayName: result.rows[0].wallet_display_name,
      isWalletOnly: result.rows[0].is_wallet_only,
      coinsCreated: result.rows[0].coins_created,
      coinsGraduated: result.rows[0].coins_graduated,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
    
    return user;
  } catch (error) {
    console.error('❌ Error in findUserByTwitterUsername:', error);
    throw error;
  }
}

export async function findUserByTwitterId(pool: Pool, twitterId: string): Promise<User | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE twitter_id = $1',
      [twitterId]
    );
    
    if (!result.rows[0]) return null;
    
    // Map snake_case database fields to camelCase TypeScript fields
    const user: User = {
      privyUserId: result.rows[0].privy_user_id,
      privyWalletId: result.rows[0].privy_wallet_id,
      privyWalletAddress: result.rows[0].privy_wallet_address,
      twitterId: result.rows[0].twitter_id,
      twitterUsername: result.rows[0].twitter_username,
      twitterDisplayName: result.rows[0].twitter_display_name,
      twitterImageUrl: result.rows[0].twitter_image_url,
      walletDisplayName: result.rows[0].wallet_display_name,
      isWalletOnly: result.rows[0].is_wallet_only,
      coinsCreated: result.rows[0].coins_created,
      coinsGraduated: result.rows[0].coins_graduated,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
    
    return user;
  } catch (error) {
    console.error('❌ Error in findUserByTwitterId:', error);
    throw error;
  }
}

export async function findUserByPrivyUserId(pool: Pool, privyUserId: string): Promise<User | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE privy_user_id = $1',
      [privyUserId]
    );
    
    if (!result.rows[0]) return null;
    
    // Map snake_case database fields to camelCase TypeScript fields
    const user: User = {
      privyUserId: result.rows[0].privy_user_id,
      privyWalletId: result.rows[0].privy_wallet_id,
      privyWalletAddress: result.rows[0].privy_wallet_address,
      twitterId: result.rows[0].twitter_id,
      twitterUsername: result.rows[0].twitter_username,
      twitterDisplayName: result.rows[0].twitter_display_name,
      twitterImageUrl: result.rows[0].twitter_image_url,
      walletDisplayName: result.rows[0].wallet_display_name,
      isWalletOnly: result.rows[0].is_wallet_only,
      coinsCreated: result.rows[0].coins_created,
      coinsGraduated: result.rows[0].coins_graduated,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
    
    return user;
  } catch (error) {
    console.error('❌ Error in findUserByPrivyUserId:', error);
    throw error;
  }
}

export async function createUser(pool: Pool, userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
  try {
    const result = await pool.query(
      `INSERT INTO users (
        privy_user_id, privy_wallet_id, privy_wallet_address, twitter_id, twitter_username, 
        twitter_display_name, twitter_image_url, wallet_display_name, is_wallet_only, coins_created, coins_graduated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        userData.privyUserId,
        userData.privyWalletId,
        userData.privyWalletAddress,
        userData.twitterId,
        userData.twitterUsername,
        userData.twitterDisplayName,
        userData.twitterImageUrl,
        userData.walletDisplayName,
        userData.isWalletOnly,
        userData.coinsCreated,
        userData.coinsGraduated,
      ]
        );

    // Map snake_case database fields to camelCase TypeScript fields
    const user: User = {
      privyUserId: result.rows[0].privy_user_id,
      privyWalletId: result.rows[0].privy_wallet_id,
      privyWalletAddress: result.rows[0].privy_wallet_address,
      twitterId: result.rows[0].twitter_id,
      twitterUsername: result.rows[0].twitter_username,
      twitterDisplayName: result.rows[0].twitter_display_name,
      twitterImageUrl: result.rows[0].twitter_image_url,
      walletDisplayName: result.rows[0].wallet_display_name,
      isWalletOnly: result.rows[0].is_wallet_only,
      coinsCreated: result.rows[0].coins_created,
      coinsGraduated: result.rows[0].coins_graduated,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
    
    return user;
  } catch (error) {
    console.error('❌ Error in createUser:', error);
    throw error;
  }
}

export async function updateUserStats(
  pool: Pool,
  privyUserId: string,
  updates: Partial<{
    twitterId?: string;
    twitterUsername?: string;
    twitterDisplayName?: string;
    twitterImageUrl?: string;
    coinsCreated?: number;
    coinsGraduated?: number;
  }>
): Promise<void> {
  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.coinsCreated !== undefined) {
      setClauses.push(`coins_created = $${paramIndex}`);
      values.push(updates.coinsCreated);
      paramIndex++;
    }
    if (updates.coinsGraduated !== undefined) {
      setClauses.push(`coins_graduated = $${paramIndex}`);
      values.push(updates.coinsGraduated);
      paramIndex++;
    }

    values.push(privyUserId);

    await pool.query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE privy_user_id = $${paramIndex}`,
      values
    );
  } catch (error) {
    console.error('❌ Error in updateUserStats:', error);
    throw error;
  }
}

export async function updateUserWalletAddress(pool: Pool, privyUserId: string, walletAddress: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE users SET privy_wallet_address = $1, updated_at = NOW() WHERE privy_user_id = $2`,
      [walletAddress, privyUserId]
    );
  } catch (error) {
    console.error('❌ Error in updateUserWalletAddress:', error);
    throw error;
  }
}

export async function updateUserTwitterInfo(
  pool: Pool,
  privyUserId: string,
  updates: {
    twitterId?: string;
    twitterUsername?: string;
    twitterDisplayName?: string;
    twitterImageUrl?: string;
  }
): Promise<void> {
  try {
    // First, get the current user to check if Twitter username is changing
    const currentUser = await findUserByPrivyUserId(pool, privyUserId);
    const oldTwitterUsername = currentUser?.twitterUsername;
    
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.twitterUsername !== undefined) {
      setClauses.push(`twitter_username = $${paramIndex}`);
      values.push(updates.twitterUsername);
      paramIndex++;
    }
    if (updates.twitterDisplayName !== undefined) {
      setClauses.push(`twitter_display_name = $${paramIndex}`);
      values.push(updates.twitterDisplayName);
      paramIndex++;
    }
    if (updates.twitterImageUrl !== undefined) {
      setClauses.push(`twitter_image_url = $${paramIndex}`);
      values.push(updates.twitterImageUrl);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return; // No updates to make
    }

    values.push(privyUserId);

    await pool.query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE privy_user_id = $${paramIndex}`,
      values
    );

    // If Twitter username changed and user had a tagged wallet, update the tagged wallet too
    if (updates.twitterUsername && oldTwitterUsername && updates.twitterUsername !== oldTwitterUsername) {
      try {
        await pool.query(
          'UPDATE tagged_wallets SET twitter_username = $1 WHERE LOWER(twitter_username) = LOWER($2)',
          [updates.twitterUsername, oldTwitterUsername]
        );
      } catch (error) {
        console.error(`❌ Failed to update tagged wallet Twitter username:`, error);
        // Don't throw error - user update should still succeed even if tagged wallet update fails
      }
    }
  } catch (error) {
    console.error('❌ Error in updateUserTwitterInfo:', error);
    throw error;
  }
}

export async function findUserByWalletAddress(pool: Pool, walletAddress: string): Promise<User | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE privy_wallet_address = $1',
      [walletAddress]
    );
    
    if (!result.rows[0]) return null;
    
    // Map snake_case database fields to camelCase TypeScript fields
    const user: User = {
      privyUserId: result.rows[0].privy_user_id,
      privyWalletId: result.rows[0].privy_wallet_id,
      privyWalletAddress: result.rows[0].privy_wallet_address,
      twitterId: result.rows[0].twitter_id,
      twitterUsername: result.rows[0].twitter_username,
      twitterDisplayName: result.rows[0].twitter_display_name,
      twitterImageUrl: result.rows[0].twitter_image_url,
      walletDisplayName: result.rows[0].wallet_display_name,
      isWalletOnly: result.rows[0].is_wallet_only,
      coinsCreated: result.rows[0].coins_created,
      coinsGraduated: result.rows[0].coins_graduated,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
    
    return user;
  } catch (error) {
    console.error('❌ Error in findUserByWalletAddress:', error);
    throw error;
  }
}

export async function findUserByWalletId(pool: Pool, walletId: string): Promise<User | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE privy_wallet_id = $1',
      [walletId]
    );
    
    if (!result.rows[0]) return null;
    
    // Map snake_case database fields to camelCase TypeScript fields
    const user: User = {
      privyUserId: result.rows[0].privy_user_id,
      privyWalletId: result.rows[0].privy_wallet_id,
      privyWalletAddress: result.rows[0].privy_wallet_address,
      twitterId: result.rows[0].twitter_id,
      twitterUsername: result.rows[0].twitter_username,
      twitterDisplayName: result.rows[0].twitter_display_name,
      twitterImageUrl: result.rows[0].twitter_image_url,
      walletDisplayName: result.rows[0].wallet_display_name,
      isWalletOnly: result.rows[0].is_wallet_only,
      coinsCreated: result.rows[0].coins_created,
      coinsGraduated: result.rows[0].coins_graduated,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
    
    return user;
  } catch (error) {
    console.error('❌ Error in findUserByWalletId:', error);
    throw error;
  }
}

// Optimized single query to fetch user profile data, coins, and PnL
// Unified function to find user by profile identifier (Twitter username or wallet address)
export async function findUserByProfileIdentifier(pool: Pool, identifier: string): Promise<User | null> {
  try {
    // Determine if identifier is wallet address (44 characters, base58) or Twitter username
    const isWalletAddress = identifier.length === 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(identifier);
    
    if (isWalletAddress) {
      return await findUserByWalletAddress(pool, identifier);
    } else {
      return await findUserByTwitterUsername(pool, identifier);
    }
  } catch (error) {
    console.error('❌ Error in findUserByProfileIdentifier:', error);
    throw error;
  }
}

export async function getUserProfileDataByIdentifier(pool: Pool, identifier: string): Promise<{
  user: User | null;
  coins: Array<{
    coinName: string;
    coinSymbol: string;
    coinAddress: string;
    isGraduated: boolean;
  }>;
  totalPnl: number;
}> {
  try {
    // Check if identifier starts with @ (Twitter user)
    const isTwitterUser = identifier.startsWith('@');
    const cleanIdentifier = isTwitterUser ? identifier.slice(1) : identifier;
    
    // Debug logging
    console.log('🔍 Profile lookup for identifier:', {
      identifier,
      cleanIdentifier,
      isTwitterUser
    });
    
    // Try to find user by both wallet address and Twitter username
    // This is more reliable than trying to guess the type
    const userResult = await pool.query(`
      SELECT 
        u.privy_user_id,
        u.privy_wallet_id,
        u.privy_wallet_address,
        u.twitter_id,
        u.twitter_username,
        u.twitter_display_name,
        u.twitter_image_url,
        u.wallet_display_name,
        u.is_wallet_only,
        u.coins_created,
        u.created_at,
        u.updated_at,
        COALESCE(graduated_count.count, 0) as graduated_count
      FROM users u
      LEFT JOIN (
        SELECT 
          creator_privy_user_id,
          COUNT(*) as count
        FROM coins 
        WHERE is_graduated = true
        GROUP BY creator_privy_user_id
      ) graduated_count ON graduated_count.creator_privy_user_id = u.privy_user_id
      WHERE u.privy_wallet_address = $1 OR LOWER(u.twitter_username) = LOWER($2)
    `, [cleanIdentifier, cleanIdentifier]);
    
    if (!userResult.rows[0]) {
      console.log('❌ No user found for identifier:', identifier);
      return {
        user: null,
        coins: [],
        totalPnl: 0
      };
    }
    
    console.log('✅ User found:', {
      privyUserId: userResult.rows[0].privy_user_id,
      walletAddress: userResult.rows[0].privy_wallet_address,
      twitterUsername: userResult.rows[0].twitter_username,
      isWalletOnly: userResult.rows[0].is_wallet_only
    });
    
    const userRow = userResult.rows[0];
    
    // Get user's created coins
    const coinsResult = await pool.query(`
      SELECT 
        coin_name,
        coin_symbol,
        coin_address,
        is_graduated,
        created_at
      FROM coins 
      WHERE creator_privy_user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userRow.privy_user_id]);
    
    // Get user's PnL from trade_history
    const pnlResult = await pool.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN trade_type = 'SELL' THEN sol_amount
          WHEN trade_type = 'BUY' THEN -sol_amount
          ELSE 0
        END
      ), 0) as total_pnl_lamports
      FROM trade_history 
      WHERE user_wallet_address = $1
    `, [userRow.privy_wallet_address]);
    
    // Parse the user data
    const user: User = {
      privyUserId: userRow.privy_user_id,
      privyWalletId: userRow.privy_wallet_id,
      privyWalletAddress: userRow.privy_wallet_address,
      twitterId: userRow.twitter_id,
      twitterUsername: userRow.twitter_username,
      twitterDisplayName: userRow.twitter_display_name,
      twitterImageUrl: userRow.twitter_image_url,
      walletDisplayName: userRow.wallet_display_name,
      isWalletOnly: userRow.is_wallet_only,
      coinsCreated: userRow.coins_created,
      // Use the actual count from the coins table
      coinsGraduated: parseInt(userRow.graduated_count) || 0,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
    };
    
    // Parse the coins data
    const coins = coinsResult.rows.map((coin: any) => ({
      coinName: coin.coin_name || '',
      coinSymbol: coin.coin_symbol || '',
      coinAddress: coin.coin_address || '',
      isGraduated: coin.is_graduated || false,
    }));
    
    // Convert PnL from lamports to SOL
    const LAMPORTS_PER_SOL = 1_000_000_000;
    const totalPnlLamports = parseFloat(pnlResult.rows[0]?.total_pnl_lamports || '0');
    const totalPnl = totalPnlLamports / LAMPORTS_PER_SOL;
    
    return {
      user,
      coins,
      totalPnl: isNaN(totalPnl) ? 0 : totalPnl
    };
  } catch (error) {
    console.error('❌ Database error in getUserProfileDataByUsername:', error);
    throw error;
  }
}


