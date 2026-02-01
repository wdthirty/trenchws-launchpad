import { Pool } from 'pg';
import { CoinTransferStatus } from './connection';

// Coin transfer status table schema
export const COIN_TRANSFER_STATUS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS coin_transfer_status (
    coin_address VARCHAR(255) PRIMARY KEY,
    current_owner VARCHAR(255) NOT NULL,
    previous_owner VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('CTO', 'Acquired')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

// Coin transfer status table indexes
export const COIN_TRANSFER_STATUS_TABLE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_coin_transfer_status_current_owner ON coin_transfer_status(current_owner);
  CREATE INDEX IF NOT EXISTS idx_coin_transfer_status_previous_owner ON coin_transfer_status(previous_owner);
  CREATE INDEX IF NOT EXISTS idx_coin_transfer_status_status ON coin_transfer_status(status);
  CREATE INDEX IF NOT EXISTS idx_coin_transfer_status_created_at ON coin_transfer_status(created_at DESC);
`;

// Initialize coin transfer status table
export async function initializeCoinTransferStatusTable(pool: Pool) {
  try {
    await pool.query(COIN_TRANSFER_STATUS_TABLE_SCHEMA);
    await pool.query(COIN_TRANSFER_STATUS_TABLE_INDEXES);
  } catch (error) {
    console.error('❌ Error initializing coin_transfer_status table:', error);
    throw error;
  }
}

// Coin transfer status database operations
export async function findCoinTransferStatusByAddress(pool: Pool, coinAddress: string): Promise<CoinTransferStatus | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM coin_transfer_status WHERE coin_address = $1',
      [coinAddress]
    );
    
    if (!result.rows[0]) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Map database column names to interface property names
    return {
      coinAddress: row.coin_address,
      currentOwner: row.current_owner,
      previousOwner: row.previous_owner,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in findCoinTransferStatusByAddress:', error);
    throw error;
  }
}

export async function createCoinTransferStatus(pool: Pool, transferData: Omit<CoinTransferStatus, 'createdAt' | 'updatedAt'>): Promise<CoinTransferStatus> {
  try {
    const result = await pool.query(
      `INSERT INTO coin_transfer_status (
        coin_address, current_owner, previous_owner, status
      ) VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        transferData.coinAddress,
        transferData.currentOwner,
        transferData.previousOwner,
        transferData.status,
      ]
    );
    
    const row = result.rows[0];
    
    // Map database column names to interface property names
    return {
      coinAddress: row.coin_address,
      currentOwner: row.current_owner,
      previousOwner: row.previous_owner,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('❌ Error in createCoinTransferStatus:', error);
    throw error;
  }
}

export async function updateCoinTransferStatus(
  pool: Pool,
  coinAddress: string,
  updates: Partial<{
    currentOwner: string;
    previousOwner: string;
    status: 'CTO' | 'Acquired';
  }>
): Promise<void> {
  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.currentOwner !== undefined) {
      setClauses.push(`current_owner = $${paramIndex}`);
      values.push(updates.currentOwner);
      paramIndex++;
    }

    if (updates.previousOwner !== undefined) {
      setClauses.push(`previous_owner = $${paramIndex}`);
      values.push(updates.previousOwner);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(coinAddress);

    await pool.query(
      `UPDATE coin_transfer_status SET ${setClauses.join(', ')} WHERE coin_address = $${paramIndex}`,
      values
    );
  } catch (error) {
    console.error('❌ Error in updateCoinTransferStatus:', error);
    throw error;
  }
}

export async function getCoinTransferStatusByCurrentOwner(pool: Pool, currentOwner: string): Promise<CoinTransferStatus[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM coin_transfer_status WHERE current_owner = $1 ORDER BY created_at DESC',
      [currentOwner]
    );
    
    return result.rows.map(row => ({
      coinAddress: row.coin_address,
      currentOwner: row.current_owner,
      previousOwner: row.previous_owner,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('❌ Error in getCoinTransferStatusByCurrentOwner:', error);
    throw error;
  }
}

export async function getCoinTransferStatusByPreviousOwner(pool: Pool, previousOwner: string): Promise<CoinTransferStatus[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM coin_transfer_status WHERE previous_owner = $1 ORDER BY created_at DESC',
      [previousOwner]
    );
    
    return result.rows.map(row => ({
      coinAddress: row.coin_address,
      currentOwner: row.current_owner,
      previousOwner: row.previous_owner,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('❌ Error in getCoinTransferStatusByPreviousOwner:', error);
    throw error;
  }
}

export async function deleteCoinTransferStatus(pool: Pool, coinAddress: string): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM coin_transfer_status WHERE coin_address = $1',
      [coinAddress]
    );
  } catch (error) {
    console.error('❌ Error in deleteCoinTransferStatus:', error);
    throw error;
  }
}
