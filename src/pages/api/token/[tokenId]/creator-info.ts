import { NextApiRequest, NextApiResponse } from 'next';
import { findCoinByAddress, findUserByPrivyUserId, findUserByTwitterUsername, findTaggedWalletByTwitterUsername, findCoinTransferStatusByAddress } from '@/lib/database';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId } = req.query;

  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'Token ID is required' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get coin information
    const coin = await findCoinByAddress(pool, tokenId);
    
    if (!coin) {      
      // For external coins, return a minimal response without DEX paid status
      const externalResponse: {
        creator: null;
        taggedUser: null;
        totalRaised: string;
        isDexPaid: boolean;
        transferStatus: null;
      } = {
        creator: null,
        taggedUser: null,
        totalRaised: "$0.00",
        isDexPaid: false, // Client will check this separately
        transferStatus: null
      };
      
      return res.status(200).json(externalResponse);
    }

    // Get creator information
    const creator = await findUserByPrivyUserId(pool, coin.creatorPrivyUserId);
    
    // Get tagged user information if available
    let taggedUser = null;
    if (coin.taggedWalletTwitterUsername) {      
      // Find the tagged wallet
      const taggedWallet = await findTaggedWalletByTwitterUsername(pool, coin.taggedWalletTwitterUsername);
      
      if (taggedWallet) {
        // Try to find in users table (if they have a full profile)
        taggedUser = await findUserByTwitterUsername(pool, taggedWallet.twitterUsername);
        
        // If not found in users table, create a minimal user object from tagged wallet info
        if (!taggedUser) {
          taggedUser = {
            twitterUsername: taggedWallet.twitterUsername,
            twitterImageUrl: undefined,
            twitterDisplayName: taggedWallet.twitterUsername
          };
        }
      }
    } else {
      console.log(`ℹ️ No tagged wallet for this coin`);
    }

    // Calculate total raised from fees (in SOL)
    let totalRaised = "0.00";
    try {
      const { calculateTotalFeesRaised } = await import('@/lib/feeCalculator');
      const totalFees = await calculateTotalFeesRaised(coin.coinAddress, undefined);
      totalRaised = totalFees.totalFeesRaised.toFixed(4); // 4 decimal places for SOL
    } catch (error) {
      console.warn(`Failed to calculate total fees raised for ${coin.coinAddress}:`, error);
      totalRaised = "0.00";
    }

    // Get coin transfer status if available
    const transferStatus = await findCoinTransferStatusByAddress(pool, tokenId);
    
    // Get user information for transfer status if available
    let transferStatusWithUsers = null;
    if (transferStatus) {
      const currentOwnerUser = await findUserByPrivyUserId(pool, transferStatus.currentOwner);
      const previousOwnerUser = await findUserByPrivyUserId(pool, transferStatus.previousOwner);
      
      transferStatusWithUsers = {
        currentOwner: currentOwnerUser ? {
          username: currentOwnerUser.twitterUsername || currentOwnerUser.privyWalletAddress,
          profileImageUrl: currentOwnerUser.twitterImageUrl,
          twitterUrl: currentOwnerUser.twitterUsername ? `https://x.com/${currentOwnerUser.twitterUsername}` : undefined,
          twitterDisplayName: currentOwnerUser.twitterDisplayName,
          walletDisplayName: currentOwnerUser.walletDisplayName,
          isWalletOnly: currentOwnerUser.isWalletOnly,
          twitterUsername: currentOwnerUser.twitterUsername,
          privyWalletAddress: currentOwnerUser.privyWalletAddress,
          twitterImageUrl: currentOwnerUser.twitterImageUrl
        } : null,
        previousOwner: previousOwnerUser ? {
          username: previousOwnerUser.twitterUsername || previousOwnerUser.privyWalletAddress,
          profileImageUrl: previousOwnerUser.twitterImageUrl,
          twitterUrl: previousOwnerUser.twitterUsername ? `https://x.com/${previousOwnerUser.twitterUsername}` : undefined,
          twitterDisplayName: previousOwnerUser.twitterDisplayName,
          walletDisplayName: previousOwnerUser.walletDisplayName,
          isWalletOnly: previousOwnerUser.isWalletOnly,
          twitterUsername: previousOwnerUser.twitterUsername,
          privyWalletAddress: previousOwnerUser.privyWalletAddress,
          twitterImageUrl: previousOwnerUser.twitterImageUrl
        } : null,
        status: transferStatus.status,
        transferredAt: transferStatus.createdAt
      };
    }

    // Note: DEX paid status is now handled client-side to avoid rate limits
    const isDexPaid = false; // Client will check this separately

    const response = {
      creator: creator ? {
        username: creator.twitterUsername || creator.privyWalletAddress,
        profileImageUrl: creator.twitterImageUrl,
        twitterUrl: creator.twitterUsername ? `https://x.com/${creator.twitterUsername}` : undefined,
        twitterDisplayName: creator.twitterDisplayName,
        walletDisplayName: creator.walletDisplayName,
        isWalletOnly: creator.isWalletOnly,
        twitterUsername: creator.twitterUsername,
        privyWalletAddress: creator.privyWalletAddress,
        twitterImageUrl: creator.twitterImageUrl
      } : null,
      taggedUser: taggedUser ? {
        username: taggedUser.twitterUsername || taggedUser.privyWalletAddress,
        profileImageUrl: taggedUser.twitterImageUrl,
        twitterUrl: taggedUser.twitterUsername ? `https://x.com/${taggedUser.twitterUsername}` : undefined,
        twitterDisplayName: taggedUser.twitterDisplayName,
        walletDisplayName: taggedUser.walletDisplayName,
        isWalletOnly: taggedUser.isWalletOnly,
        twitterUsername: taggedUser.twitterUsername,
        privyWalletAddress: taggedUser.privyWalletAddress,
        twitterImageUrl: taggedUser.twitterImageUrl
      } : null,
      totalRaised,
      isDexPaid,
      transferStatus: transferStatusWithUsers
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error in creator info API:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
