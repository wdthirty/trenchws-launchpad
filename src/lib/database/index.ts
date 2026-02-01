// Database connection and types
export type { User, Coin, CoinTransferStatus } from './connection';

// Database initialization
export { initializeUsersTable } from './users';
export { initializeCoinsTable } from './coins';
export { initializeConfigsTable } from './configs';
export { initializeTradeHistoryTable } from './positions';

export { initializeTaggedWalletsTable } from './tagged_wallets';
export { initializeCoinTransferStatusTable } from './coin_transfer_status';

// User operations
export {
  findUserByPrivyUserId,
  findUserByTwitterUsername,
  findUserByTwitterId,
  findUserByWalletAddress,
  findUserByWalletId,
  findUserByProfileIdentifier,
  getUserProfileDataByIdentifier,
  createUser,
  updateUserStats,
  updateUserWalletAddress,
  updateUserTwitterInfo,
} from './users';

// Coin operations
export {
  findCoinByAddress,
  createCoin,
  updateCoinStats,
  getUserCoins,
  getUserCoinsByPrivyId,
  getTokenDescription,
  getCoinsByTaggedUser,
} from './coins';

// Config operations
export {
  findConfigByParams,
  createConfig,
  getConfigByAddress,
} from './configs';
export type { Config } from './configs';

// Trade operations
export {
  logTrade,
  processBuyTransaction,
  processSellTransaction,
  getUserTotalPnl,
  getUserTotalLaunchpadRewards,
  getUserTotalSolTraded,
  getUserTradeHistory,
  getCoinTradeHistory,
  getCoin as getPositionCoin,
  isLaunchpadCoin,
} from './positions';
export type { TradeHistory } from './positions';



// Tagged wallet operations
export {
  findTaggedWalletByAddress,
  findTaggedWalletByTwitterUsername,
  createTaggedWallet,
  deleteTaggedWallet,
  getAllTaggedWallets,
  getOrCreateTaggedWalletForCoin,
} from './tagged_wallets';
export type { TaggedWallet } from './tagged_wallets';

// Coin transfer status operations
export {
  findCoinTransferStatusByAddress,
  createCoinTransferStatus,
  updateCoinTransferStatus,
  getCoinTransferStatusByCurrentOwner,
  getCoinTransferStatusByPreviousOwner,
  deleteCoinTransferStatus,
} from './coin_transfer_status';
