import { 
  Connection, 
  VersionedTransaction, 
  TransactionConfirmationStrategy,
  Keypair
} from '@solana/web3.js';
import { PrivyClient } from '@privy-io/server-auth';

export interface TransactionStep {
  name: string;
  transaction: VersionedTransaction;
  signers?: Keypair[];
  requiresUserSignature?: boolean;
  retryable?: boolean;
  maxRetries?: number;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  stepName?: string;
}

export class TransactionManager {
  constructor(
    private connection: Connection,
    private privy: PrivyClient
  ) {}

  async executeTransactionStep(
    step: TransactionStep,
    walletId: string
  ): Promise<TransactionResult> {
    const maxRetries = step.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Executing ${step.name} (attempt ${attempt}/${maxRetries})`);

        // Sign with local signers first if any
        if (step.signers && step.signers.length > 0) {
          step.transaction.sign(step.signers);
          console.log(`🔑 Signed with ${step.signers.length} local signers`);
        }

        // Sign with Privy if user signature is required
        if (step.requiresUserSignature) {
          const { signedTransaction } = await this.privy.walletApi.solana.signTransaction({
            walletId,
            transaction: step.transaction,
          });
          step.transaction = signedTransaction as VersionedTransaction;
          console.log(`🔑 Signed with Privy for user`);
        }

        // Send and confirm transaction
        const signature = await this.connection.sendRawTransaction(
          step.transaction.serialize(), 
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          }
        );

        console.log(`📤 Transaction sent with signature: ${signature}`);

        const confirmation = await this.connection.confirmTransaction(
          { signature } as TransactionConfirmationStrategy, 
          'confirmed'
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log(`✅ ${step.name} completed successfully`);
        return {
          success: true,
          signature,
          stepName: step.name
        };

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${step.name} failed (attempt ${attempt}/${maxRetries}):`, error);

        // If this is the last attempt or the error is not retryable, throw
        if (attempt === maxRetries || !step.retryable) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      stepName: step.name
    };
  }

  async executeTransactionSequence(
    steps: TransactionStep[],
    walletId: string
  ): Promise<TransactionResult[]> {
    const results: TransactionResult[] = [];

    for (const step of steps) {
      const result = await this.executeTransactionStep(step, walletId);
      results.push(result);

      // If a step fails and it's not retryable, stop the sequence
      if (!result.success && !step.retryable) {
        console.error(`❌ Critical step ${step.name} failed, stopping sequence`);
        break;
      }
    }

    return results;
  }

  async executeParallelTransactions(
    steps: TransactionStep[],
    walletId: string
  ): Promise<TransactionResult[]> {
    console.log(`🚀 Executing ${steps.length} transactions in parallel`);
    
    const promises = steps.map(step => 
      this.executeTransactionStep(step, walletId)
    );

    return Promise.all(promises);
  }

  // Helper method to create a transaction step
  static createTransactionStep(
    name: string,
    transaction: VersionedTransaction,
    options: {
      signers?: Keypair[];
      requiresUserSignature?: boolean;
      retryable?: boolean;
      maxRetries?: number;
    } = {}
  ): TransactionStep {
    return {
      name,
      transaction,
      signers: options.signers,
      requiresUserSignature: options.requiresUserSignature ?? true,
      retryable: options.retryable ?? true,
      maxRetries: options.maxRetries ?? 3,
    };
  }
}
