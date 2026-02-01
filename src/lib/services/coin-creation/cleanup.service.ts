import { Pool } from 'pg';
import { CoinCreationContext, CoinCreationRequest } from './types';

export interface CleanupOptions {
  deleteCoin: boolean;
  deleteConfig: boolean;
  revertUserStats: boolean;
  markAsFailed?: boolean;
}

export class CleanupService {
  constructor(private pool: Pool) {}

  /**
   * Clean up database records when coin creation fails
   */
  async cleanupFailedCoinCreation(
    context: CoinCreationContext, 
    data: CoinCreationRequest,
    options: CleanupOptions = {
      deleteCoin: true,
      deleteConfig: true,
      revertUserStats: true,
      markAsFailed: false
    }
  ): Promise<void> {
    try {
      console.log('🧹 Starting database cleanup...');

      // Delete coin record
      if (options.deleteCoin) {
        await this.deleteCoinRecord(context.mint.address);
      } else if (options.markAsFailed) {
        await this.markCoinAsFailed(context.mint.address);
      }

      // Delete config record if it was newly created
      if (options.deleteConfig && context.config.isNew) {
        await this.deleteConfigRecord(context.config.address);
      }

      // Revert user stats
      if (options.revertUserStats) {
        await this.revertUserStats(context.user.privyWalletAddress);
      }

      console.log('✅ Database cleanup completed successfully');
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Delete coin record from database
   */
  private async deleteCoinRecord(mintAddress: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM coins WHERE coin_address = $1',
      [mintAddress]
    );
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`✅ Deleted coin record for mint: ${mintAddress}`);
    } else {
      console.log(`⚠️ No coin record found for mint: ${mintAddress}`);
    }
  }

  /**
   * Mark coin as failed instead of deleting
   */
  private async markCoinAsFailed(mintAddress: string): Promise<void> {
    const result = await this.pool.query(
      'UPDATE coins SET is_graduated = false, created_at = NOW() WHERE coin_address = $1',
      [mintAddress]
    );
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`✅ Marked coin as failed for mint: ${mintAddress}`);
    } else {
      console.log(`⚠️ No coin record found for mint: ${mintAddress}`);
    }
  }

  /**
   * Delete config record from database
   */
  private async deleteConfigRecord(configAddress: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM configs WHERE config_address = $1',
      [configAddress]
    );
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`✅ Deleted config record for config: ${configAddress}`);
    } else {
      console.log(`⚠️ No config record found for config: ${configAddress}`);
    }
  }

  /**
   * Revert user stats (decrease coins created count)
   */
  private async revertUserStats(privyWalletAddress: string): Promise<void> {
    const userResult = await this.pool.query(
      'SELECT privy_user_id, coins_created FROM users WHERE privy_wallet_address = $1',
      [privyWalletAddress]
    );

    if (userResult.rows[0] && userResult.rows[0].coins_created > 0) {
      const result = await this.pool.query(
        'UPDATE users SET coins_created = coins_created - 1 WHERE privy_user_id = $1',
        [userResult.rows[0].privy_user_id]
      );
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Reverted user stats for wallet: ${privyWalletAddress}`);
      }
    } else {
      console.log(`⚠️ No user found or coins_created is already 0 for wallet: ${privyWalletAddress}`);
    }
  }

  /**
   * Clean up orphaned records (coins without corresponding blockchain data)
   */
  async cleanupOrphanedRecords(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // Find coins that are older than 1 hour and might be orphaned
      const orphanedCoins = await this.pool.query(`
        SELECT coin_address, created_at 
        FROM coins 
        WHERE created_at < NOW() - INTERVAL '1 hour'
        AND is_graduated = false
        ORDER BY created_at DESC
        LIMIT 100
      `);

      for (const coin of orphanedCoins.rows) {
        try {
          // Check if this coin has a corresponding coin creation state
          const stateResult = await this.pool.query(
            'SELECT status FROM coin_creation_states WHERE mint_address = $1',
            [coin.coin_address]
          );

          if (stateResult.rows[0] && stateResult.rows[0].status === 'failed') {
            // This coin failed, clean it up
            await this.deleteCoinRecord(coin.coin_address);
            cleaned++;
          }
        } catch (error) {
          errors.push(`Failed to clean coin ${coin.coin_address}: ${error}`);
        }
      }

      console.log(`✅ Cleaned up ${cleaned} orphaned records`);
    } catch (error) {
      errors.push(`Failed to cleanup orphaned records: ${error}`);
    }

    return { cleaned, errors };
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalCoins: number;
    failedCoins: number;
    orphanedCoins: number;
    totalConfigs: number;
    orphanedConfigs: number;
  }> {
    const [coinsResult, configsResult, orphanedCoinsResult, orphanedConfigsResult] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as total FROM coins'),
      this.pool.query('SELECT COUNT(*) as total FROM configs'),
      this.pool.query(`
        SELECT COUNT(*) as total 
        FROM coins c
        LEFT JOIN coin_creation_states ccs ON c.coin_address = ccs.mint_address
        WHERE ccs.status = 'failed' OR (ccs.status IS NULL AND c.created_at < NOW() - INTERVAL '1 hour')
      `),
      this.pool.query(`
        SELECT COUNT(*) as total 
        FROM configs c
        LEFT JOIN coins co ON c.config_address = co.config_address
        WHERE co.config_address IS NULL AND c.created_at < NOW() - INTERVAL '1 hour'
      `)
    ]);

    const failedCoinsResult = await this.pool.query(`
      SELECT COUNT(*) as total 
      FROM coin_creation_states 
      WHERE status = 'failed'
    `);

    return {
      totalCoins: parseInt(coinsResult.rows[0].total),
      failedCoins: parseInt(failedCoinsResult.rows[0].total),
      orphanedCoins: parseInt(orphanedCoinsResult.rows[0].total),
      totalConfigs: parseInt(configsResult.rows[0].total),
      orphanedConfigs: parseInt(orphanedConfigsResult.rows[0].total)
    };
  }
}
