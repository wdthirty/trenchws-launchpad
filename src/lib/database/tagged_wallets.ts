import { Pool } from 'pg';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// TaggedWallet interface
export interface TaggedWallet {
  twitterUsername: string;
  walletAddress: string;
  walletPrivateKey: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Tagged wallets table schema
export const TAGGED_WALLETS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tagged_wallets (
    twitter_username VARCHAR(255) PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    wallet_private_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

// Tagged wallets table indexes
export const TAGGED_WALLETS_TABLE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_tagged_wallets_address ON tagged_wallets(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_tagged_wallets_twitter_username ON tagged_wallets(twitter_username);
  CREATE INDEX IF NOT EXISTS idx_tagged_wallets_twitter_username_lower ON tagged_wallets(LOWER(twitter_username));
`;

// Initialize tagged wallets table
export async function initializeTaggedWalletsTable(pool: Pool) {
  try {
    await pool.query(TAGGED_WALLETS_TABLE_SCHEMA);
    await pool.query(TAGGED_WALLETS_TABLE_INDEXES);
  } catch (error) {
    console.error('❌ Error initializing tagged wallets table:', error);
    throw error;
  }
}

// Tagged wallet database operations

export async function findTaggedWalletByAddress(pool: Pool, walletAddress: string): Promise<TaggedWallet | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM tagged_wallets WHERE wallet_address = $1',
      [walletAddress]
    );
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    
    return {
      twitterUsername: row.twitter_username,
      walletAddress: row.wallet_address,
      walletPrivateKey: row.wallet_private_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in findTaggedWalletByAddress:', error);
    throw error;
  }
}

export async function findTaggedWalletByTwitterUsername(pool: Pool, twitterUsername: string): Promise<TaggedWallet | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM tagged_wallets WHERE LOWER(twitter_username) = LOWER($1)',
      [twitterUsername]
    );
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    
    return {
      twitterUsername: row.twitter_username,
      walletAddress: row.wallet_address,
      walletPrivateKey: row.wallet_private_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in findTaggedWalletByTwitterUsername:', error);
    throw error;
  }
}

export async function createTaggedWallet(pool: Pool, taggedWalletData: Omit<TaggedWallet, 'createdAt' | 'updatedAt'>): Promise<TaggedWallet> {
  try {
    const result = await pool.query(
      `INSERT INTO tagged_wallets (
        twitter_username, wallet_address, wallet_private_key
      ) VALUES ($1, $2, $3) RETURNING *`,
      [
        taggedWalletData.twitterUsername,
        taggedWalletData.walletAddress,
        taggedWalletData.walletPrivateKey,
      ]
    );
    
    const row = result.rows[0];
    
    return {
      twitterUsername: row.twitter_username,
      walletAddress: row.wallet_address,
      walletPrivateKey: row.wallet_private_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in createTaggedWallet:', error);
    throw error;
  }
}

export async function deleteTaggedWallet(pool: Pool, twitterUsername: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'DELETE FROM tagged_wallets WHERE twitter_username = $1',
      [twitterUsername]
    );
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ Error in deleteTaggedWallet:', error);
    throw error;
  }
}

export async function getAllTaggedWallets(pool: Pool): Promise<TaggedWallet[]> {
  try {
    const result = await pool.query('SELECT * FROM tagged_wallets ORDER BY created_at DESC');
    
    return result.rows.map(row => ({
      twitterUsername: row.twitter_username,
      walletAddress: row.wallet_address,
      walletPrivateKey: row.wallet_private_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('❌ Error in getAllTaggedWallets:', error);
    throw error;
  }
}



// Helper function to normalize Twitter username
function normalizeTwitterUsername(username: string): string {
  if (!username) return '';
  
  // Remove leading/trailing whitespace
  let normalized = username.trim();
  
  // Remove @ symbol if present
  if (normalized.startsWith('@')) {
    normalized = normalized.substring(1);
  }
  
  // Remove any other @ symbols
  normalized = normalized.replace(/@/g, '');
  
  // Only allow alphanumeric characters and underscores
  normalized = normalized.replace(/[^a-zA-Z0-9_]/g, '');
  
  // Convert to lowercase for consistency
  normalized = normalized.toLowerCase();
  
  return normalized;
}

async function createTaggedWalletForTwitterUsername(pool: Pool, twitterUsername: string): Promise<TaggedWallet> {
  const keypair = Keypair.generate();
  const privateKey = bs58.encode(keypair.secretKey);
  const publicKey = keypair.publicKey.toBase58();

  // Create the tagged wallet directly without Privy integration
  return await createTaggedWallet(pool, {
    twitterUsername,
    walletAddress: publicKey,
    walletPrivateKey: privateKey,
  });
}

// Helper function to create or get tagged wallet for coin creation
export async function getOrCreateTaggedWalletForCoin(
  pool: Pool,
  twitterUsername: string
): Promise<TaggedWallet> {
  // Normalize the Twitter username for consistency
  const normalizedUsername = normalizeTwitterUsername(twitterUsername);
  
  if (!normalizedUsername) {
    throw new Error('Invalid Twitter username format');
  }
  
  // First, try to find existing tagged wallet by twitter username
  let taggedWallet = await findTaggedWalletByTwitterUsername(pool, normalizedUsername);
  
  if (taggedWallet) {
    return taggedWallet;
  }
  
  // If not found, create new tagged wallet and store it
  return await createTaggedWalletForTwitterUsername(pool, normalizedUsername);
}
