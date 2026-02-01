import { 
  Connection, 
  PublicKey, 
  VersionedTransaction, 
  TransactionMessage,
  TransactionConfirmationStrategy,
  SystemProgram,
  Keypair
} from '@solana/web3.js';
import { BN } from 'bn.js';
import bs58 from 'bs58';
import {
  MigrationOption,
  TokenDecimal,
  BaseFeeMode,
  ActivationType,
  CollectFeeMode,
  MigrationFeeOption,
  TokenType,
  DynamicBondingCurveClient,
  buildCurve,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import {
  getAssociatedTokenAddressSync,
  createBurnCheckedInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { createMemoInstruction } from '@solana/spl-memo';
import { PrivyClient } from '@privy-io/server-auth';
import { CoinCreationContext, CoinCreationRequest } from './types';
import { TransactionManager, TransactionStep } from './transaction-manager.service';

export class BlockchainService {
  private client: DynamicBondingCurveClient;
  private authorityKeypair: Keypair;
  private transactionManager: TransactionManager;

  constructor(
    private connection: Connection,
    private privy: PrivyClient,
    authorityPrivateKey: string
  ) {
    this.client = new DynamicBondingCurveClient(connection, 'confirmed');
    this.authorityKeypair = Keypair.fromSecretKey(bs58.decode(authorityPrivateKey));
    this.transactionManager = new TransactionManager(connection, privy);
  }

  async createPoolTransactions(
    context: CoinCreationContext,
    data: CoinCreationRequest,
    metadataUrl: string
  ): Promise<VersionedTransaction[]> {
    const { user, taggedUser, config, mint, feeStructure } = context;
    
    // Build curve configuration
    const totalSupplyNum = parseInt(data.totalSupply.replace(/,/g, ''));
    const curveConfig = buildCurve({
      totalTokenSupply: totalSupplyNum,
      percentageSupplyOnMigration: 20,
      migrationQuoteThreshold: 83,
      migrationOption: MigrationOption.MET_DAMM_V2,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE,
      lockedVestingParam: {
        totalLockedVestingAmount: 0,
        numberOfVestingPeriod: 0,
        cliffUnlockAmount: 0,
        totalVestingDuration: 0,
        cliffDurationFromMigrationTime: 0,
      },
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: feeStructure.feeBps,
          endingFeeBps: feeStructure.feeBps,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: true,
      activationType: ActivationType.Timestamp,
      collectFeeMode: CollectFeeMode.QuoteToken,
      migrationFeeOption: MigrationFeeOption.Customizable,
      tokenType: TokenType.SPL,
      partnerLpPercentage: 0,
      creatorLpPercentage: 0,
      partnerLockedLpPercentage: feeStructure.partnerLockedLpPercentage,
      creatorLockedLpPercentage: feeStructure.creatorLockedLpPercentage,
      creatorTradingFeePercentage: feeStructure.creatorTradingFeePercentage,
      leftover: 0,
      tokenUpdateAuthority: 1,
      migrationFee: {
        feePercentage: 4,
        creatorFeePercentage: 50,
      },
      migratedPoolFee: {
        collectFeeMode: CollectFeeMode.QuoteToken,
        dynamicFee: 1,
        poolFeeBps: feeStructure.feeBps,
      },
    });

    const userPublicKey = new PublicKey(user.privyWalletAddress);
    const buyer = new PublicKey(user.privyWalletAddress);
    const feeWalletPublicKey = new PublicKey(process.env.NEXT_PUBLIC_FEE_WALLET_ADDRESS!);
    
    // Determine pool creator
    const poolCreatorPublicKey = taggedUser 
      ? new PublicKey(taggedUser.walletAddress) 
      : userPublicKey;

    // Create pool transactions
    let poolTxs: any;
    if (config.isNew && config.keypair) {
      poolTxs = await this.client.pool.createConfigAndPoolWithFirstBuy({
        ...curveConfig,
        payer: userPublicKey,
        config: config.keypair.publicKey,
        feeClaimer: feeWalletPublicKey,
        leftoverReceiver: feeWalletPublicKey,
        quoteMint: new PublicKey('So11111111111111111111111111111111111111112'),
        preCreatePoolParam: {
          baseMint: mint.keypair.publicKey,
          name: data.tokenName,
          symbol: data.tokenSymbol,
          uri: metadataUrl,
          poolCreator: poolCreatorPublicKey,
        },
        firstBuyParam: {
          buyer: buyer,
          buyAmount: new BN(parseInt(data.preBuy)),
          minimumAmountOut: new BN(0),
          referralTokenAccount: null,
        },
      });
    } else {
      poolTxs = await this.client.pool.createPoolWithFirstBuy({
        createPoolParam: {
          config: new PublicKey(config.address),
          baseMint: mint.keypair.publicKey,
          name: data.tokenName,
          symbol: data.tokenSymbol,
          uri: metadataUrl,
          payer: userPublicKey,
          poolCreator: poolCreatorPublicKey,
        },
        firstBuyParam: {
          buyer: buyer,
          buyAmount: new BN(parseInt(data.preBuy)),
          minimumAmountOut: new BN(0),
          referralTokenAccount: null,
        },
      });
    }

    return this.buildVersionedTransactions(poolTxs, context, data);
  }

  private async buildVersionedTransactions(
    poolTxs: any,
    context: CoinCreationContext,
    data: CoinCreationRequest
  ): Promise<VersionedTransaction[]> {
    const { user, taggedUser, config, mint } = context;
    const userPublicKey = new PublicKey(user.privyWalletAddress);
    const versionedTxs: VersionedTransaction[] = [];

    for (const [txName, tx] of Object.entries(poolTxs)) {
      if (!tx) continue;

      const memoIx = createMemoInstruction("launchpad.fun", [this.authorityKeypair.publicKey]);
      const msg = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
        instructions: txName === 'createPoolTx' ? [...(tx as any).instructions, memoIx] : (tx as any).instructions,
      }).compileToV0Message();
      const vsnTxn = new VersionedTransaction(msg);

      // Sign transactions based on type
      if (txName === 'createConfigTx' && config.isNew && config.keypair) {
        vsnTxn.sign([config.keypair]);
        const { signedTransaction } = await this.privy.walletApi.solana.signTransaction({
          walletId: data.walletId,
          transaction: vsnTxn,
        });
        versionedTxs.push(signedTransaction as VersionedTransaction);
      } else if (txName === 'createPoolTx') {
        const signers = [mint.keypair, this.authorityKeypair];
        if (taggedUser) {
          signers.push(taggedUser.keypair);
        }
        vsnTxn.sign(signers);
        
        const { signedTransaction } = await this.privy.walletApi.solana.signTransaction({
          walletId: data.walletId,
          transaction: vsnTxn,
        });
        versionedTxs.push(signedTransaction as VersionedTransaction);
      } else if (txName === 'swapBuyTx' || txName === 'firstBuyTx') {
        const { signedTransaction } = await this.privy.walletApi.solana.signTransaction({
          walletId: data.walletId,
          transaction: vsnTxn,
        });
        versionedTxs.push(signedTransaction as VersionedTransaction);
      }
    }

    return versionedTxs;
  }

  async executeTransactions(transactions: VersionedTransaction[], walletId: string): Promise<void> {
    const steps: TransactionStep[] = transactions.map((tx, index) => 
      TransactionManager.createTransactionStep(
        `Transaction ${index + 1}`,
        tx,
        { requiresUserSignature: true, retryable: true }
      )
    );

    const results = await this.transactionManager.executeTransactionSequence(steps, walletId);
    
    // Check if any critical transactions failed
    const failedResults = results.filter(result => !result.success);
    if (failedResults.length > 0) {
      const errorMessages = failedResults.map(result => 
        `${result.stepName}: ${result.error}`
      ).join(', ');
      throw new Error(`Transaction sequence failed: ${errorMessages}`);
    }
  }

  async executeBurnTransaction(
    context: CoinCreationContext,
    data: CoinCreationRequest
  ): Promise<void> {
    if (!data.burnPercentage || parseInt(data.burnPercentage) <= 0 || parseInt(data.preBuy) <= 0) {
      return;
    }

    try {
      const { user, mint } = context;
      const buyerPublicKey = new PublicKey(user.privyWalletAddress);
      const userPublicKey = new PublicKey(user.privyWalletAddress);
      
      const associatedTokenAccount = getAssociatedTokenAddressSync(
        mint.keypair.publicKey,
        buyerPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Wait for token account to be created
      let tokenAccountInfo = null;
      let retryCount = 0;
      const maxRetries = 10;
      const retryDelay = 2000;
      
      while (!tokenAccountInfo && retryCount < maxRetries) {
        tokenAccountInfo = await this.connection.getAccountInfo(associatedTokenAccount);
        
        if (!tokenAccountInfo) {
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      if (!tokenAccountInfo) {
        console.log('Token account not found after retries - skipping burn');
        return;
      }

      const tokenBalanceResponse = await this.connection.getTokenAccountBalance(associatedTokenAccount);
      const currentBalance = parseInt(tokenBalanceResponse.value.amount);
      const burnAmount = Math.floor((currentBalance * parseInt(data.burnPercentage)) / 100);

      const burnInstruction = createBurnCheckedInstruction(
        associatedTokenAccount,
        mint.keypair.publicKey,
        buyerPublicKey,
        burnAmount,
        6,
        [],
        TOKEN_PROGRAM_ID
      );

      const burnMsg = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
        instructions: [burnInstruction],
      }).compileToV0Message();

      const burnVsnTxn = new VersionedTransaction(burnMsg);

      const { signedTransaction: signedBurnTx } = await this.privy.walletApi.solana.signTransaction({
        walletId: data.walletId,
        transaction: burnVsnTxn,
      });

      const burnSig = await this.connection.sendRawTransaction(
        (signedBurnTx as VersionedTransaction).serialize(), 
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        }
      );

      const burnErr = await this.connection.confirmTransaction(
        { signature: burnSig } as TransactionConfirmationStrategy, 
        'confirmed'
      );
      
      if (burnErr.value.err) {
        console.error(`❌ Burn transaction failed:`, burnErr.value.err);
        throw new Error(`Burn transaction failed: ${JSON.stringify(burnErr.value.err)}`);
      }
    } catch (error) {
      console.error(`❌ Error processing burn transaction:`, error);
      // Don't fail the entire coin creation if burn fails
    }
  }

  async executePlatformFeeTransaction(
    context: CoinCreationContext,
    data: CoinCreationRequest
  ): Promise<void> {
    try {
      const { user } = context;
      const userPublicKey = new PublicKey(user.privyWalletAddress);
      const feeWalletPublicKey = new PublicKey(process.env.NEXT_PUBLIC_FEE_WALLET_ADDRESS!);
      
      const platformFeeAmount = 0.008 * 1e9; // 0.008 SOL in lamports

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: feeWalletPublicKey,
        lamports: platformFeeAmount,
      });

      const feeMsg = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const feeVsnTxn = new VersionedTransaction(feeMsg);

      const { signedTransaction: signedFeeTx } = await this.privy.walletApi.solana.signTransaction({
        walletId: data.walletId,
        transaction: feeVsnTxn,
      });

      const feeSig = await this.connection.sendRawTransaction(
        (signedFeeTx as VersionedTransaction).serialize(), 
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        }
      );

      const feeErr = await this.connection.confirmTransaction(
        { signature: feeSig } as TransactionConfirmationStrategy, 
        'confirmed'
      );
      
      if (feeErr.value.err) {
        console.error(`❌ Platform fee transaction failed:`, feeErr.value.err);
        throw new Error(`Platform fee transaction failed: ${JSON.stringify(feeErr.value.err)}`);
      }
    } catch (error) {
      console.error(`❌ Error processing platform fee transaction:`, error);
      // Don't fail the entire coin creation if platform fee fails
    }
  }
}
