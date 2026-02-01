import { Pool } from 'pg';

// Configs table schema
export const CONFIGS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS configs (
    id SERIAL PRIMARY KEY,
    config_address VARCHAR(255) UNIQUE NOT NULL,
    total_supply BIGINT NOT NULL,
    fee_structure_key VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

// Configs table indexes
export const CONFIGS_TABLE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_configs_total_supply_fee ON configs(total_supply, fee_structure_key);
  CREATE INDEX IF NOT EXISTS idx_configs_address ON configs(config_address);
`;

// Initialize configs table
export async function initializeConfigsTable(pool: Pool) {
  try {
    await pool.query(CONFIGS_TABLE_SCHEMA);
    await pool.query(CONFIGS_TABLE_INDEXES);
  } catch (error) {
    console.error('❌ Error initializing configs table:', error);
    throw error;
  }
}

export interface Config {
  id: number;
  configAddress: string;
  totalSupply: number;
  feeStructureKey: string;
  createdAt: Date;
  updatedAt: Date;
}

// Find existing config by total supply and fee structure key
export async function findConfigByParams(pool: Pool, totalSupply: number, feeStructureKey: string): Promise<Config | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM configs WHERE total_supply = $1 AND fee_structure_key = $2 LIMIT 1',
      [totalSupply, feeStructureKey]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      configAddress: row.config_address,
      totalSupply: parseInt(row.total_supply),
      feeStructureKey: row.fee_structure_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('❌ Error in findConfigByParams:', error);
    throw error;
  }
}

// Create new config record
export async function createConfig(pool: Pool, configAddress: string, totalSupply: number, feeStructureKey: string): Promise<Config> {
  try {
    const result = await pool.query(
      'INSERT INTO configs (config_address, total_supply, fee_structure_key) VALUES ($1, $2, $3) RETURNING *',
      [configAddress, totalSupply, feeStructureKey]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      configAddress: row.config_address,
      totalSupply: parseInt(row.total_supply),
      feeStructureKey: row.fee_structure_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('❌ Error in createConfig:', error);
    throw error;
  }
}

// Get config by address
export async function getConfigByAddress(pool: Pool, configAddress: string): Promise<Config | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM configs WHERE config_address = $1 LIMIT 1',
      [configAddress]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      configAddress: row.config_address,
      totalSupply: parseInt(row.total_supply),
      feeStructureKey: row.fee_structure_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('❌ Error in getConfigByAddress:', error);
    throw error;
  }
}
