import { Pool } from 'pg';
import { Connection, PublicKey } from '@solana/web3.js';

export interface CoinCreationState {
  id: string;
  status: 'pending' | 'validating' | 'uploading' | 'blockchain' | 'database' | 'completed' | 'failed';
  mintAddress?: string;
  configAddress?: string;
  metadataUrl?: string;
  imageUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedSteps: string[];
  failedSteps: string[];
}

export class CoinStateService {
  constructor(
    private pool: Pool,
    private connection: Connection
  ) {}

  async createCoinState(walletId: string): Promise<CoinCreationState> {
    const state: CoinCreationState = {
      id: `coin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedSteps: [],
      failedSteps: []
    };

    // Store initial state in database
    await this.pool.query(`
      INSERT INTO coin_creation_states (
        id, status, wallet_id, created_at, updated_at, completed_steps, failed_steps
      ) VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[])
    `, [
      state.id,
      state.status,
      walletId,
      state.createdAt,
      state.updatedAt,
      state.completedSteps, // Cast to text[] explicitly
      state.failedSteps     // Cast to text[] explicitly
    ]);

    return state;
  }

  async updateCoinState(
    stateId: string, 
    updates: Partial<Pick<CoinCreationState, 'status' | 'mintAddress' | 'configAddress' | 'metadataUrl' | 'imageUrl' | 'error'>>
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.mintAddress) {
      setClauses.push(`mint_address = $${paramIndex}`);
      values.push(updates.mintAddress);
      paramIndex++;
    }

    if (updates.configAddress) {
      setClauses.push(`config_address = $${paramIndex}`);
      values.push(updates.configAddress);
      paramIndex++;
    }

    if (updates.metadataUrl) {
      setClauses.push(`metadata_url = $${paramIndex}`);
      values.push(updates.metadataUrl);
      paramIndex++;
    }

    if (updates.imageUrl) {
      setClauses.push(`image_url = $${paramIndex}`);
      values.push(updates.imageUrl);
      paramIndex++;
    }

    if (updates.error) {
      setClauses.push(`error = $${paramIndex}`);
      values.push(updates.error);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);

    values.push(stateId);

    await this.pool.query(`
      UPDATE coin_creation_states 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
    `, values);
  }

  async addCompletedStep(stateId: string, step: string): Promise<void> {
    await this.pool.query(`
      UPDATE coin_creation_states 
      SET completed_steps = array_append(completed_steps, $1), updated_at = NOW()
      WHERE id = $2
    `, [step, stateId]);
  }

  async addFailedStep(stateId: string, step: string): Promise<void> {
    await this.pool.query(`
      UPDATE coin_creation_states 
      SET failed_steps = array_append(failed_steps, $1), updated_at = NOW()
      WHERE id = $2
    `, [step, stateId]);
  }

  async getCoinState(stateId: string): Promise<CoinCreationState | null> {
    const result = await this.pool.query(`
      SELECT * FROM coin_creation_states WHERE id = $1
    `, [stateId]);

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      status: row.status,
      mintAddress: row.mint_address,
      configAddress: row.config_address,
      metadataUrl: row.metadata_url,
      imageUrl: row.image_url,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedSteps: row.completed_steps || [],
      failedSteps: row.failed_steps || []
    };
  }

  async cleanupOldStates(): Promise<void> {
    // Clean up states older than 24 hours
    await this.pool.query(`
      DELETE FROM coin_creation_states 
      WHERE created_at < NOW() - INTERVAL '24 hours'
    `);
  }

  // Check if blockchain transactions were successful
  async verifyBlockchainState(mintAddress: string): Promise<{
    mintExists: boolean;
    configExists: boolean;
    poolExists: boolean;
  }> {
    try {
      const mintInfo = await this.connection.getAccountInfo(new PublicKey(mintAddress));
      return {
        mintExists: !!mintInfo,
        configExists: false, // Would need to check config account
        poolExists: false    // Would need to check pool account
      };
    } catch (error) {
      return {
        mintExists: false,
        configExists: false,
        poolExists: false
      };
    }
  }
}

// Database schema for coin creation states
export const COIN_CREATION_STATES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS coin_creation_states (
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    wallet_id VARCHAR(255) NOT NULL,
    mint_address VARCHAR(255),
    config_address VARCHAR(255),
    metadata_url TEXT,
    image_url TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_steps TEXT[] DEFAULT '{}',
    failed_steps TEXT[] DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_coin_creation_states_wallet_id ON coin_creation_states(wallet_id);
  CREATE INDEX IF NOT EXISTS idx_coin_creation_states_status ON coin_creation_states(status);
  CREATE INDEX IF NOT EXISTS idx_coin_creation_states_created_at ON coin_creation_states(created_at);
`;

// Initialize the table
export async function initializeCoinCreationStatesTable(pool: Pool): Promise<void> {
  try {
    await pool.query(COIN_CREATION_STATES_SCHEMA);
  } catch (error) {
    console.error('Error initializing coin creation states table:', error);
    throw error;
  }
}
