import { NextApiRequest, NextApiResponse } from 'next';
import { PrivyClient } from '@privy-io/server-auth';
import {
  findUserByPrivyUserId,
  findUserByTwitterId,
  createUser,
  updateUserTwitterInfo,
} from '@/lib/database';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const { privyUserId } = req.body;

    if (!privyUserId) {
      return res.status(400).json({ error: 'privyUserId is required' });
    }

    // Initialize Privy client
    const privyClient = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );

    // Fetch user data from Privy using the user ID
    const privyUser = await privyClient.getUserById(privyUserId);

    if (!privyUser) {
      return res.status(401).json({ error: 'User not found in Privy' });
    }

    // Extract user data from Privy user object
    const privyWalletId = privyUser.wallet?.id;
    const privyWalletAddress = privyUser.wallet?.address;
    const twitterId = privyUser.twitter?.subject;
    const twitterUsername = privyUser.twitter?.username;
    const twitterDisplayName = privyUser.twitter?.name;
    const twitterImageUrl = privyUser.twitter?.profilePictureUrl;

    if (!privyWalletAddress) {
      return res.status(400).json({ error: 'No wallet address found for user' });
    }

    // Generate wallet display name and determine if user is wallet-only
    const walletDisplayName = privyWalletAddress.slice(0, 6);
    const isWalletOnly = !twitterId && !twitterUsername;

    // Debug logging
    console.log('🔍 Login API received from Privy:', {
      privyUserId,
      privyWalletAddress,
      isWalletOnly,
      walletType: privyUser.wallet?.walletClientType === 'privy' ? 'embedded' : 'external'
    });

    // Check if user exists
    const existingUser = await findUserByPrivyUserId(pool, privyUserId);
    
    if (!existingUser) {
      // Check if this is a Twitter user trying to login
      if (!isWalletOnly && (twitterId || twitterUsername)) {
        // Check if this Twitter user exists in our database
        let twitterUserExists = false;
        
        if (twitterId) {
          const existingTwitterUser = await findUserByTwitterId(pool, twitterId);
          twitterUserExists = !!existingTwitterUser;
        }
        
        if (!twitterUserExists && twitterUsername) {
          // Also check by username as fallback
          const { findUserByTwitterUsername } = await import('@/lib/database');
          const existingTwitterUserByUsername = await findUserByTwitterUsername(pool, twitterUsername);
          twitterUserExists = !!existingTwitterUserByUsername;
        }
        
        if (!twitterUserExists) {
          console.log('🚫 Blocking new Twitter user registration for privyUserId:', privyUserId, 'Twitter ID:', twitterId, 'Username:', twitterUsername);
          return res.status(403).json({
            error: 'Early Access Ended',
            message: 'Early Access Ended, Please wait for v2'
          });
        } else {
          console.log('✅ Existing Twitter user found, allowing login for privyUserId:', privyUserId, 'Twitter ID:', twitterId, 'Username:', twitterUsername);
        }
      }

      console.log('🆕 Creating new user for privyUserId:', privyUserId);
      // Create new user (wallet-only users or existing Twitter users)
      const createUserData = {
        privyUserId,
        privyWalletId: privyWalletId || privyWalletAddress, // Use wallet address as ID for external wallets
        privyWalletAddress,
        walletDisplayName,
        isWalletOnly,
        coinsCreated: 0,
        coinsGraduated: 0,
        // Include Twitter fields if they exist
        twitterId,
        twitterUsername,
        twitterDisplayName,
        twitterImageUrl,
      };

      try {
        await createUser(pool, createUserData);
        return res.status(200).json({ success: true });
      } catch (error: any) {
        if (error.code === '23505' && error.constraint) {
          return res.status(409).json({
            error: 'Account already linked',
            message: 'This account is already associated with another user'
          });
        }
        throw error; // Re-throw other errors
      }
    } else {
      console.log('✅ Existing user found for privyUserId:', privyUserId);
      // Existing user - check for Twitter info changes

      // Check if Twitter info has changed
      const twitterInfoChanged = 
        existingUser.twitterUsername !== twitterUsername ||
        existingUser.twitterDisplayName !== twitterDisplayName ||
        existingUser.twitterImageUrl !== twitterImageUrl;

      if (twitterInfoChanged) {
        const updateData: any = {};
        
        if (twitterUsername !== undefined) updateData.twitterUsername = twitterUsername;
        if (twitterDisplayName !== undefined) updateData.twitterDisplayName = twitterDisplayName;
        if (twitterImageUrl !== undefined) updateData.twitterImageUrl = twitterImageUrl;

        await updateUserTwitterInfo(pool, privyUserId, updateData);
      }
      
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
