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
import { RollbackService, RollbackContext } from './rollback.service';

export class CoinCreationService {
  private validationService: ValidationService;
  private contextService: ContextService;
  private storageService: StorageService;
  private keypairService: KeypairService;
  private blockchainService: BlockchainService;
  private databaseService: DatabaseService;
  private rollbackService: RollbackService;

  constructor(
    private connection: Connection,
    private pool: Pool,
    private privy: PrivyClient,
    authorityPrivateKey: string
  ) {
    this.validationService = new ValidationService(pool);
    this.contextService = new ContextService(pool);
    this.storageService = new StorageService();
    this.keypairService = new KeypairService(connection, pool);
    this.blockchainService = new BlockchainService(connection, privy, authorityPrivateKey);
    this.databaseService = new DatabaseService(pool);
    this.rollbackService = new RollbackService(pool, connection);
  }

  async createCoin(data: CoinCreationRequest): Promise<CoinCreationResult> {
    let rollbackContext: RollbackContext | null = null;
    const executedSteps: string[] = [];

    try {
      // Step 1: Validate request
      console.log('🔍 Validating request...');
      const validationResult = await this.validationService.validateRequest(data);
      if (!validationResult.isValid) {
        return {
          success: false,
          tokenCA: '',
          error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        };
      }

      // Step 2: Get fresh mint keypair
      console.log('🔑 Getting fresh mint keypair...');
      const mintKeypair = await this.keypairService.getFreshKeypair();

      // Step 3: Build context (user, config, tagged user, etc.)
      console.log('🏗️ Building context...');
      const context = await this.contextService.buildContext(data, mintKeypair);

      // Initialize rollback context
      rollbackContext = RollbackService.createRollbackContext(context, data, executedSteps);

      // Step 4: Upload assets in parallel
      console.log('📤 Uploading assets...');
      const [imageResult, metadataResult] = await Promise.all([
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

      executedSteps.push('uploadImage', 'uploadMetadata');
      rollbackContext.imageUrl = imageResult.url;
      rollbackContext.metadataUrl = metadataResult.url;

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

      rollbackContext.metadataUrl = finalMetadataResult.url;

      // Step 5: Create and execute blockchain transactions
      console.log('⛓️ Creating blockchain transactions...');
      const transactions = await this.blockchainService.createPoolTransactions(
        context, 
        data, 
        finalMetadataResult.url
      );

      console.log('🚀 Executing blockchain transactions...');
      await this.blockchainService.executeTransactions(transactions, data.walletId);
      executedSteps.push('executeTransactions');

      // Step 6: Execute burn transaction (if needed)
      console.log('🔥 Executing burn transaction...');
      await this.blockchainService.executeBurnTransaction(context, data);
      executedSteps.push('executeBurn');

      // Step 7: Save to database
      console.log('💾 Saving to database...');
      await Promise.all([
        this.databaseService.saveConfig(context, data),
        this.databaseService.saveCoin(context, data, finalMetadataResult.url)
      ]);
      executedSteps.push('saveConfig', 'saveCoin', 'updateUserStats');

      // Step 8: Execute platform fee transaction
      console.log('💰 Executing platform fee transaction...');
      await this.blockchainService.executePlatformFeeTransaction(context, data);
      executedSteps.push('executePlatformFee');

      console.log('✅ Coin creation completed successfully!');
      return {
        success: true,
        tokenCA: context.mint.address,
        configAddress: context.config.address,
        metadataUrl: finalMetadataResult.url,
        imageUrl: imageResult.url,
      };

    } catch (error) {
      console.error('❌ Coin creation failed:', error);
      
      // Execute rollback if we have a rollback context
      if (rollbackContext) {
        try {
          console.log('🔄 Attempting rollback...');
          await this.rollbackService.executeRollback(rollbackContext);
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError);
          // Don't throw rollback errors, just log them
        }
      }

      return {
        success: false,
        tokenCA: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
