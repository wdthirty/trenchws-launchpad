import { Pool } from 'pg';
import { Connection } from '@solana/web3.js';
import { CoinCreationContext, CoinCreationRequest } from './types';

export interface RollbackStep {
  name: string;
  execute: () => Promise<void>;
  critical: boolean; // If true, failure will throw error
}

export interface RollbackContext {
  context: CoinCreationContext;
  data: CoinCreationRequest;
  metadataUrl?: string;
  imageUrl?: string;
  configAddress?: string;
  executedSteps: string[];
}

export class RollbackService {
  constructor(
    private pool: Pool,
    private connection: Connection
  ) {}

  async executeRollback(rollbackContext: RollbackContext): Promise<void> {
    console.log('🔄 Starting rollback process...');
    
    const rollbackSteps = this.buildRollbackSteps(rollbackContext);
    const errors: string[] = [];

    // Execute rollback steps in reverse order
    for (const step of rollbackSteps.reverse()) {
      try {
        console.log(`🔄 Executing rollback step: ${step.name}`);
        await step.execute();
        console.log(`✅ Rollback step completed: ${step.name}`);
      } catch (error) {
        const errorMessage = `Failed to execute rollback step "${step.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        errors.push(errorMessage);

        if (step.critical) {
          throw new Error(`Critical rollback step failed: ${errorMessage}`);
        }
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Rollback completed with ${errors.length} non-critical errors:`, errors);
    } else {
      console.log('✅ Rollback completed successfully');
    }
  }

  private buildRollbackSteps(rollbackContext: RollbackContext): RollbackStep[] {
    const steps: RollbackStep[] = [];
    const { context, data, executedSteps } = rollbackContext;

    // Rollback database operations
    if (executedSteps.includes('saveCoin')) {
      steps.push({
        name: 'Delete coin record from database',
        execute: async () => {
          await this.pool.query(
            'DELETE FROM coins WHERE coin_address = $1',
            [context.mint.address]
          );
        },
        critical: false
      });
    }

    if (executedSteps.includes('saveConfig') && context.config.isNew) {
      steps.push({
        name: 'Delete config record from database',
        execute: async () => {
          await this.pool.query(
            'DELETE FROM configs WHERE config_address = $1',
            [context.config.address]
          );
        },
        critical: false
      });
    }

    if (executedSteps.includes('updateUserStats')) {
      steps.push({
        name: 'Revert user stats update',
        execute: async () => {
          await this.pool.query(
            'UPDATE users SET coins_created = coins_created - 1 WHERE privy_user_id = $1',
            [context.user.privyUserId]
          );
        },
        critical: false
      });
    }

    // Rollback file uploads (optional - files can remain)
    if (executedSteps.includes('uploadMetadata') && rollbackContext.metadataUrl) {
      steps.push({
        name: 'Delete metadata file',
        execute: async () => {
          // Note: In a real implementation, you might want to delete the file from R2
          // For now, we'll just log it as the file can remain without issues
          console.log(`Metadata file would be deleted: ${rollbackContext.metadataUrl}`);
        },
        critical: false
      });
    }

    if (executedSteps.includes('uploadImage') && rollbackContext.imageUrl) {
      steps.push({
        name: 'Delete image file',
        execute: async () => {
          // Note: In a real implementation, you might want to delete the file from R2
          // For now, we'll just log it as the file can remain without issues
          console.log(`Image file would be deleted: ${rollbackContext.imageUrl}`);
        },
        critical: false
      });
    }

    return steps;
  }

  // Helper method to create a rollback context
  static createRollbackContext(
    context: CoinCreationContext,
    data: CoinCreationRequest,
    executedSteps: string[] = []
  ): RollbackContext {
    return {
      context,
      data,
      executedSteps
    };
  }
}
