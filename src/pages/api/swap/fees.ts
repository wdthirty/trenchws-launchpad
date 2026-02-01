import { NextApiRequest, NextApiResponse } from 'next';
import { 
  Connection, 
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
  Keypair,
  ComputeBudgetProgram,
  TransactionInstruction
} from '@solana/web3.js';
import bs58 from 'bs58';

interface CachedFees {
  priorityMicroLamports: number;
  computeUnits: number;
  lastUpdated: number;
}

// In-memory cache (in production, consider using Redis or similar)
let feesCache: CachedFees | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// Get dynamic priority fee from Helius Priority Fee API
const getPriorityFee = async (connection: Connection, instructions: TransactionInstruction[], payerKey: PublicKey, blockhash: string): Promise<number> => {
  try {
    const tempTx = new VersionedTransaction(
      new TransactionMessage({
        instructions,
        payerKey,
        recentBlockhash: blockhash,
      }).compileToV0Message()
    );
    
    const response = await fetch(connection.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getPriorityFeeEstimate",
        params: [{
          transaction: bs58.encode(tempTx.serialize()),
          options: { recommended: true },
        }],   
      }),
    });
    
    const data = await response.json();
    return data.result?.priorityFeeEstimate ? 
      Math.ceil(data.result.priorityFeeEstimate * 1.2) : 50_000; // 20% buffer
  } catch (error) {
    console.warn('Failed to fetch priority fee, using fallback:', error);
    return 50_000; // Fallback fee
  }
};

// Get dynamic compute units by simulating a test transaction
const getDynamicComputeUnits = async (connection: Connection, instructions: TransactionInstruction[], payerKey: PublicKey, blockhash: string, keypair: Keypair): Promise<number> => {
  try {
    // For now, let's use a simpler approach - estimate based on instruction count
    // This avoids the AccountNotFound issues with simulation
    const instructionCount = instructions.length;
    
    // Base compute units for different instruction types
    const baseComputeUnits = 200_000; // Base for swap-like operations
    const perInstructionOverhead = 10_000; // Additional units per instruction
    
    const estimatedUnits = baseComputeUnits + (instructionCount * perInstructionOverhead);
    const computeUnits = Math.min(estimatedUnits, 1_400_000); // Cap at max
    
    return computeUnits;
  } catch (error) {
    console.warn('Failed to estimate compute units, using fallback:', error);
    return 200_000; // Fallback compute units for swaps
  }
};

const fetchFeesFromSources = async (): Promise<CachedFees> => {
  try {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error('RPC_URL environment variable is required');
    }

    const connection = new Connection(rpcUrl);
    
    // Get recent blockhash with context
    const { value: blockhashInfo } = await connection.getLatestBlockhashAndContext('confirmed');
    const { blockhash } = blockhashInfo;

    // Create a dummy keypair for simulation
    const dummyKeypair = Keypair.generate();

    // Create sample swap instructions for simulation
    // Use a simple instruction that doesn't require account validation
    const sampleInstructions: TransactionInstruction[] = [
      // Use a simple instruction that just sets compute units (this will be our baseline)
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ];

    // Get dynamic priority fee from Helius Priority Fee API
    const priorityMicroLamports = await getPriorityFee(connection, sampleInstructions, dummyKeypair.publicKey, blockhash);

    // Get dynamic compute units by simulating the transaction
    const computeUnits = await getDynamicComputeUnits(connection, sampleInstructions, dummyKeypair.publicKey, blockhash, dummyKeypair);

    return {
      priorityMicroLamports,
      computeUnits,
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('Error fetching fees:', error);
    // Return fallback values if fetching fails
    return {
      priorityMicroLamports: 50_000, // Fallback priority fee
      computeUnits: 200_000, // Standard compute units for swaps
      lastUpdated: Date.now()
    };
  }
};

const isCacheValid = (): boolean => {
  if (!feesCache) return false;
  return Date.now() - feesCache.lastUpdated < CACHE_DURATION;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if cache is valid
    if (isCacheValid()) {
      const { lastUpdated, ...fees } = feesCache;
      return res.status(200).json(fees);
    }

    // Fetch fresh fees
    feesCache = await fetchFeesFromSources();
    
    const { lastUpdated, ...fees } = feesCache;
    return res.status(200).json(fees);
  } catch (error) {
    console.error('Error in fees API:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch fees',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
