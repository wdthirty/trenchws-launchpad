import { Pool } from 'pg';
import { initializeClaimedFeesDatabase } from './claimedFees';
import { initializeUsersTable } from './users';
import { initializeCoinsTable } from './coins';
import { initializeConfigsTable } from './configs';
import { initializeTradeHistoryTable } from './positions';
import { initializeCoinTransferStatusTable } from './coin_transfer_status';

import { initializeTaggedWalletsTable } from './tagged_wallets';

// Initialize database tables
export async function initializeDatabase(pool: Pool): Promise<void> {
  try {
    await initializeUsersTable(pool);
    await initializeCoinsTable(pool);
    await initializeConfigsTable(pool);
    await initializeTradeHistoryTable(pool);
    await initializeCoinTransferStatusTable(pool);

    await initializeTaggedWalletsTable(pool);
    await initializeClaimedFeesDatabase(pool);
  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
    throw error;
  }
}

// Type definitions for database entities
export interface User {
  privyUserId: string;
  privyWalletId: string;
  privyWalletAddress: string;
  
  // Twitter fields (now optional for wallet-only users)
  twitterId?: string;
  twitterUsername?: string;
  twitterDisplayName?: string;
  twitterImageUrl?: string;
  
  // Wallet-specific fields
  walletDisplayName?: string; // First 6 chars of wallet address
  isWalletOnly: boolean;
  
  // Stats
  coinsCreated: number;
  coinsGraduated: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Coin {
  coinName: string;
  coinSymbol: string;
  coinAddress: string;
  creatorPrivyUserId: string;
  taggedWalletTwitterUsername: string;
  coinFeeRate: number;
  metadataUri: string;
  description?: string;
  category?: string;
  isGraduated: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CoinTransferStatus {
  coinAddress: string;
  currentOwner: string;
  previousOwner: string;
  status: 'CTO' | 'Acquired';
  createdAt?: Date;
  updatedAt?: Date;
}
