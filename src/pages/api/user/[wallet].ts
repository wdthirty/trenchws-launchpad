import type { NextApiRequest, NextApiResponse } from 'next';
import { findUserByWalletAddress } from '@/lib/database';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { wallet } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const user = await findUserByWalletAddress(pool, wallet);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      twitterUsername: user.twitterUsername,
      twitterDisplayName: user.twitterDisplayName,
      twitterImageUrl: user.twitterImageUrl,
      coinsCreated: user.coinsCreated,
      coinsGraduated: user.coinsGraduated,
    });
  } catch (error) {
    console.error('User API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
