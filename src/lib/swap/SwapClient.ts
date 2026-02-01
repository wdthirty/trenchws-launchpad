import { Connection, PublicKey, VersionedTransaction, TransactionMessage, AddressLookupTableAccount, VersionedMessage, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { usePrivy } from '@privy-io/react-auth';

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    feeBps: number;
    feeAccounts: Record<string, string>;
  };
  priceImpactPct: number;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
  transaction?: string; // Ultra API includes the transaction
  requestId?: string; // Ultra API includes request ID
  error?: string; // Error message if quote failed
  isInsufficientBalance?: boolean; // Flag for insufficient balance errors
  originalError?: string; // Original error from API
}

export interface SwapTransaction {
  swapTransaction: string;
  lastValidBlockHeight: number;
}

export interface SwapAnalytics {
  swapAttemptCount: number;
  swapSuccessCount: number;
  swapFailureCount: number;
  averageSwapTime: number;
}

export interface SwapFees {
  priorityMicroLamports: number;
  computeUnits: number;
}

// Custom error class for Ultra API errors
export class UltraAPIError extends Error {
  constructor(
    message: string,
    public readonly originalError?: string,
    public readonly isInsufficientBalance?: boolean
  ) {
    super(message);
    this.name = 'UltraAPIError';
  }
}

// Platform fee wallet for Launchpad token trades
const PLATFORM_FEE_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET_ADDRESS;

export class SwapClient {
  private connection: Connection;
  private quoteCache: Map<string, { quote: SwapQuote; timestamp: number }> = new Map();
  public analytics: SwapAnalytics = {
    swapAttemptCount: 0,
    swapSuccessCount: 0,
    swapFailureCount: 0,
    averageSwapTime: 0,
  };
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl);
  }

  // Load address lookup tables from message (no caching - per trade)
  private async loadAddressLookupTablesFromMessage(message: VersionedMessage): Promise<AddressLookupTableAccount[]> {
    const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
    
    if (message.addressTableLookups) {
      for (let lookup of message.addressTableLookups) {
        try {
          const lutAccounts = await this.connection.getAddressLookupTable(lookup.accountKey);
          if (lutAccounts.value) {
            addressLookupTableAccounts.push(lutAccounts.value);
          }
        } catch (error) {
          console.warn('Failed to load address lookup table:', lookup.accountKey.toBase58(), error);
        }
      }
    }

    return addressLookupTableAccounts;
  }

  private getCacheKey(inputMint: string, outputMint: string, amount: string, slippage: number): string {
    return `${inputMint}-${outputMint}-${amount}-${slippage}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  // Clear quote cache after a trade to ensure fresh quotes
  public clearQuoteCache(): void {
    this.quoteCache.clear();
  }

  private logError(type: string, message: string): void {
    const error = { type, message, timestamp: Date.now() };
    // this.analytics.errors.push(error); // This line was removed as per the edit hint
    console.error(`SwapClient Error [${type}]:`, message);
  }

  private updateAnalytics(
    swapTime?: number,
    success?: boolean,
    volume?: number
  ): void {
    this.analytics.swapAttemptCount++;
    
    if (swapTime !== undefined) {
      const totalSwapTime = this.analytics.averageSwapTime * (this.analytics.swapAttemptCount - 1) + swapTime;
      this.analytics.averageSwapTime = totalSwapTime / this.analytics.swapAttemptCount;
    }

    if (success !== undefined) {
      if (success) {
        this.analytics.swapSuccessCount++;
      } else {
        this.analytics.swapFailureCount++;
      }
    }
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippage: number = 50,
    taker?: string
  ): Promise<SwapQuote> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(inputMint, outputMint, amount, slippage);

    // Check cache first
    const cached = this.quoteCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.quote;
    }

    try {
      // Use ultra API for quotes
      let quoteUrl = `https://lite-api.jup.ag/ultra/v1/order?` +
        `inputMint=${inputMint}` +
        `&outputMint=${outputMint}` +
        `&amount=${amount}`;
      
      // Add taker parameter if provided (required for transaction field)
      if (taker) {
        quoteUrl += `&taker=${taker}`;
      }

      const response = await fetch(quoteUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Ultra API error: ${response.status}`);
      }

      const ultraQuote = await response.json();
      
      // Check for error messages in the response
      if (ultraQuote.errorMessage) {
        const isInsufficientBalance = ultraQuote.errorMessage.toLowerCase().includes('insufficient');
        const userFriendlyMessage = isInsufficientBalance 
          ? 'Insufficient balance for this trade'
          : `Quote error: ${ultraQuote.errorMessage}`;
        
        // Return error response instead of throwing
        return {
          inputMint,
          outputMint,
          inAmount: amount,
          outAmount: '0',
          otherAmountThreshold: '0',
          swapMode: 'ExactIn',
          slippageBps: slippage,
          priceImpactPct: 0,
          routePlan: [],
          contextSlot: 0,
          timeTaken: Date.now() - startTime,
          error: userFriendlyMessage,
          isInsufficientBalance,
          originalError: ultraQuote.errorMessage
        };
      }

      // Convert ultra API response to our SwapQuote format
      const quote: SwapQuote = {
        inputMint,
        outputMint,
        inAmount: ultraQuote.inAmount || amount,
        outAmount: ultraQuote.outAmount,
        otherAmountThreshold: ultraQuote.otherAmountThreshold || ultraQuote.outAmount,
        swapMode: ultraQuote.swapMode || 'ExactIn',
        slippageBps: ultraQuote.slippageBps || slippage,
        priceImpactPct: ultraQuote.priceImpact || 0,
        routePlan: ultraQuote.routePlan || [],
        contextSlot: ultraQuote.contextSlot || 0,
        timeTaken: Date.now() - startTime,
        transaction: ultraQuote.transaction,
        requestId: ultraQuote.requestId
      };

      const quoteTime = Date.now() - startTime;

      // Cache the quote
      this.quoteCache.set(cacheKey, { quote, timestamp: Date.now() });
      
      // this.updateAnalytics(quoteTime); // This line was removed as per the edit hint

      return quote;
    } catch (error) {
      this.logError('QUOTE_FETCH', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }



  async buildAndSignTransaction(
    swapTransaction: SwapTransaction,
    fees: SwapFees,
    userPublicKey: string,
    isLaunchpadToken: boolean = false,
    tradeAmount: number = 0
  ): Promise<VersionedTransaction> {
    try {
      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(swapTransaction.swapTransaction, 'base64')
      );

      // Load address lookup tables from the message
      const addressLookupTableAccounts = await this.loadAddressLookupTablesFromMessage(transaction.message);

      // Add compute budget instructions for fees
      const { ComputeBudgetProgram } = await import('@solana/web3.js');

      // Decompile the message to get editable instructions with address lookup tables
      const txMessage = TransactionMessage.decompile(transaction.message, { addressLookupTableAccounts });

      // Filter out existing compute budget instructions (Jupiter may include them)
      const filteredInstructions = txMessage.instructions.filter(ix => 
        !ix.programId.equals(ComputeBudgetProgram.programId)
      );

      // Create copy of instructions to avoid modifying the original array
      const allInstructions = [...filteredInstructions];

      // Add platform fee instruction if it's NOT a Launchpad token trade
      if (!isLaunchpadToken && tradeAmount > 0) {
        const platformFeeAmount = Math.floor(tradeAmount * 0.008); // 0.8% platform fee
        const platformFeeTransfer = SystemProgram.transfer({
          fromPubkey: new PublicKey(userPublicKey),
          toPubkey: new PublicKey(PLATFORM_FEE_WALLET),
          lamports: platformFeeAmount,
        });

        // Add platform fee transfer to instructions
        allInstructions.push(platformFeeTransfer);
      }

      // Add compute budget instructions at the BEGINNING (must be first)
      allInstructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fees.priorityMicroLamports })
      );
      allInstructions.unshift(
        ComputeBudgetProgram.setComputeUnitLimit({ units: fees.computeUnits })
      );

      // Recompile the message with the same lookup tables
      const newMessage = new TransactionMessage({
        instructions: allInstructions,
        payerKey: new PublicKey(userPublicKey),
        recentBlockhash: txMessage.recentBlockhash,
      }).compileToV0Message(addressLookupTableAccounts);

      const newTransaction = new VersionedTransaction(newMessage);
      return newTransaction;
    } catch (error) {
      this.logError('TRANSACTION_BUILD', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async sendTransaction(transaction: VersionedTransaction): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Send via standard RPC (no CORS issues, distributed across clients)
      const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 0,
      });
      
      const swapTime = Date.now() - startTime;
      this.updateAnalytics(swapTime, true);
      
      return signature;
    } catch (error) {
      const swapTime = Date.now() - startTime;
      this.updateAnalytics(swapTime, false);
      this.logError('TRANSACTION_SEND', error instanceof Error ? error.message : 'Unknown error');
      
      // Check for rent exemption error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('insufficient funds for rent') || 
          errorMessage.includes('Transaction results in an account') && errorMessage.includes('with insufficient funds for rent')) {
        throw new Error('INSUFFICIENT_RENT_EXEMPTION');
      }
      
      throw error;
    }
  }

  async confirmTransaction(signature: string, maxRetries: number = 5): Promise<boolean> {
    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const statuses = await this.connection.getSignatureStatuses([signature], {
            searchTransactionHistory: true
          });
          
          const status = statuses.value[0];
          
          if (!status) {
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              continue;
            }
            return false;
          }
          
          if (status.err) {
            console.error('Transaction failed:', status.err);
            return false;
          }
          
          if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            return true;
          }
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        } catch (error) {
          console.warn(`Error checking transaction status (attempt ${attempt}):`, error);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Transaction confirmation error:', error);
      return false;
    }
  }

  private async confirmAndLogTrade(
    isBuy: boolean,
    userPublicKey: string,
    coinAddress: string,
    solAmount: number,
    signature: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/trade/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletAddress: userPublicKey,
          coinAddress,
          solAmount,
          transactionSignature: signature,
          isBuy
        })
      });

      if (response.ok) {
        const result = await response.json();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Failed to confirm and log trade: ${response.status} ${response.statusText}`, errorData);
        return false;
      }
    } catch (error) {
      console.error('Error confirming and logging trade:', error);
      return false;
    }
  }

  // Complete swap flow
  async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippage: number = 50,
    fees: SwapFees,
    userPublicKey: string,
    signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>,
    isLaunchpadToken: boolean = false
  ): Promise<{ signature: string; success: boolean; tokenAmount?: string; tokenSymbol?: string; confirmationPromise?: Promise<boolean> }> {
    try {
      // Get quote (includes transaction from ultra API)
      const quote = await this.getQuote(inputMint, outputMint, amount, slippage, userPublicKey);
      
      // Ultra API already provides the transaction, so we can skip getSwapTransaction
      if (!quote.transaction) {
        throw new Error('No transaction found in quote response');
      }

      // Determine trade type and amount for platform fee calculation
      const isBuy = inputMint === "So11111111111111111111111111111111111111112"; // SOL mint
      const tradeAmount = isBuy ? parseFloat(amount) : parseFloat(quote.outAmount); // Already in lamports
      
      // Determine the token address being traded (not SOL)
      const tokenAddress = isBuy ? outputMint : inputMint; // For buy: outputMint is token, for sell: inputMint is token
      
      // Build and sign transaction
      const transaction = await this.buildAndSignTransaction(
        { swapTransaction: quote.transaction, lastValidBlockHeight: 0 }, 
        fees, 
        userPublicKey,
        isLaunchpadToken,
        tradeAmount // Already in lamports
      );
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const signature = await this.sendTransaction(signedTransaction);
      
      // Confirm and log trade in background
      this.confirmAndLogTrade(isBuy, userPublicKey, tokenAddress, tradeAmount, signature);
      
      // Clear quote cache to ensure fresh quotes for next trade
      this.clearQuoteCache();
      
      // Handle confirmation in background (for UI feedback only)
      const confirmationPromise = this.handleConfirmationInBackground(signature);
      
      // Return immediately with success and confirmation promise
      return { 
        signature, 
        success: true,
        tokenAmount: isBuy ? quote.outAmount : amount, // For sells, use the input amount (tokens being sold)
        tokenSymbol: isBuy ? 'tokens' : 'SOL', // This will be updated by the calling component
        confirmationPromise
      };
    } catch (error) {
      this.logError('SWAP_EXECUTION', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handleConfirmationInBackground(
    signature: string
  ): Promise<boolean> {
    try {
      const confirmationSuccess = await this.confirmTransaction(signature, 5);
      
      if (confirmationSuccess) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Background confirmation error:', error);
      return false;
    }
  }


}
