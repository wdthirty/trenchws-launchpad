export interface CoinCreationRequest {
  tokenLogo: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  preBuy: string;
  burnPercentage: string;
  walletId: string;
  xUserHandle?: string;
  creatorFee: string;
  totalSupply: string;
  category?: string;
}

export interface ExternalWalletCoinCreationRequest {
  tokenLogo: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  preBuy: string;
  burnPercentage: string;
  userWalletAddress: string; // External wallet address
  userTwitterHandle?: string;
  userTwitterId?: string;
  xUserHandle?: string;
  creatorFee: string;
  totalSupply: string;
  category?: string;
}

export interface CoinCreationResult {
  success: boolean;
  tokenCA: string;
  configAddress?: string;
  metadataUrl?: string;
  imageUrl?: string;
  error?: string;
  partialSuccess?: boolean; // Indicates if blockchain partially succeeded
  stateId?: string; // For tracking the creation state
}

export interface CoinCreationContext {
  user: {
    privyUserId: string;
    privyWalletAddress: string;
    privyWalletId: string;
  };
  taggedUser?: {
    twitterUsername: string;
    walletAddress: string;
    keypair: any;
  };
  config: {
    address: string;
    isNew: boolean;
    keypair?: any;
  };
  mint: {
    keypair: any;
    address: string;
  };
  feeStructure: {
    feeBps: number;
    partnerLockedLpPercentage: number;
    creatorLockedLpPercentage: number;
    creatorTradingFeePercentage: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  data?: CoinCreationRequest;
}
