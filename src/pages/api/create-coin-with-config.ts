import { NextApiRequest, NextApiResponse } from 'next';
import { BN } from 'bn.js';
import { PublicKey, Keypair, Connection, VersionedTransaction, TransactionMessage, TransactionConfirmationStrategy, SystemProgram } from '@solana/web3.js';
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
import AWS from 'aws-sdk';
import bs58 from 'bs58';
import { PrivyClient } from '@privy-io/server-auth';
import { Pool } from 'pg';
import { getOrCreateTaggedWalletForCoin } from '@/lib/database';
import { findUserByWalletAddress, findUserByWalletId, updateUserStats, createCoin, findConfigByParams, createConfig } from '@/lib/database';
import { createMemoInstruction } from '@solana/spl-memo';
import { CoinCreationValidator } from '@/lib/validations/coin-creation';

const {
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID,
  PUBLIC_R2_BUCKET, PUBLIC_R2_URL = 'S3_BUCKET_LINK_HERE',
  RPC_URL, DATABASE_URL, PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_SESSION_SIGNER_PRIVATE_KEY,
  AUTHORITY_PRIVATE_KEY, NEXT_PUBLIC_FEE_WALLET_ADDRESS
} = process.env;

// Validate required environment variables
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !PUBLIC_R2_BUCKET) {
  console.error('❌ Missing required R2 environment variables for file upload');
  throw new Error('R2 storage configuration is incomplete');
}

if (!RPC_URL || !DATABASE_URL) {
  console.error('❌ Missing required RPC or DATABASE environment variables');
  throw new Error('Blockchain or database configuration is incomplete');
}

if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
  console.error('❌ Missing required PRIVY environment variables');
  throw new Error("PRIVY_APP_ID / PRIVY_APP_SECRET are missing on the server");
}

if (!AUTHORITY_PRIVATE_KEY) {
  console.error('❌ Missing required AUTHORITY_PRIVATE_KEY environment variable');
  throw new Error("AUTHORITY_PRIVATE_KEY is missing on the server");
}

const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, { walletApi: { authorizationPrivateKey: PRIVY_SESSION_SIGNER_PRIVATE_KEY } });



const PRIVATE_R2_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new AWS.S3({
  endpoint: PRIVATE_R2_URL,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

// Validation is now handled by CoinCreationValidator class

// Function to normalize and validate Twitter username
function normalizeTwitterUsername(username: string): string | null {
  if (!username) return null;

  // Remove leading/trailing whitespace
  let normalized = username.trim();

  // Remove @ symbol if present
  if (normalized.startsWith('@')) {
    normalized = normalized.substring(1);
  }

  // Remove any other @ symbols
  normalized = normalized.replace(/@/g, '');

  // Only allow alphanumeric characters and underscores
  normalized = normalized.replace(/[^a-zA-Z0-9_]/g, '');

  // Convert to lowercase for consistency
  normalized = normalized.toLowerCase();

  // Validate length (Twitter usernames are 1-15 characters)
  if (normalized.length === 0 || normalized.length > 15) {
    return null;
  }

  return normalized;
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    const connection = new Connection(RPC_URL!, 'confirmed');
    const {
      tokenLogo, tokenName, tokenSymbol, tokenDescription,
      twitter, website, telegram, preBuy, burnPercentage, walletId, xUserHandle, creatorFee, totalSupply, category
    } = req.body;

    // Basic presence check - detailed validation happens in CoinCreationValidator
    if (!tokenLogo || !tokenName || !tokenSymbol || !walletId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use comprehensive backend validation instead of trusting client data
    const validator = new CoinCreationValidator(pool);
    
    // Prepare data for validation
    const validationData = {
      tokenName,
      tokenSymbol,
      tokenDescription,
      tokenLogo,
      website,
      telegram,
      preBuy: preBuy || '0',
      burnPercentage: burnPercentage || '0',
      xUserHandle,
      totalSupply: totalSupply || '1000000000',
      creatorFee: creatorFee || '1',
      category: category || '',
      walletId
    };

    // Run all validations
    await validator.validate(validationData);
    
    if (!validator.isValid()) {
      const errors = validator.getErrors();
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors
      });
    }

    // Get user data from validation (already verified)
    const user = (validator as any).user;
    const actualUserWallet = user.privyWalletAddress;

    // Load authority keypair from environment
    const authorityKeypair = Keypair.fromSecretKey(bs58.decode(AUTHORITY_PRIVATE_KEY));

    const feeWalletPublicKey = new PublicKey(NEXT_PUBLIC_FEE_WALLET_ADDRESS!);

    // Parse total supply (remove commas and convert to number with decimals)
    const totalSupplyNum = parseInt(validationData.totalSupply.replace(/,/g, ''));

    // Get fee structure based on creator fee
    const feeStructure = FEE_STRUCTURES[validationData.creatorFee as keyof typeof FEE_STRUCTURES];
    if (!feeStructure) {
      return res.status(400).json({ error: 'Invalid creator fee' });
    }

    // Process tagged user if xUserHandle is provided
    let taggedUserTwitterUsername: string | null = null;
    let taggedUserPublicKey: string | null = null;
    let taggedUserKeypair: Keypair | null = null;

    if (xUserHandle && xUserHandle.trim() !== '') {
      // Normalize and validate the Twitter username
      const normalizedUsername = normalizeTwitterUsername(xUserHandle);

      if (!normalizedUsername) {
        return res.status(400).json({ error: 'Invalid Twitter username format' });
      }

      try {
        // Get or create tagged wallet for this Twitter username
        const taggedWallet = await getOrCreateTaggedWalletForCoin(pool, normalizedUsername);
        taggedUserTwitterUsername = taggedWallet.twitterUsername;
        taggedUserPublicKey = taggedWallet.walletAddress;
        taggedUserKeypair = Keypair.fromSecretKey(bs58.decode(taggedWallet.walletPrivateKey));
      } catch (error) {
        console.log(`❌ Failed to create tagged wallet for user: ${normalizedUsername}`, error);
      }
    }

    // Buyer is always the user creating the coin (not the tagged user)
    const buyer = new PublicKey(actualUserWallet);

    // Check for existing config with same parameters
    const existingConfig = await findConfigByParams(pool, totalSupplyNum, validationData.creatorFee);

    let configKeypair: Keypair;
    let configAddress: string;
    let isNewConfig = false;

    if (existingConfig) {
      configAddress = existingConfig.configAddress;
    } else {
      configKeypair = Keypair.generate();
      configAddress = configKeypair.publicKey.toBase58();
      isNewConfig = true;
    }

    // Get fresh mint keypair for the token
    const mintKeypair = await fetchAndVerifyFreshKeypair(connection, pool);
    if (!mintKeypair) throw new Error('Failed to get unused mint keypair');

    // Upload image and metadata using mint address
    const imageUrl = await uploadImage(tokenLogo, mintKeypair.publicKey.toBase58());
    const metadataUrl = await uploadMetadata({
      tokenName, tokenSymbol, tokenDescription, mint: mintKeypair.publicKey.toBase58(),
      image: imageUrl, twitter, website, telegram
    });

    // Build curve configuration
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

    console.log(`📊 Curve configuration built successfully`);
    console.log(`📊 Curve config response:`, JSON.stringify(curveConfig, null, 2));

    const client = new DynamicBondingCurveClient(connection, 'confirmed');
    const userPublicKey = new PublicKey(actualUserWallet);

    // If a user was tagged, we MUST use their wallet as the pool creator
    if (xUserHandle && xUserHandle.trim() !== '' && !taggedUserPublicKey) {
      throw new Error('Failed to create wallet for tagged user - cannot proceed with coin creation');
    }

    const poolCreatorPublicKey = taggedUserPublicKey ? new PublicKey(taggedUserPublicKey) : userPublicKey;

    // Create pool transactions based on whether we're using existing or new config
    let poolTxs: any;

    if (isNewConfig) {
      poolTxs = await client.pool.createConfigAndPoolWithFirstBuy({
        ...curveConfig,
        payer: userPublicKey,
        config: configKeypair.publicKey,
        feeClaimer: feeWalletPublicKey,
        leftoverReceiver: feeWalletPublicKey,
        quoteMint: new PublicKey('So11111111111111111111111111111111111111112'),
        preCreatePoolParam: {
          baseMint: mintKeypair.publicKey,
          name: validationData.tokenName,
          symbol: validationData.tokenSymbol,
          uri: metadataUrl,
          poolCreator: poolCreatorPublicKey,
        },
        firstBuyParam: {
          buyer: buyer,
          buyAmount: new BN(parseInt(preBuy)),
          minimumAmountOut: new BN(0),
          referralTokenAccount: null,
        },
      });
    } else {
      poolTxs = await client.pool.createPoolWithFirstBuy({
        createPoolParam: {
          config: new PublicKey(configAddress),
          baseMint: mintKeypair.publicKey,
          name: validationData.tokenName,
          symbol: validationData.tokenSymbol,
          uri: metadataUrl,
          payer: userPublicKey,
          poolCreator: poolCreatorPublicKey,
        },
        firstBuyParam: {
          buyer: buyer,
          buyAmount: new BN(parseInt(preBuy)),
          minimumAmountOut: new BN(0),
          referralTokenAccount: null,
        },
      });
    }

    const versionedTxs: VersionedTransaction[] = [];

    // Process each transaction in order
    for (const [txName, tx] of Object.entries(poolTxs)) {
      if (!tx) continue;

      const memoIx = createMemoInstruction("launchpad.fun", [authorityKeypair.publicKey]);
      const msg = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: txName === 'createPoolTx' ? [...(tx as any).instructions, memoIx] : (tx as any).instructions,
      }).compileToV0Message();
      const vsnTxn = new VersionedTransaction(msg);

      // For create config transaction: configKeypair + user (only for new configs)
      if (txName === 'createConfigTx' && isNewConfig) {
        // Sign with config keypair first
        vsnTxn.sign([configKeypair]);

        // Then sign with Privy for the user (payer)
        const { signedTransaction } = await privy.walletApi.solana.signTransaction({
          walletId,
          transaction: vsnTxn,
        });
        versionedTxs.push(signedTransaction as VersionedTransaction);
      }
      // For pool creation transaction: mint keypair + (tagged user OR authority keypair) + user
      else if (txName === 'createPoolTx') {
        const signers = [mintKeypair, authorityKeypair]; // Always need mint keypair

        if (taggedUserKeypair) {
          signers.push(taggedUserKeypair);
        }

        // Sign with local keypairs first
        vsnTxn.sign(signers);
        console.log(`🔑 Signed create pool transaction with ${signers.length} local signers`);

        // Then sign with Privy for the user (payer)
        const { signedTransaction } = await privy.walletApi.solana.signTransaction({
          walletId,
          transaction: vsnTxn,
        });
        console.log(`🔑 Signed create pool transaction with Privy for user`);
        versionedTxs.push(signedTransaction as VersionedTransaction);
      }
      // For first buy transaction: only user
      else if (txName === 'swapBuyTx' || txName === 'firstBuyTx') {
        const { signedTransaction } = await privy.walletApi.solana.signTransaction({
          walletId,
          transaction: vsnTxn,
        });
        versionedTxs.push(signedTransaction as VersionedTransaction);
      }
    }

    for (let i = 0; i < versionedTxs.length; i++) {
      const tx = versionedTxs[i];

      try {
        const sig = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        const err = await connection.confirmTransaction({ signature: sig } as TransactionConfirmationStrategy, 'confirmed');
        if (err.value.err) {
          console.error(`❌ Transaction ${i + 1} failed:`, err.value.err);
          throw new Error(`Transaction ${i + 1} failed: ${JSON.stringify(err.value.err)}`);
        }
      } catch (error) {
        console.error(`❌ Error sending transaction ${i + 1}:`, error);
        throw error;
      }
    }

    // Handle burn transaction if burn percentage is greater than 0 and there's a first buy
    if (validationData.burnPercentage && parseInt(validationData.burnPercentage) > 0 && parseInt(preBuy) > 0) {
      try {
        // Get the associated token account for the buyer (user who actually bought tokens)
        const buyerPublicKey = new PublicKey(actualUserWallet);
        const associatedTokenAccount = getAssociatedTokenAddressSync(
          mintKeypair.publicKey,
          buyerPublicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Get the current token balance in the buyer's wallet with retry logic
        let tokenAccountInfo = null;
        let retryCount = 0;
        const maxRetries = 10; // Maximum 10 retries
        const retryDelay = 2000; // 2 seconds between retries
        
        while (!tokenAccountInfo && retryCount < maxRetries) {
          tokenAccountInfo = await connection.getAccountInfo(associatedTokenAccount);
          
          if (!tokenAccountInfo) {
            retryCount++;
            
            if (retryCount < maxRetries) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }
        
        if (!tokenAccountInfo) {
          // Token account not found after retries - skipping burn
        } else {
          // Parse the token account to get the current balance
          const tokenBalanceResponse = await connection.getTokenAccountBalance(associatedTokenAccount);
          const currentBalance = parseInt(tokenBalanceResponse.value.amount);

          // Calculate burn amount based on the actual tokens in the wallet
          const burnAmount = Math.floor((currentBalance * parseInt(validationData.burnPercentage)) / 100);

          // Create burn instruction
          const burnInstruction = createBurnCheckedInstruction(
            associatedTokenAccount,
            mintKeypair.publicKey,
            buyerPublicKey,
            burnAmount,
            6, // decimals
            [],
            TOKEN_PROGRAM_ID
          );

          // Create versioned transaction for burn
          const burnMsg = new TransactionMessage({
            payerKey: userPublicKey,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions: [burnInstruction],
          }).compileToV0Message();

          const burnVsnTxn = new VersionedTransaction(burnMsg);

          // Sign with Privy for the user (payer)
          console.log(`🔑 Signing burn transaction with Privy`);
          const { signedTransaction: signedBurnTx } = await privy.walletApi.solana.signTransaction({
            walletId,
            transaction: burnVsnTxn,
          });

          // Send burn transaction
          const burnSig = await connection.sendRawTransaction((signedBurnTx as VersionedTransaction).serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });

          const burnErr = await connection.confirmTransaction({ signature: burnSig } as TransactionConfirmationStrategy, 'confirmed');
          if (burnErr.value.err) {
            console.error(`❌ Burn transaction failed:`, burnErr.value.err);
            throw new Error(`Burn transaction failed: ${JSON.stringify(burnErr.value.err)}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing burn transaction:`, error);
        // Don't fail the entire coin creation if burn fails
      }
    }

    // Store new config in database if we created one
    if (isNewConfig) {
      try {
        await createConfig(pool, configAddress, totalSupplyNum, validationData.creatorFee);
      } catch (error) {
        console.error(`❌ Failed to store config in database:`, error);
        // Don't fail the coin creation if config storage fails
      }
    }

    // Create coin record in central database
    try {
      const coinAddress = mintKeypair.publicKey.toBase58();

      // Get creator's user record from the wallet address
      const creatorUser = await findUserByWalletAddress(pool, userPublicKey.toBase58());

      // User should exist if they're creating a coin
      if (!creatorUser) {
        console.error(`❌ Creator user not found for wallet: ${userPublicKey.toBase58()}`);
        console.error(`❌ This should not happen - user must exist to create coins`);
        console.error(`❌ Check if user has logged in and their wallet address is correct`);
        throw new Error('Creator user not found in database - user must exist to create coins');
      }

      const actualCreatorPrivyUserId = creatorUser.privyUserId;

      await createCoin(pool, {
        coinName: tokenName,
        coinSymbol: tokenSymbol,
        coinAddress: coinAddress,
        creatorPrivyUserId: actualCreatorPrivyUserId,
        taggedWalletTwitterUsername: taggedUserTwitterUsername || '',
        coinFeeRate: parseFloat(creatorFee || '0'),
        metadataUri: metadataUrl,
        description: tokenDescription,
        category: validationData.category || undefined,
        isGraduated: false,
      });

      // Update user's coins created count
      await updateUserStats(pool, creatorUser.privyUserId, {
        coinsCreated: creatorUser.coinsCreated + 1
      });
    } catch (error) {
      console.error(`❌ Failed to create coin record in central database:`, error);
      // Don't fail the coin creation, just log the error
    }

    // Platform fee transfer transaction - at the very end after all operations

    try {
      const feeWalletPublicKey = new PublicKey(NEXT_PUBLIC_FEE_WALLET_ADDRESS);

      // Calculate platform fee (you can adjust this amount as needed)
      const platformFeeAmount = 0.008 * 1e9; // 0.008 SOL in lamports

      console.log(`💰 Platform fee amount: ${platformFeeAmount / 1e9} SOL (${platformFeeAmount} lamports)`);

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: feeWalletPublicKey,
        lamports: platformFeeAmount,
      });

      // Create versioned transaction for platform fee
      const feeMsg = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const feeVsnTxn = new VersionedTransaction(feeMsg);

      // Sign with Privy for the user (payer)
      console.log(`🔑 Signing platform fee transaction with Privy`);
      const { signedTransaction: signedFeeTx } = await privy.walletApi.solana.signTransaction({
        walletId,
        transaction: feeVsnTxn,
      });

      // Send platform fee transaction
      const feeSig = await connection.sendRawTransaction((signedFeeTx as VersionedTransaction).serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const feeErr = await connection.confirmTransaction({ signature: feeSig } as TransactionConfirmationStrategy, 'confirmed');
      if (feeErr.value.err) {
        console.error(`❌ Platform fee transaction failed:`, feeErr.value.err);
        throw new Error(`Platform fee transaction failed: ${JSON.stringify(feeErr.value.err)}`);
      }

    } catch (error) {
      console.error(`❌ Error processing platform fee transaction:`, error);
      // Don't fail the entire coin creation if platform fee fails
    }

    return res.status(200).json({
      success: true,
      tokenCA: mintKeypair.publicKey.toBase58()
    });

  } catch (error) {
    console.error('Error creating coin:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create coin'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

async function uploadImage(dataUri: string, mint: string) {
  try {
    const [_, contentType, base64Data] = dataUri.match(/^data:([^;]+);base64,(.+)$/) || [];
    if (!contentType || !base64Data) {
      throw new Error('Invalid image data format');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const ext = contentType.split('/')[1];
    const key = `images/${mint}.${ext}`;

    await r2.putObject({
      Bucket: PUBLIC_R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }).promise();

    const imageUrl = `${PUBLIC_R2_URL}/${key}`;
    return imageUrl;
  } catch (error) {
    console.error(`❌ Failed to upload image:`, error);
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function uploadMetadata(params: any) {
  try {
    const key = `metadata/${params.mint}.json`;
    const content = JSON.stringify({
      name: params.tokenName,
      symbol: params.tokenSymbol,
      description: params.tokenDescription,
      image: params.image,
      twitter: params.twitter,
      website: params.website,
      telegram: params.telegram,
    });

    await r2.putObject({
      Bucket: PUBLIC_R2_BUCKET!,
      Key: key,
      Body: Buffer.from(content),
      ContentType: 'application/json'
    }).promise();

    const metadataUrl = `${PUBLIC_R2_URL}/${key}`;
    return metadataUrl;
  } catch (error) {
    console.error(`❌ Failed to upload metadata:`, error);
    throw new Error(`Metadata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchAndVerifyFreshKeypair(connection: Connection, pool: Pool): Promise<Keypair> {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const res = await client.query(
        `UPDATE keys
         SET used = TRUE
         WHERE id = (
           SELECT id FROM keys
           WHERE used = FALSE
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING private_key, public_key`
      );

      await client.query('COMMIT');

      if (res.rowCount === 0) {
        continue;
      }

      const { private_key } = res.rows[0];
      const secretKey = bs58.decode(private_key);
      const keypair = Keypair.fromSecretKey(secretKey);

      const acctInfo = await connection.getAccountInfo(keypair.publicKey);
      if (!acctInfo) {
        return keypair;
      }
    } catch (err) {
      console.error(`❌ DB error on attempt ${attempt + 1}:`, err);
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Failed to rollback transaction:', rollbackErr);
      }
    } finally {
      client.release();
    }
  }

  return Keypair.generate();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb',
    },
  },
}
