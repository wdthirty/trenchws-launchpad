import { Pool } from 'pg';
import { Keypair } from '@solana/web3.js';
import { findUserByWalletId, findConfigByParams, getOrCreateTaggedWalletForCoin } from '@/lib/database';
import { CoinCreationRequest, ExternalWalletCoinCreationRequest, CoinCreationContext } from './types';
import { getUpstashCache } from './upstash-cache.service';
import bs58 from 'bs58';

// Fee structure mapping
const FEE_STRUCTURES = {
  '0': {
    feeBps: 100,
    partnerLockedLpPercentage: 100,
    creatorLockedLpPercentage: 0,
    creatorTradingFeePercentage: 0,
  },
  '1': {
    feeBps: 200,
    partnerLockedLpPercentage: 50,
    creatorLockedLpPercentage: 50,
    creatorTradingFeePercentage: 50,
  },
  '2': {
    feeBps: 300,
    partnerLockedLpPercentage: 33,
    creatorLockedLpPercentage: 67,
    creatorTradingFeePercentage: 67,
  },
  '3': {
    feeBps: 400,
    partnerLockedLpPercentage: 20,
    creatorLockedLpPercentage: 80,
    creatorTradingFeePercentage: 80,
  },
  '4': {
    feeBps: 500,
    partnerLockedLpPercentage: 50,
    creatorLockedLpPercentage: 50,
    creatorTradingFeePercentage: 50,
  },
  '5': {
    feeBps: 600,
    partnerLockedLpPercentage: 17,
    creatorLockedLpPercentage: 83,
    creatorTradingFeePercentage: 83,
  },
};

export class ContextService {
  private upstashCache = getUpstashCache();

  constructor(private pool: Pool) {}

  async buildContext(data: CoinCreationRequest, mintKeypair: Keypair): Promise<CoinCreationContext> {
    // Get user data with Upstash Redis caching
    const userCacheKey = `Launchpadfun:user:${data.walletId}`;
    let user = await this.upstashCache.get(userCacheKey);
    
    if (!user) {
      user = await findUserByWalletId(this.pool, data.walletId);
      if (!user) {
        throw new Error('User not found');
      }
      // Cache user data for 10 minutes
      await this.upstashCache.set(userCacheKey, user, { ttl: 600 });
    }

    // Get fee structure
    const feeStructure = FEE_STRUCTURES[data.creatorFee as keyof typeof FEE_STRUCTURES];
    if (!feeStructure) {
      throw new Error('Invalid creator fee');
    }

    // Parse total supply
    const totalSupplyNum = parseInt(data.totalSupply.replace(/,/g, ''));

    // Check for existing config with Upstash Redis caching
    const configCacheKey = `Launchpadfun:config:${totalSupplyNum}:${data.creatorFee}`;
    let existingConfig = await this.upstashCache.get(configCacheKey);
    
    if (!existingConfig) {
      existingConfig = await findConfigByParams(this.pool, totalSupplyNum, data.creatorFee);
      // Cache config data for 30 minutes (configs don't change often)
      await this.upstashCache.set(configCacheKey, existingConfig, { ttl: 1800 });
    }
    
    let configAddress: string;
    let isNewConfig = false;
    let configKeypair: Keypair | undefined;

    if (existingConfig) {
      configAddress = (existingConfig as any).configAddress;
    } else {
      configKeypair = Keypair.generate();
      configAddress = configKeypair.publicKey.toBase58();
      isNewConfig = true;
    }

    // Process tagged user if provided
    let taggedUser;
    if (data.xUserHandle && data.xUserHandle.trim() !== '') {
      const normalizedUsername = this.normalizeTwitterUsername(data.xUserHandle);
      if (normalizedUsername) {
        try {
          const taggedWallet = await getOrCreateTaggedWalletForCoin(this.pool, normalizedUsername);
          taggedUser = {
            twitterUsername: taggedWallet.twitterUsername,
            walletAddress: taggedWallet.walletAddress,
            keypair: Keypair.fromSecretKey(bs58.decode(taggedWallet.walletPrivateKey))
          };
        } catch (error) {
          console.error(`Failed to create tagged wallet for user: ${normalizedUsername}`, error);
        }
      }
    }

    return {
      user: {
        privyUserId: (user as any).privyUserId,
        privyWalletAddress: (user as any).privyWalletAddress,
        privyWalletId: (user as any).privyWalletId,
      },
      taggedUser,
      config: {
        address: configAddress,
        isNew: isNewConfig,
        keypair: configKeypair,
      },
      mint: {
        keypair: mintKeypair,
        address: mintKeypair.publicKey.toBase58(),
      },
      feeStructure,
    };
  }

  private normalizeTwitterUsername(username: string): string | null {
    if (!username) return null;

    let normalized = username.trim();
    if (normalized.startsWith('@')) {
      normalized = normalized.substring(1);
    }
    normalized = normalized.replace(/@/g, '');
    normalized = normalized.replace(/[^a-zA-Z0-9_]/g, '');
    normalized = normalized.toLowerCase();

    if (normalized.length === 0 || normalized.length > 15) {
      return null;
    }

    return normalized;
  }

  async buildExternalWalletContext(data: ExternalWalletCoinCreationRequest, mintKeypair: Keypair): Promise<CoinCreationContext> {
    // For external wallets, we don't have a Privy user, so we create a mock user object
    const user = {
      privyUserId: data.userTwitterId || data.userWalletAddress, // Use Twitter ID or wallet address as fallback
      privyWalletAddress: data.userWalletAddress,
      privyWalletId: data.userWalletAddress, // Use wallet address as ID for external wallets
    };

    // Get fee structure
    const feeStructure = FEE_STRUCTURES[data.creatorFee as keyof typeof FEE_STRUCTURES];
    if (!feeStructure) {
      throw new Error('Invalid creator fee');
    }

    // Parse total supply
    const totalSupplyNum = parseInt(data.totalSupply.replace(/,/g, ''));

    // Check for existing config with Upstash Redis caching
    const configCacheKey = `Launchpadfun:config:${totalSupplyNum}:${data.creatorFee}`;
    let existingConfig = await this.upstashCache.get(configCacheKey);
    
    if (!existingConfig) {
      existingConfig = await findConfigByParams(this.pool, totalSupplyNum, data.creatorFee);
      // Cache config data for 30 minutes (configs don't change often)
      await this.upstashCache.set(configCacheKey, existingConfig, { ttl: 1800 });
    }
    
    let configAddress: string;
    let isNewConfig = false;
    let configKeypair: Keypair | undefined;

    if (existingConfig) {
      configAddress = (existingConfig as any).configAddress;
    } else {
      configKeypair = Keypair.generate();
      configAddress = configKeypair.publicKey.toBase58();
      isNewConfig = true;
    }

    // Process tagged user if provided
    let taggedUser;
    if (data.xUserHandle && data.xUserHandle.trim() !== '') {
      const normalizedUsername = this.normalizeTwitterUsername(data.xUserHandle);
      if (normalizedUsername) {
        try {
          const taggedWallet = await getOrCreateTaggedWalletForCoin(this.pool, normalizedUsername);
          taggedUser = {
            twitterUsername: taggedWallet.twitterUsername,
            walletAddress: taggedWallet.walletAddress,
            keypair: Keypair.fromSecretKey(bs58.decode(taggedWallet.walletPrivateKey))
          };
        } catch (error) {
          console.error(`Failed to create tagged wallet for user: ${normalizedUsername}`, error);
        }
      }
    }

    return {
      user,
      taggedUser,
      config: {
        address: configAddress,
        isNew: isNewConfig,
        keypair: configKeypair,
      },
      mint: {
        keypair: mintKeypair,
        address: mintKeypair.publicKey.toBase58(),
      },
      feeStructure,
    };
  }
}
