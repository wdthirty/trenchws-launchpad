import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { Pool } from 'pg';
import { 
  ExternalWalletCoinCreationRequest 
} from '@/lib/services/coin-creation/types';
import { ValidationService } from '@/lib/services/coin-creation/validation.service';
import { ContextService } from '@/lib/services/coin-creation/context.service';
import { StorageService } from '@/lib/services/coin-creation/storage.service';
import { KeypairService } from '@/lib/services/coin-creation/keypair.service';
import { DatabaseService } from '@/lib/services/coin-creation/database.service';
import { CoinStateService } from '@/lib/services/coin-creation/coin-state.service';
import { CleanupService } from '@/lib/services/coin-creation/cleanup.service';

const {
  RPC_URL, 
  DATABASE_URL, 
  AUTHORITY_PRIVATE_KEY
} = process.env;

// Validate required environment variables
if (!RPC_URL || !DATABASE_URL) {
  console.error('❌ Missing required RPC or DATABASE environment variables');
  throw new Error('Blockchain or database configuration is incomplete');
}

if (!AUTHORITY_PRIVATE_KEY) {
  console.error('❌ Missing required AUTHORITY_PRIVATE_KEY environment variable');
  throw new Error("AUTHORITY_PRIVATE_KEY is missing on the server");
}

// Initialize services
const connection = new Connection(RPC_URL, 'confirmed');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Basic presence check
    const { 
      tokenLogo, 
      tokenName, 
      tokenSymbol, 
      userWalletAddress,
      userTwitterHandle,
      userTwitterId 
    } = req.body;

    if (!tokenLogo || !tokenName || !tokenSymbol || !userWalletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare request data for external wallet flow
    const externalRequest: ExternalWalletCoinCreationRequest = {
      tokenLogo,
      tokenName,
      tokenSymbol,
      tokenDescription: req.body.tokenDescription || '',
      website: req.body.website,
      twitter: req.body.twitter,
      telegram: req.body.telegram,
      preBuy: req.body.preBuy || '0',
      burnPercentage: req.body.burnPercentage || '0',
      userWalletAddress, // External wallet address
      userTwitterHandle,
      userTwitterId,
      xUserHandle: req.body.xUserHandle,
      creatorFee: req.body.creatorFee || '1',
      totalSupply: req.body.totalSupply || '1000000000',
      category: req.body.category,
    };

    // Initialize services
    const validationService = new ValidationService(pool);
    const contextService = new ContextService(pool);
    const storageService = new StorageService();
    const keypairService = new KeypairService(connection, pool);
    const databaseService = new DatabaseService(pool);
    const coinStateService = new CoinStateService(pool, connection);
    const cleanupService = new CleanupService(pool);

    // Step 1: Create coin state tracking
    const coinState = await coinStateService.createCoinState(userWalletAddress);
    
    try {
      // Step 2: Validate request
      console.log('🔍 Validating external wallet request...');
      await coinStateService.updateCoinState(coinState.id, { status: 'validating' });
      
      const validationResult = await validationService.validateExternalWalletRequest(externalRequest);
      if (!validationResult.isValid) {
        await coinStateService.updateCoinState(coinState.id, { 
          status: 'failed', 
          error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}` 
        });
        return res.status(400).json({
          success: false,
          error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        });
      }
      await coinStateService.addCompletedStep(coinState.id, 'validation');

      // Step 3: Get fresh mint keypair
      console.log('🔑 Getting fresh mint keypair...');
      const mintKeypair = await keypairService.getFreshKeypair();
      await coinStateService.addCompletedStep(coinState.id, 'keypairGeneration');

      // Step 4: Build context for external wallet
      console.log('🏗️ Building context for external wallet...');
      const context = await contextService.buildExternalWalletContext(externalRequest, mintKeypair);
      await coinStateService.addCompletedStep(coinState.id, 'contextBuilding');

      // Step 5: Upload assets
      console.log('📤 Uploading assets...');
      await coinStateService.updateCoinState(coinState.id, { status: 'uploading' });
      
      const [imageResult] = await Promise.all([
        storageService.uploadImage(externalRequest.tokenLogo, context.mint.address),
        storageService.uploadMetadata({
          tokenName: externalRequest.tokenName,
          tokenSymbol: externalRequest.tokenSymbol,
          tokenDescription: externalRequest.tokenDescription,
          mint: context.mint.address,
          image: '', // Will be updated after image upload
          twitter: externalRequest.twitter,
          website: externalRequest.website,
          telegram: externalRequest.telegram,
        })
      ]);

      await coinStateService.addCompletedStep(coinState.id, 'imageUpload');
      await coinStateService.addCompletedStep(coinState.id, 'metadataUpload');

      // Update metadata with actual image URL
      const finalMetadataResult = await storageService.uploadMetadata({
        tokenName: externalRequest.tokenName,
        tokenSymbol: externalRequest.tokenSymbol,
        tokenDescription: externalRequest.tokenDescription,
        mint: context.mint.address,
        image: imageResult.url,
        twitter: externalRequest.twitter,
        website: externalRequest.website,
        telegram: externalRequest.telegram,
      });

      await coinStateService.updateCoinState(coinState.id, {
        mintAddress: context.mint.address,
        configAddress: context.config.address,
        metadataUrl: finalMetadataResult.url,
        imageUrl: imageResult.url
      });

      // Step 6: Save to database FIRST (before blockchain)
      console.log('💾 Saving to database...');
      await coinStateService.updateCoinState(coinState.id, { status: 'database' });
      
      try {
        await Promise.all([
          databaseService.saveConfig(context, {
            ...externalRequest,
            walletId: externalRequest.userWalletAddress // Convert external wallet request to regular request format
          }),
          databaseService.saveExternalWalletCoin(context, externalRequest, finalMetadataResult.url)
        ]);
        await coinStateService.addCompletedStep(coinState.id, 'databaseSave');
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
        await coinStateService.addFailedStep(coinState.id, 'databaseSave');
        await coinStateService.updateCoinState(coinState.id, { 
          status: 'failed', 
          error: `Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` 
        });
        return res.status(500).json({
          success: false,
          error: `Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
        });
      }

      // Step 7: Prepare transaction data for frontend
      console.log('🔧 Preparing transaction data for frontend...');
      await coinStateService.updateCoinState(coinState.id, { status: 'blockchain' });
      
      const transactionData = {
        mintKeypair: {
          publicKey: mintKeypair.publicKey.toBase58(),
          secretKey: Array.from(mintKeypair.secretKey) // Convert to array for JSON serialization
        },
        configKeypair: context.config.keypair ? {
          publicKey: context.config.keypair.publicKey.toBase58(),
          secretKey: Array.from(context.config.keypair.secretKey)
        } : null,
        taggedUserKeypair: context.taggedUser?.keypair ? {
          publicKey: context.taggedUser.keypair.publicKey.toBase58(),
          secretKey: Array.from(context.taggedUser.keypair.secretKey)
        } : null,
        curveConfig: {
          totalTokenSupply: parseInt(externalRequest.totalSupply.replace(/,/g, '')),
          percentageSupplyOnMigration: 20,
          migrationQuoteThreshold: 83,
          tokenBaseDecimal: 6,
          tokenQuoteDecimal: 9,
          baseFeeMode: 'FeeSchedulerLinear',
          feeSchedulerParam: {
            startingFeeBps: context.feeStructure.feeBps,
            endingFeeBps: context.feeStructure.feeBps,
            numberOfPeriod: 0,
            totalDuration: 0,
          },
          dynamicFeeEnabled: true,
          activationType: 'Timestamp',
          collectFeeMode: 'QuoteToken',
          migrationFeeOption: 'Customizable',
          configAddress: context.config.address,
          tokenType: 'SPL',
          partnerLpPercentage: 0,
          creatorLpPercentage: 0,
          partnerLockedLpPercentage: context.feeStructure.partnerLockedLpPercentage,
          creatorLockedLpPercentage: context.feeStructure.creatorLockedLpPercentage,
          creatorTradingFeePercentage: context.feeStructure.creatorTradingFeePercentage,
          leftover: 0,
          tokenUpdateAuthority: 1,
          migrationFee: {
            feePercentage: 4,
            creatorFeePercentage: 50,
          },
          migratedPoolFee: {
            collectFeeMode: 'QuoteToken',
            dynamicFee: 1,
            poolFeeBps: context.feeStructure.feeBps,
          },
        },
        tokenParams: {
          name: externalRequest.tokenName,
          symbol: externalRequest.tokenSymbol,
          uri: finalMetadataResult.url,
        },
        userWalletAddress: externalRequest.userWalletAddress,
        preBuyAmount: parseInt(externalRequest.preBuy),
        burnPercentage: parseInt(externalRequest.burnPercentage),
        feeWalletAddress: process.env.NEXT_PUBLIC_FEE_WALLET_ADDRESS,
        authorityPrivateKey: AUTHORITY_PRIVATE_KEY,
        platformFeeAmount: 0.008 * 1e9, // 0.008 SOL in lamports
      };

      await coinStateService.addCompletedStep(coinState.id, 'transactionPreparation');

      // Return transaction data for frontend to execute
      return res.status(200).json({
        success: true,
        stateId: coinState.id,
        transactionData,
        metadata: {
          tokenCA: context.mint.address,
          configAddress: context.config.address,
          metadataUrl: finalMetadataResult.url,
          imageUrl: imageResult.url,
        }
      });

    } catch (error) {
      console.error('❌ External wallet coin creation failed:', error);
      
      // If we have context and the error occurred after database save, clean up
      if (coinState.completedSteps.includes('databaseSave') && coinState.mintAddress) {
        console.log('🧹 Cleaning up database records due to general failure...');
        try {
          // Mark coin as failed instead of deleting (since we don't have full context)
          await cleanupService.cleanupFailedCoinCreation(
            { mint: { address: coinState.mintAddress } } as any, 
            {} as any, 
            { deleteCoin: false, deleteConfig: false, revertUserStats: false, markAsFailed: true }
          );
          await coinStateService.addCompletedStep(coinState.id, 'databaseCleanup');
        } catch (cleanupError) {
          console.error('❌ Database cleanup failed:', cleanupError);
          await coinStateService.addFailedStep(coinState.id, 'databaseCleanup');
        }
      }
      
      await coinStateService.updateCoinState(coinState.id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }

  } catch (error) {
    console.error('❌ Error in external wallet coin creation API:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb',
    },
  },
};
