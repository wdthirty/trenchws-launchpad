import { 
  Connection, 
  PublicKey, 
  VersionedTransaction, 
  TransactionMessage
} from '@solana/web3.js';
import { BN } from 'bn.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { CpAmm, getTokenProgram, getUnClaimReward } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT } from '@solana/spl-token';

export interface ExternalWalletClaimTransactionData {
  poolId: string;
  actualCreatorPublicKey: string;
  receiverAddress: string;
  dammV2PoolAddress?: string;
  dammPoolState?: any;
  userPositions?: any[];
  availableRewards: {
    trading: boolean;
    migration: boolean;
    pool: boolean;
  };
  claimedTypes: string[];
  poolData: {
    creatorQuoteFee: number;
    isMigrated: boolean;
    migrationFeeWithdrawStatus: boolean;
    baseMint: string;
    config: string;
  };
  poolConfig: {
    migrationFeeOption: string;
  };
}

export class ExternalWalletRewardClaimBuilder {
  private client: DynamicBondingCurveClient;
  private cpAmm: CpAmm;

  constructor(private connection: Connection) {
    this.client = new DynamicBondingCurveClient(connection, 'confirmed');
    this.cpAmm = new CpAmm(connection);
  }

  async buildClaimTransactions(
    transactionData: ExternalWalletClaimTransactionData,
    userPublicKey: PublicKey
  ): Promise<VersionedTransaction[]> {
    // Validate userPublicKey
    if (!userPublicKey || !userPublicKey.toBase58) {
      throw new Error('Invalid user public key provided to claim transaction builder');
    }

    const transactions: VersionedTransaction[] = [];
    const poolId = new PublicKey(transactionData.poolId);
    const actualCreatorPublicKey = new PublicKey(transactionData.actualCreatorPublicKey);
    const receiverAddress = new PublicKey(transactionData.receiverAddress);

    // 1. Build Trading Fees Claim Transaction (if available)
    if (transactionData.availableRewards.trading) {
      try {
        console.log('🔧 Building trading fees claim transaction...');
        const tradingTx = await this.client.creator.claimCreatorTradingFee2({
          creator: actualCreatorPublicKey,
          payer: receiverAddress,
          receiver: receiverAddress,
          pool: poolId,
          maxBaseAmount: new BN(1_000_000_000_000_000), // 1 billion base tokens
          maxQuoteAmount: new BN(1_000_000_000_000_000), // 1 trillion quote tokens (SOL)
        });

        const versionedTx = await this.buildVersionedTransaction(tradingTx, userPublicKey);
        transactions.push(versionedTx);
        console.log('✅ Trading fees claim transaction built');
      } catch (error: any) {
        console.warn('⚠️ Could not build trading fees claim transaction:', error.message);
      }
    }

    // 2. Build Migration Fees Claim Transaction (if available and for creator coins)
    if (transactionData.availableRewards.migration && transactionData.claimedTypes.includes('migration')) {
      try {
        console.log('🔧 Building migration fees claim transaction...');
        const migrationTx = await this.client.creator.creatorWithdrawMigrationFee({
          virtualPool: poolId,
          sender: actualCreatorPublicKey,
        });

        const versionedTx = await this.buildVersionedTransaction(migrationTx, userPublicKey);
        transactions.push(versionedTx);
        console.log('✅ Migration fees claim transaction built');
      } catch (error: any) {
        console.warn('⚠️ Could not build migration fees claim transaction:', error.message);
      }
    }

    // 3. Build Pool Fees Claim Transaction (if available and migrated)
    if (transactionData.availableRewards.pool && transactionData.dammV2PoolAddress && transactionData.dammPoolState && transactionData.userPositions && transactionData.userPositions.length > 0) {
      try {
        console.log('🔧 Building pool fees claim transaction...');
        const dammV2PoolAddress = new PublicKey(transactionData.dammV2PoolAddress);
        const firstPosition = transactionData.userPositions[0];
        
        // Claim position fees using DAMM v2 SDK with correct parameters
        const poolFeeTx = await this.cpAmm.claimPositionFee2({
          owner: actualCreatorPublicKey,
          receiver: receiverAddress, // Use receiver param for tagged types
          pool: dammV2PoolAddress,
          position: firstPosition.position,
          positionNftAccount: firstPosition.positionNftAccount,
          tokenAVault: transactionData.dammPoolState.tokenAVault,
          tokenBVault: transactionData.dammPoolState.tokenBVault,
          tokenAMint: transactionData.dammPoolState.tokenAMint,
          tokenBMint: transactionData.dammPoolState.tokenBMint,
          tokenAProgram: getTokenProgram(transactionData.dammPoolState.tokenAFlag),
          tokenBProgram: getTokenProgram(transactionData.dammPoolState.tokenBFlag),
          feePayer: receiverAddress, // Always use user's wallet as fee payer
        });

        const versionedTx = await this.buildVersionedTransaction(poolFeeTx, userPublicKey);
        transactions.push(versionedTx);
        console.log('✅ Pool fees claim transaction built');
      } catch (error: any) {
        console.warn('⚠️ Could not build pool fees claim transaction:', error.message);
      }
    }

    if (transactions.length === 0) {
      throw new Error('No claimable transactions could be built');
    }

    console.log(`✅ Built ${transactions.length} claim transactions`);
    return transactions;
  }

  private async buildVersionedTransaction(
    transaction: any,
    userPublicKey: PublicKey
  ): Promise<VersionedTransaction> {
    // Set transaction properties
    transaction.feePayer = userPublicKey;
    transaction.recentBlockhash = (await this.connection.getLatestBlockhash('finalized')).blockhash;

    const msg = new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: transaction.instructions,
    }).compileToV0Message();

    return new VersionedTransaction(msg);
  }

  // Method to execute transactions using Privy's external wallet integration
  async executeClaimTransactionsWithPrivy(
    transactionData: ExternalWalletClaimTransactionData,
    userPublicKey: PublicKey,
    signTransaction: (input: { transaction: any; connection: Connection; address?: string }) => Promise<any>,
    sendTransaction: (input: { transaction: any; connection: Connection; address?: string }) => Promise<any>,
    userWalletAddress: string
  ): Promise<string[]> {
    // Validate inputs
    if (!userPublicKey || !userPublicKey.toBase58) {
      throw new Error('Invalid user public key provided to executeClaimTransactionsWithPrivy');
    }
    if (!userWalletAddress || typeof userWalletAddress !== 'string') {
      throw new Error('Invalid user wallet address provided to executeClaimTransactionsWithPrivy');
    }

    const signatures: string[] = [];

    try {
      // Build claim transactions
      console.log('🔧 Building claim transactions...');
      const claimTransactions = await this.buildClaimTransactions(transactionData, userPublicKey);

      // Execute claim transactions
      for (let i = 0; i < claimTransactions.length; i++) {
        const transaction = claimTransactions[i];
        console.log(`📝 Signing claim transaction ${i + 1}/${claimTransactions.length}...`);
        
        // Sign the transaction using Privy
        const signedTransaction = await signTransaction({
          transaction,
          connection: this.connection,
          address: userWalletAddress
        });

        console.log(`🚀 Sending claim transaction ${i + 1}/${claimTransactions.length}...`);
        
        // Send the transaction
        const receipt = await sendTransaction({
          transaction: signedTransaction,
          connection: this.connection,
          address: userWalletAddress
        });

        signatures.push(receipt.signature);
        console.log(`✅ Claim transaction ${i + 1} sent with signature: ${receipt.signature}`);
      }

      return signatures;

    } catch (error) {
      console.error('❌ Error executing claim transactions with Privy:', error);
      throw error;
    }
  }

  // Method to log claimed fees after successful external wallet transactions
  async logClaimedFees(
    transactionData: ExternalWalletClaimTransactionData,
    userWalletAddress: string,
    transactionSignatures: string[]
  ): Promise<void> {
    try {
      console.log('📝 Logging claimed fees for external wallet transaction...');
      
      // Calculate amounts for each fee type based on transaction data
      const amounts: { [feeType: string]: number } = {};

      // Trading fees amount
      if (transactionData.availableRewards.trading) {
        const tradingFeesSOL = transactionData.poolData.creatorQuoteFee / 1e9;
        amounts.trading = tradingFeesSOL;
      }

      // Migration fees amount (only for creator coins)
      if (transactionData.availableRewards.migration && transactionData.claimedTypes.includes('migration')) {
        // Import MIGRATION_FEE_AMOUNT from feeCalculator
        const { MIGRATION_FEE_AMOUNT } = await import('@/lib/feeCalculator');
        amounts.migration = MIGRATION_FEE_AMOUNT;
      }

      // Pool fees amount
      if (transactionData.availableRewards.pool && transactionData.userPositions && transactionData.userPositions.length > 0) {
        try {
          const firstPosition = transactionData.userPositions[0];
          const positionState = await this.cpAmm.fetchPositionState(firstPosition.position);
          const unClaimedReward = getUnClaimReward(transactionData.dammPoolState, positionState);
          
          let poolFees = 0;
          if (transactionData.dammPoolState.tokenBMint.equals(NATIVE_MINT)) {
            poolFees = unClaimedReward.feeTokenB.toNumber() / 1e9;
          } else if (transactionData.dammPoolState.tokenAMint.equals(NATIVE_MINT)) {
            poolFees = unClaimedReward.feeTokenA.toNumber() / 1e9;
          }
          
          amounts.pool = poolFees;
        } catch (error) {
          console.warn('⚠️ Could not calculate pool fees amount for logging:', error);
          // Set to 0 if we can't calculate
          amounts.pool = 0;
        }
      }

      // Prepare logging request
      const logRequest = {
        coinAddress: transactionData.poolId,
        userWalletAddress,
        feeTypes: transactionData.claimedTypes,
        transactionSignatures,
        amounts
      };

      // Call the logging API endpoint
      const response = await fetch('/api/rewards/log-external-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to log claimed fees');
      }

      const result = await response.json();
      console.log(`✅ Successfully logged claimed fees: ${result.message}`);
      
    } catch (error) {
      console.error('❌ Failed to log claimed fees for external wallet:', error);
      // Don't throw the error - logging failure shouldn't fail the entire claim process
      console.warn('⚠️ Continuing without logging claimed fees...');
    }
  }
}
