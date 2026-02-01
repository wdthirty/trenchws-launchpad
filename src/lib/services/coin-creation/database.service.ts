import { Pool } from 'pg';
import { 
  createConfig, 
  createCoin, 
  updateUserStats, 
  findUserByWalletAddress 
} from '@/lib/database';
import { CoinCreationContext, CoinCreationRequest, ExternalWalletCoinCreationRequest } from './types';

export class DatabaseService {
  constructor(private pool: Pool) {}

  async saveConfig(context: CoinCreationContext, data: CoinCreationRequest): Promise<void> {
    if (!context.config.isNew) {
      return; // Config already exists
    }

    try {
      const totalSupplyNum = parseInt(data.totalSupply.replace(/,/g, ''));
      await createConfig(this.pool, context.config.address, totalSupplyNum, data.creatorFee);
    } catch (error) {
      console.error(`❌ Failed to store config in database:`, error);
      // Don't fail the coin creation if config storage fails
    }
  }

  async saveCoin(context: CoinCreationContext, data: CoinCreationRequest, metadataUrl: string): Promise<void> {
    try {
      const creatorUser = await findUserByWalletAddress(this.pool, context.user.privyWalletAddress);
      
      if (!creatorUser) {
        throw new Error('Creator user not found in database');
      }

      await createCoin(this.pool, {
        coinName: data.tokenName,
        coinSymbol: data.tokenSymbol,
        coinAddress: context.mint.address,
        creatorPrivyUserId: creatorUser.privyUserId,
        taggedWalletTwitterUsername: context.taggedUser?.twitterUsername || '',
        coinFeeRate: parseFloat(data.creatorFee || '0'),
        metadataUri: metadataUrl,
        description: data.tokenDescription,
        category: data.category || undefined,
        isGraduated: false,
      });

      // Update user's coins created count
      await updateUserStats(this.pool, creatorUser.privyUserId, {
        coinsCreated: creatorUser.coinsCreated + 1
      });
    } catch (error) {
      console.error(`❌ Failed to create coin record in database:`, error);
      throw error; // This is critical, so we should fail
    }
  }

  async saveExternalWalletCoin(context: CoinCreationContext, data: ExternalWalletCoinCreationRequest, metadataUrl: string): Promise<void> {
    try {
      // For external wallets, we need to create or find a user record
      let creatorUser = await findUserByWalletAddress(this.pool, context.user.privyWalletAddress);
      
      if (!creatorUser) {
        // Create a new user record for external wallet
        // This would need to be implemented in the database module
        // For now, we'll create a minimal user record
        const result = await this.pool.query(`
          INSERT INTO users (privy_user_id, privy_wallet_address, privy_wallet_id, twitter_username, twitter_id, coins_created, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())
          ON CONFLICT (privy_wallet_address) DO UPDATE SET
            twitter_username = EXCLUDED.twitter_username,
            twitter_id = EXCLUDED.twitter_id,
            updated_at = NOW()
          RETURNING *
        `, [
          context.user.privyUserId,
          context.user.privyWalletAddress,
          context.user.privyWalletId,
          data.userTwitterHandle || null,
          data.userTwitterId || null
        ]);
        
        creatorUser = result.rows[0];
      }

      await createCoin(this.pool, {
        coinName: data.tokenName,
        coinSymbol: data.tokenSymbol,
        coinAddress: context.mint.address,
        creatorPrivyUserId: creatorUser.privyUserId,
        taggedWalletTwitterUsername: context.taggedUser?.twitterUsername || '',
        coinFeeRate: parseFloat(data.creatorFee || '0'),
        metadataUri: metadataUrl,
        description: data.tokenDescription,
        category: data.category || undefined,
        isGraduated: false,
      });

      // Update user's coins created count
      await updateUserStats(this.pool, creatorUser.privyUserId, {
        coinsCreated: creatorUser.coinsCreated + 1
      });
    } catch (error) {
      console.error(`❌ Failed to create external wallet coin record in database:`, error);
      throw error; // This is critical, so we should fail
    }
  }
}
