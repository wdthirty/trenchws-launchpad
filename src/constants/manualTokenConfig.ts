// Manual configuration for special tokens that need custom creator info and fees raised data
// This allows us to display creator information and fees raised for external tokens

export interface ManualTokenConfig {
  tokenAddress: string;
  creator: {
    username: string;
    profileImageUrl?: string;
    twitterUrl?: string;
    twitterDisplayName?: string;
    walletDisplayName?: string;
    isWalletOnly?: boolean;
    twitterUsername?: string;
    privyWalletAddress?: string;
    twitterImageUrl?: string;
  };
  taggedUser?: {
    username: string;
    profileImageUrl?: string;
    twitterUrl?: string;
    twitterDisplayName?: string;
    walletDisplayName?: string;
    isWalletOnly?: boolean;
    twitterUsername?: string;
    privyWalletAddress?: string;
    twitterImageUrl?: string;
  };
  totalRaised?: string; // Amount in SOL - if not provided, will be calculated via API
  isDexPaid?: boolean;
  category?: string; // Manual category override
  transferStatus?: {
    currentOwner: {
      username: string;
      profileImageUrl?: string;
      twitterUrl?: string;
      twitterDisplayName?: string;
      walletDisplayName?: string;
      isWalletOnly?: boolean;
      twitterUsername?: string;
      privyWalletAddress?: string;
      twitterImageUrl?: string;
    };
    previousOwner: {
      username: string;
      profileImageUrl?: string;
      twitterUrl?: string;
      twitterDisplayName?: string;
      walletDisplayName?: string;
      isWalletOnly?: boolean;
      twitterUsername?: string;
      privyWalletAddress?: string;
      twitterImageUrl?: string;
    };
    status: string;
    transferredAt: string;
  };
}

// Manual configuration for special tokens
export const MANUAL_TOKEN_CONFIGS: Record<string, ManualTokenConfig> = {
  // Add more manual configurations here as needed
  // 'ANOTHER_TOKEN_ADDRESS': {
  //   tokenAddress: 'ANOTHER_TOKEN_ADDRESS',
  //   creator: {
  //     username: 'another_creator',
  //     twitterDisplayName: 'Another Creator',
  //     walletDisplayName: 'Another Creator',
  //     isWalletOnly: true,
  //     privyWalletAddress: 'ANOTHER_TOKEN_ADDRESS',
  //   },
  //   totalRaised: '500.0000',
  //   isDexPaid: false,
  // },
};

// Helper function to get manual configuration for a token
export function getManualTokenConfig(tokenAddress: string): ManualTokenConfig | null {
  return MANUAL_TOKEN_CONFIGS[tokenAddress] || null;
}

// Helper function to check if a token has manual configuration
export function hasManualTokenConfig(tokenAddress: string): boolean {
  return tokenAddress in MANUAL_TOKEN_CONFIGS;
}
