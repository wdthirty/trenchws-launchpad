import { User } from '@/lib/database';

// UserInfo interface for token creator info
export interface UserInfo {
  username: string;
  profileImageUrl?: string;
  twitterUrl?: string;
  twitterDisplayName?: string;
  walletDisplayName?: string;
  isWalletOnly?: boolean;
  twitterUsername?: string;
  privyWalletAddress?: string;
  twitterImageUrl?: string;
}

/**
 * Generate profile URL for a user
 * Uses @ prefix for Twitter username, otherwise uses wallet address
 */
export const getProfileUrl = (user: User): string => {
  if (user.twitterUsername) {
    return `/profile/@${user.twitterUsername}`;
  } else {
    return `/profile/${user.privyWalletAddress}`;
  }
};

/**
 * Generate profile URL for UserInfo (from token creator info)
 * Uses @ prefix for Twitter users, otherwise uses username directly
 */
export const getProfileUrlFromUserInfo = (user: UserInfo): string => {
  // If user has Twitter username, use @ prefix
  if (user.twitterUsername) {
    return `/profile/@${user.twitterUsername}`;
  }
  // Otherwise use the username field directly (could be wallet address or display name)
  return `/profile/${user.username}`;
};

/**
 * Get display name for a user
 * Uses Twitter display name if available, otherwise uses wallet display name
 */
export const getDisplayName = (user: User): string => {
  return user.twitterDisplayName || user.walletDisplayName || 'Unknown User';
};

/**
 * Get display name for UserInfo (from token creator info)
 * Uses Twitter display name if available, otherwise uses wallet display name, fallback to username
 */
export const getDisplayNameFromUserInfo = (user: UserInfo): string => {
  return user.twitterDisplayName || user.walletDisplayName || user.username || 'Unknown User';
};

/**
 * Get profile image URL for a user
 * Uses Twitter image if available, otherwise uses wallet fallback image
 */
export const getProfileImageUrl = (user: User): string => {
  return user.twitterImageUrl || 'https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora';
};

/**
 * Get profile image URL for UserInfo (from token creator info)
 * Uses Twitter image if available, otherwise uses profile image URL, fallback to default
 */
export const getProfileImageUrlFromUserInfo = (user: UserInfo): string => {
  return user.twitterImageUrl || user.profileImageUrl || 'https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora';
};

/**
 * Get username for display purposes
 * Uses Twitter username if available, otherwise uses wallet display name
 */
export const getDisplayUsername = (user: User): string => {
  return user.twitterUsername || user.walletDisplayName || 'Unknown User';
};
