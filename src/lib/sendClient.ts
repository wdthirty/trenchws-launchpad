import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, createTransferInstruction } from '@solana/spl-token';
import { toast } from 'sonner';

// Import the ApeClient to use the same SOL price API
import { ApeClient } from '@/components/Explore/client';

export interface SendTransactionResult {
  success: boolean;
  message: string;
  transactionId?: string;
  error?: string;
}

export class SendClient {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Validates a Solana address
   */
  static validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates SOL transfer and checks if user has sufficient SOL balance
   */
  async validateSOLTransaction(
    senderPublicKey: PublicKey,
    recipientAddress: string,
    amount: number
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Validate recipient address
      if (!SendClient.validateAddress(recipientAddress)) {
        return { isValid: false, error: 'Invalid recipient address' };
      }

      const recipientPublicKey = new PublicKey(recipientAddress);

      // Check if sender and recipient are the same
      if (senderPublicKey.equals(recipientPublicKey)) {
        return { isValid: false, error: 'Cannot send to yourself' };
      }

      // Validate amount
      if (amount <= 0) {
        return { isValid: false, error: 'Amount must be greater than 0' };
      }

      // Check sender balance
      const balance = await this.connection.getBalance(senderPublicKey);
      const amountInLamports = amount * LAMPORTS_PER_SOL;
      
      // Reserve some SOL for transaction fees (0.000005 SOL)
      const transactionFee = 0.000005 * LAMPORTS_PER_SOL;
      const totalRequired = amountInLamports + transactionFee;

      if (balance < totalRequired) {
        const shortfall = (totalRequired - balance) / LAMPORTS_PER_SOL;
        return { 
          isValid: false, 
          error: `Insufficient balance. Need ${shortfall.toFixed(6)} more SOL to cover transfer and fees.` 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  /**
   * Validates token transfer and checks if user has sufficient SOL for fees
   */
  async validateTokenTransaction(
    senderPublicKey: PublicKey,
    recipientAddress: string,
    tokenMint: string,
    amount: number
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Validate recipient address
      if (!SendClient.validateAddress(recipientAddress)) {
        return { isValid: false, error: 'Invalid recipient address' };
      }

      const recipientPublicKey = new PublicKey(recipientAddress);

      // Check if sender and recipient are the same
      if (senderPublicKey.equals(recipientPublicKey)) {
        return { isValid: false, error: 'Cannot send to yourself' };
      }

      // Validate amount
      if (amount <= 0) {
        return { isValid: false, error: 'Amount must be greater than 0' };
      }

      // For token transfers, we only need to check if user has enough SOL for transaction fees
      const balance = await this.connection.getBalance(senderPublicKey);
      
      // Reserve some SOL for transaction fees (0.000005 SOL) + potential ATA creation (0.00203928 SOL)
      const transactionFee = 0.000005 * LAMPORTS_PER_SOL;
      const ataCreationFee = 0.00203928 * LAMPORTS_PER_SOL; // In case recipient doesn't have ATA
      const totalRequired = transactionFee + ataCreationFee;

      if (balance < totalRequired) {
        const shortfall = (totalRequired - balance) / LAMPORTS_PER_SOL;
        return { 
          isValid: false, 
          error: `Insufficient SOL for fees. Need ${shortfall.toFixed(6)} more SOL to cover transaction fees.` 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  /**
   * Sends SOL to another wallet
   */
  async sendSOL(
    senderKeypair: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
    recipientAddress: string,
    amount: number
  ): Promise<SendTransactionResult> {
    try {
      // Validate the transaction first
      const validation = await this.validateSOLTransaction(
        senderKeypair.publicKey,
        recipientAddress,
        amount
      );

      if (!validation.isValid) {
        return {
          success: false,
          message: 'Transaction validation failed',
          error: validation.error
        };
      }

      const recipientPublicKey = new PublicKey(recipientAddress);
      const amountInLamports = amount * LAMPORTS_PER_SOL;

      // Create the transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: recipientPublicKey,
          lamports: amountInLamports,
        })
      );

      // Get the latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderKeypair.publicKey;

      // Sign the transaction
      const signedTransaction = await senderKeypair.signTransaction(transaction);
      
      // Send the transaction
      const transactionId = await this.connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature: transactionId,
        blockhash: blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash('confirmed')).lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return {
        success: true,
        message: 'Sent successfully',
        transactionId
      };
    } catch (error) {
      console.error('Send transaction error:', error);
      
      let errorMessage = 'Transaction failed. Please try again.';
      
      if (error instanceof Error) {
        // Handle specific Solana errors
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance to complete the transaction.';
        } else if (error.message.includes('blockhash')) {
          errorMessage = 'Transaction expired. Please try again.';
        } else if (error.message.includes('preflight')) {
          errorMessage = 'Transaction simulation failed. Please check your inputs.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        message: 'Transaction failed',
        error: errorMessage
      };
    }
  }

  /**
   * Gets the current SOL price for USD conversion
   */
  async getSOLPrice(): Promise<number> {
    try {
      // Use the same ApeClient method that SolPriceProvider uses
      return await ApeClient.getSolPrice();
    } catch (error) {
      console.warn('Failed to fetch SOL price, using fallback:', error);
      return 180; // Fallback price
    }
  }

  /**
   * Calculates USD value of SOL amount
   */
  async calculateUSDValue(solAmount: number): Promise<string> {
    try {
      const solPrice = await this.getSOLPrice();
      const usdValue = solAmount * solPrice;
      return `~$${usdValue.toFixed(2)}`;
    } catch (error) {
      return '~$0.00';
    }
  }

  /**
   * Sends SPL tokens to another wallet
   */
  async sendToken(
    senderKeypair: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
    recipientAddress: string,
    tokenMint: string,
    amount: number,
    decimals: number = 6
  ): Promise<SendTransactionResult> {
    try {
      // Validate recipient address
      if (!SendClient.validateAddress(recipientAddress)) {
        return {
          success: false,
          message: 'Transaction validation failed',
          error: 'Invalid recipient address'
        };
      }

      const recipientPublicKey = new PublicKey(recipientAddress);
      const tokenMintPublicKey = new PublicKey(tokenMint);

      // Get associated token addresses
      const senderATA = await getAssociatedTokenAddress(tokenMintPublicKey, senderKeypair.publicKey);
      const recipientATA = await getAssociatedTokenAddress(tokenMintPublicKey, recipientPublicKey);

      // Create the transaction
      const transaction = new Transaction();

      // Check if recipient has an associated token account
      try {
        await getAccount(this.connection, recipientATA);
      } catch {
        // Recipient doesn't have an ATA, create one
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderKeypair.publicKey,
            recipientATA,
            recipientPublicKey,
            tokenMintPublicKey
          )
        );
      }

      // Convert amount to integer (smallest unit of the token)
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));
      
      // Add the transfer instruction
      transaction.add(
        createTransferInstruction(
          senderATA,
          recipientATA,
          senderKeypair.publicKey,
          amountInSmallestUnit
        )
      );

      // Get the latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderKeypair.publicKey;

      // Sign the transaction
      const signedTransaction = await senderKeypair.signTransaction(transaction);
      
      // Send the transaction
      const transactionId = await this.connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature: transactionId,
        blockhash: blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash('confirmed')).lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return {
        success: true,
        message: 'Token sent successfully',
        transactionId
      };
    } catch (error) {
      console.error('Send token transaction error:', error);
      
      let errorMessage = 'Token transfer failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance to complete the transaction.';
        } else if (error.message.includes('blockhash')) {
          errorMessage = 'Transaction expired. Please try again.';
        } else if (error.message.includes('preflight')) {
          errorMessage = 'Transaction simulation failed. Please check your inputs.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        message: 'Token transfer failed',
        error: errorMessage
      };
    }
  }
}
