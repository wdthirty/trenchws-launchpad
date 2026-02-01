import { 
  Connection, 
  PublicKey, 
  VersionedTransaction, 
  TransactionMessage,
  SystemProgram,
  Keypair
} from '@solana/web3.js';
import { BN } from 'bn.js';
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
import bs58 from 'bs58';

export interface TransactionData {
  mintKeypair: {
    publicKey: string;
    secretKey: number[];
  };
  configKeypair: {
    publicKey: string;
    secretKey: number[];
  } | null;
  taggedUserKeypair: {
    publicKey: string;
    secretKey: number[];
  } | null;
  curveConfig: any;
  tokenParams: {
    name: string;
    symbol: string;
    uri: string;
  };
  userWalletAddress: string;
  preBuyAmount: number;
  burnPercentage: number;
  feeWalletAddress: string;
  authorityPrivateKey: string;
  platformFeeAmount: number;
}

export class ExternalWalletTransactionBuilder {
  private client: DynamicBondingCurveClient;
  private authorityKeypair: Keypair;

  constructor(
    private connection: Connection,
    authorityPrivateKey: string
  ) {
    this.client = new DynamicBondingCurveClient(connection, 'confirmed');
    this.authorityKeypair = Keypair.fromSecretKey(bs58.decode(authorityPrivateKey));
  }

  async buildTransactions(
    transactionData: TransactionData,
    userPublicKey: PublicKey
  ): Promise<VersionedTransaction[]> {
    // Validate userPublicKey
    if (!userPublicKey || !userPublicKey.toBase58) {
      throw new Error('Invalid user public key provided to transaction builder');
    }

    // Reconstruct keypairs from the transaction data
    const mintKeypair = Keypair.fromSecretKey(new Uint8Array(transactionData.mintKeypair.secretKey));
    const configKeypair = transactionData.configKeypair 
      ? Keypair.fromSecretKey(new Uint8Array(transactionData.configKeypair.secretKey))
      : null;
    const taggedUserKeypair = transactionData.taggedUserKeypair
      ? Keypair.fromSecretKey(new Uint8Array(transactionData.taggedUserKeypair.secretKey))
      : null;

    const feeWalletPublicKey = new PublicKey(transactionData.feeWalletAddress);
    const buyer = userPublicKey;
    
    // Determine pool creator
    const poolCreatorPublicKey = taggedUserKeypair 
      ? taggedUserKeypair.publicKey 
      : userPublicKey;

    // Create pool transactions
    let poolTxs: any;
    if (configKeypair) {
      // New config
      poolTxs = await this.client.pool.createConfigAndPoolWithFirstBuy({
        ...transactionData.curveConfig,
        payer: userPublicKey,
        config: configKeypair.publicKey,
        feeClaimer: feeWalletPublicKey,
        leftoverReceiver: feeWalletPublicKey,
        quoteMint: new PublicKey('So11111111111111111111111111111111111111112'),
        preCreatePoolParam: {
          baseMint: mintKeypair.publicKey,
          name: transactionData.tokenParams.name,
          symbol: transactionData.tokenParams.symbol,
          uri: transactionData.tokenParams.uri,
          poolCreator: poolCreatorPublicKey,
        },
        firstBuyParam: {
          buyer: buyer,
          buyAmount: new BN(transactionData.preBuyAmount),
          minimumAmountOut: new BN(0),
          referralTokenAccount: null,
        },
      });
    } else {
      // Existing config
      if (!transactionData.curveConfig.configAddress) {
        throw new Error('Config address is missing from curveConfig. This should not happen with existing configs.');
      }
      
      poolTxs = await this.client.pool.createPoolWithFirstBuy({
        createPoolParam: {
          config: new PublicKey(transactionData.curveConfig.configAddress),
          baseMint: mintKeypair.publicKey,
          name: transactionData.tokenParams.name,
          symbol: transactionData.tokenParams.symbol,
          uri: transactionData.tokenParams.uri,
          payer: userPublicKey,
          poolCreator: poolCreatorPublicKey,
        },
        firstBuyParam: {
          buyer: buyer,
          buyAmount: new BN(transactionData.preBuyAmount),
          minimumAmountOut: new BN(0),
          referralTokenAccount: null,
        },
      });
    }

    return this.buildVersionedTransactions(poolTxs, {
      mintKeypair,
      configKeypair,
      taggedUserKeypair,
      userPublicKey,
      transactionData
    });
  }

  private async buildVersionedTransactions(
    poolTxs: any,
    context: {
      mintKeypair: Keypair;
      configKeypair: Keypair | null;
      taggedUserKeypair: Keypair | null;
      userPublicKey: PublicKey;
      transactionData: TransactionData;
    }
  ): Promise<VersionedTransaction[]> {
    const { mintKeypair, configKeypair, taggedUserKeypair, userPublicKey, transactionData } = context;
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
      if (txName === 'createConfigTx' && configKeypair) {
        vsnTxn.sign([configKeypair]);
        versionedTxs.push(vsnTxn);
      } else if (txName === 'createPoolTx') {
        const signers = [mintKeypair, this.authorityKeypair];
        if (taggedUserKeypair) {
          signers.push(taggedUserKeypair);
        }
        vsnTxn.sign(signers);
        versionedTxs.push(vsnTxn);
      } else if (txName === 'swapBuyTx' || txName === 'firstBuyTx') {
        // These transactions need user signature
        versionedTxs.push(vsnTxn);
      }
    }

    return versionedTxs;
  }

  async buildBurnTransaction(
    transactionData: TransactionData,
    userPublicKey: PublicKey
  ): Promise<VersionedTransaction | null> {
    // Validate userPublicKey
    if (!userPublicKey || !userPublicKey.toBase58) {
      throw new Error('Invalid user public key provided to burn transaction builder');
    }

    if (!transactionData.burnPercentage || transactionData.burnPercentage <= 0 || transactionData.preBuyAmount <= 0) {
      return null;
    }

    const mintKeypair = Keypair.fromSecretKey(new Uint8Array(transactionData.mintKeypair.secretKey));
    const buyerPublicKey = userPublicKey;
    
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
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
      return null;
    }

    const tokenBalanceResponse = await this.connection.getTokenAccountBalance(associatedTokenAccount);
    const currentBalance = parseInt(tokenBalanceResponse.value.amount);
    const burnAmount = Math.floor((currentBalance * transactionData.burnPercentage) / 100);

    const burnInstruction = createBurnCheckedInstruction(
      associatedTokenAccount,
      mintKeypair.publicKey,
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

    return new VersionedTransaction(burnMsg);
  }

  async buildPlatformFeeTransaction(
    transactionData: TransactionData,
    userPublicKey: PublicKey
  ): Promise<VersionedTransaction> {
    // Validate userPublicKey
    if (!userPublicKey || !userPublicKey.toBase58) {
      throw new Error('Invalid user public key provided to platform fee transaction builder');
    }

    const feeWalletPublicKey = new PublicKey(transactionData.feeWalletAddress);
    
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: userPublicKey,
      toPubkey: feeWalletPublicKey,
      lamports: transactionData.platformFeeAmount,
    });

    const feeMsg = new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    return new VersionedTransaction(feeMsg);
  }

  // Method to execute transactions using Privy's external wallet integration
  async executeTransactionsWithPrivy(
    transactionData: TransactionData,
    userPublicKey: PublicKey,
    signTransaction: (input: { transaction: any; connection: Connection; address?: string }) => Promise<any>,
    sendTransaction: (input: { transaction: any; connection: Connection; address?: string }) => Promise<any>,
    userWalletAddress: string
  ): Promise<string[]> {
    // Validate inputs
    if (!userPublicKey || !userPublicKey.toBase58) {
      throw new Error('Invalid user public key provided to executeTransactionsWithPrivy');
    }
    if (!userWalletAddress || typeof userWalletAddress !== 'string') {
      throw new Error('Invalid user wallet address provided to executeTransactionsWithPrivy');
    }

    const signatures: string[] = [];

    try {
      // Build main pool transactions
      console.log('🔧 Building pool transactions...');
      const poolTransactions = await this.buildTransactions(transactionData, userPublicKey);

      // Execute pool transactions
      for (let i = 0; i < poolTransactions.length; i++) {
        const transaction = poolTransactions[i];
        console.log(`📝 Signing transaction ${i + 1}/${poolTransactions.length}...`);
        
        // Sign the transaction using Privy
        const signedTransaction = await signTransaction({
          transaction,
          connection: this.connection,
          address: userWalletAddress
        });

        console.log(`🚀 Sending transaction ${i + 1}/${poolTransactions.length}...`);
        
        // Send the transaction
        const receipt = await sendTransaction({
          transaction: signedTransaction,
          connection: this.connection,
          address: userWalletAddress
        });

        signatures.push(receipt.signature);
        console.log(`✅ Transaction ${i + 1} sent with signature: ${receipt.signature}`);
      }

      // Execute burn transaction if needed
      if (transactionData.burnPercentage > 0 && transactionData.preBuyAmount > 0) {
        console.log('🔥 Building and executing burn transaction...');
        const burnTransaction = await this.buildBurnTransaction(transactionData, userPublicKey);
        
        if (burnTransaction) {
          const signedBurnTransaction = await signTransaction({
            transaction: burnTransaction,
            connection: this.connection,
            address: userWalletAddress
          });

          const burnReceipt = await sendTransaction({
            transaction: signedBurnTransaction,
            connection: this.connection,
            address: userWalletAddress
          });

          signatures.push(burnReceipt.signature);
          console.log(`✅ Burn transaction sent with signature: ${burnReceipt.signature}`);
        }
      }

      // Execute platform fee transaction
      console.log('💰 Building and executing platform fee transaction...');
      const feeTransaction = await this.buildPlatformFeeTransaction(transactionData, userPublicKey);
      
      const signedFeeTransaction = await signTransaction({
        transaction: feeTransaction,
        connection: this.connection,
        address: userWalletAddress
      });

      const feeReceipt = await sendTransaction({
        transaction: signedFeeTransaction,
        connection: this.connection,
        address: userWalletAddress
      });

      signatures.push(feeReceipt.signature);
      console.log(`✅ Platform fee transaction sent with signature: ${feeReceipt.signature}`);

      return signatures;

    } catch (error) {
      console.error('❌ Error executing transactions with Privy:', error);
      throw error;
    }
  }
}
