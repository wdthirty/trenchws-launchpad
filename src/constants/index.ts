export const StorageKey = {
  INTEL_EXPLORER_FILTERS_CONFIG: 'intel_explorer_filters_config',
} as const;
export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

// Export blacklist utilities
export { isCoinBlacklisted, filterBlacklistedCoins, getBlacklistedCoinsCount } from './blacklistedCoins';
