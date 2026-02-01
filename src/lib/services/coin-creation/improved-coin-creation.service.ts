import { Connection } from '@solana/web3.js';
import { Pool } from 'pg';
import { PrivyClient } from '@privy-io/server-auth';
import { 
  CoinCreationRequest, 
  CoinCreationResult
} from './types';
import { ValidationService } from './validation.service';
import { ContextService } from './context.service';
import { StorageService } from './storage.service';
import { KeypairService } from './keypair.service';
import { BlockchainService } from './blockchain.service';
import { DatabaseService } from './database.service';
import { CoinStateService, CoinCreationState } from './coin-state.service';
import { CleanupService } from './cleanup.service';

export class ImprovedCoinCreationService {
  private validationService: ValidationService;
  private contextService: ContextService;
  private storageService: StorageService;
  private keypairService: KeypairService;
  private blockchainService: BlockchainService;
  private databaseService: DatabaseService;
  private coinStateService: CoinStateService;
  private cleanupService: CleanupService;

  constructor(
    connection: Connection,
    pool: Pool,
    privy: PrivyClient,
    authorityPrivateKey: string
  ) {
    this.validationService = new ValidationService(pool);
    this.contextService = new ContextService(pool);
    this.storageService = new StorageService();
    this.keypairService = new KeypairService(connection, pool);
    this.blockchainService = new BlockchainService(connection, privy, authorityPrivateKey);
    this.databaseService = new DatabaseService(pool);
    this.coinStateService = new CoinStateService(pool, connection);
    this.cleanupService = new CleanupService(pool);
  }

  async createCoin(data: CoinCreationRequest): Promise<CoinCreationResult> {
    // Step 1: Create coin state tracking
    const coinState = await this.coinStateService.createCoinState(data.walletId);
    
    try {
      // Step 2: Validate request
      console.log('🔍 Validating request...');
      await this.coinStateService.updateCoinState(coinState.id, { status: 'validating' });
      
      const validationResult = await this.validationService.validateRequest(data);
      if (!validationResult.isValid) {
        await this.coinStateService.updateCoinState(coinState.id, { 
          status: 'failed', 
          error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}` 
        });
        return {
          success: false,
          tokenCA: '',
          error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        };
      }
      await this.coinStateService.addCompletedStep(coinState.id, 'validation');

      // Step 3: Get fresh mint keypair
      console.log('🔑 Getting fresh mint keypair...');
      const mintKeypair = await this.keypairService.getFreshKeypair();
      await this.coinStateService.addCompletedStep(coinState.id, 'keypairGeneration');

      // Step 4: Build context
      console.log('🏗️ Building context...');
      const context = await this.contextService.buildContext(data, mintKeypair);
      await this.coinStateService.addCompletedStep(coinState.id, 'contextBuilding');

      // Step 5: Upload assets
      console.log('📤 Uploading assets...');
      await this.coinStateService.updateCoinState(coinState.id, { status: 'uploading' });
      
      const [imageResult] = await Promise.all([
        this.storageService.uploadImage(data.tokenLogo, context.mint.address),
        this.storageService.uploadMetadata({
          tokenName: data.tokenName,
          tokenSymbol: data.tokenSymbol,
          tokenDescription: data.tokenDescription,
          mint: context.mint.address,
          image: '', // Will be updated after image upload
          twitter: data.twitter,
          website: data.website,
          telegram: data.telegram,
        })
      ]);

      await this.coinStateService.addCompletedStep(coinState.id, 'imageUpload');
      await this.coinStateService.addCompletedStep(coinState.id, 'metadataUpload');

      // Update metadata with actual image URL
      const finalMetadataResult = await this.storageService.uploadMetadata({
        tokenName: data.tokenName,
        tokenSymbol: data.tokenSymbol,
        tokenDescription: data.tokenDescription,
        mint: context.mint.address,
        image: imageResult.url,
        twitter: data.twitter,
        website: data.website,
        telegram: data.telegram,
      });

      await this.coinStateService.updateCoinState(coinState.id, {
        mintAddress: context.mint.address,
        configAddress: context.config.address,
        metadataUrl: finalMetadataResult.url,
        imageUrl: imageResult.url
      });

      // Step 6: Save to database FIRST (before blockchain)
      console.log('💾 Saving to database...');
      await this.coinStateService.updateCoinState(coinState.id, { status: 'database' });
      
      try {
        await Promise.all([
          this.databaseService.saveConfig(context, data),
          this.databaseService.saveCoin(context, data, finalMetadataResult.url)
        ]);
        await this.coinStateService.addCompletedStep(coinState.id, 'databaseSave');
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
        await this.coinStateService.addFailedStep(coinState.id, 'databaseSave');
        await this.coinStateService.updateCoinState(coinState.id, { 
          status: 'failed', 
          error: `Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` 
        });
        return {
          success: false,
          tokenCA: '',
          error: `Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
        };
      }

      // Step 7: Execute blockchain transactions
      console.log('⛓️ Creating blockchain transactions...');
      await this.coinStateService.updateCoinState(coinState.id, { status: 'blockchain' });
      
      try {
        const transactions = await this.blockchainService.createPoolTransactions(
          context, 
          data, 
          finalMetadataResult.url
        );

        console.log('🚀 Executing blockchain transactions...');
        await this.blockchainService.executeTransactions(transactions, data.walletId);
        await this.coinStateService.addCompletedStep(coinState.id, 'blockchainTransactions');

        // Step 8: Execute burn transaction (if needed)
        console.log('🔥 Executing burn transaction...');
        await this.blockchainService.executeBurnTransaction(context, data);
        await this.coinStateService.addCompletedStep(coinState.id, 'burnTransaction');

        // Step 9: Execute platform fee transaction
        console.log('💰 Executing platform fee transaction...');
        await this.blockchainService.executePlatformFeeTransaction(context, data);
        await this.coinStateService.addCompletedStep(coinState.id, 'platformFeeTransaction');

      } catch (blockchainError) {
        console.error('❌ Blockchain execution failed:', blockchainError);
        await this.coinStateService.addFailedStep(coinState.id, 'blockchainExecution');
        
        // Check what blockchain state we're in
        const blockchainState = await this.coinStateService.verifyBlockchainState(context.mint.address);
        
        if (blockchainState.mintExists) {
          // Blockchain partially succeeded - we have a mint but process failed
          await this.coinStateService.updateCoinState(coinState.id, { 
            status: 'failed', 
            error: `Blockchain execution failed but mint was created: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}` 
          });
          
          return {
            success: false,
            tokenCA: context.mint.address, // Return the mint address even though it failed
            error: `Blockchain execution failed but mint was created: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}`,
            partialSuccess: true
          };
        } else {
          // Blockchain completely failed - no mint created
          // Clean up database records since blockchain failed
          console.log('🧹 Cleaning up database records due to blockchain failure...');
          try {
            await this.cleanupService.cleanupFailedCoinCreation(context, data, {
              deleteCoin: true,
              deleteConfig: true,
              revertUserStats: true
            });
            await this.coinStateService.addCompletedStep(coinState.id, 'databaseCleanup');
          } catch (cleanupError) {
            console.error('❌ Database cleanup failed:', cleanupError);
            await this.coinStateService.addFailedStep(coinState.id, 'databaseCleanup');
          }

          await this.coinStateService.updateCoinState(coinState.id, { 
            status: 'failed', 
            error: `Blockchain execution failed: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}` 
          });
          
          return {
            success: false,
            tokenCA: '',
            error: `Blockchain execution failed: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}`
          };
        }
      }

      // Step 10: Mark as completed
      console.log('✅ Coin creation completed successfully!');
      await this.coinStateService.updateCoinState(coinState.id, { status: 'completed' });

      return {
        success: true,
        tokenCA: context.mint.address,
        configAddress: context.config.address,
        metadataUrl: finalMetadataResult.url,
        imageUrl: imageResult.url,
      };

    } catch (error) {
      console.error('❌ Coin creation failed:', error);
      
      // If we have context and the error occurred after database save, clean up
      if (coinState.completedSteps.includes('databaseSave') && coinState.mintAddress) {
        console.log('🧹 Cleaning up database records due to general failure...');
        try {
          // Mark coin as failed instead of deleting (since we don't have full context)
          await this.cleanupService.cleanupFailedCoinCreation(
            { mint: { address: coinState.mintAddress } } as any, 
            {} as any, 
            { deleteCoin: false, deleteConfig: false, revertUserStats: false, markAsFailed: true }
          );
          await this.coinStateService.addCompletedStep(coinState.id, 'databaseCleanup');
        } catch (cleanupError) {
          console.error('❌ Database cleanup failed:', cleanupError);
          await this.coinStateService.addFailedStep(coinState.id, 'databaseCleanup');
        }
      }
      
      await this.coinStateService.updateCoinState(coinState.id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });

      return {
        success: false,
        tokenCA: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Method to retry failed coin creation
  async retryCoinCreation(stateId: string): Promise<CoinCreationResult> {
    const coinState = await this.coinStateService.getCoinState(stateId);
    
    if (!coinState) {
      return {
        success: false,
        tokenCA: '',
        error: 'Coin creation state not found'
      };
    }

    if (coinState.status === 'completed') {
      return {
        success: true,
        tokenCA: coinState.mintAddress || '',
        configAddress: coinState.configAddress,
        metadataUrl: coinState.metadataUrl,
        imageUrl: coinState.imageUrl,
      };
    }

    // For now, we don't support retry - would need to implement proper retry logic
    return {
      success: false,
      tokenCA: coinState.mintAddress || '',
      error: 'Retry functionality not yet implemented'
    };
  }

  // Method to get coin creation status
  async getCoinCreationStatus(stateId: string): Promise<CoinCreationState | null> {
    return await this.coinStateService.getCoinState(stateId);
  }

}
