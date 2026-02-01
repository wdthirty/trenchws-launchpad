import { NextApiRequest, NextApiResponse } from 'next';
import { getUserTotalPnl, getUserTotalLaunchpadRewards } from '@/lib/database';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const { wallet } = req.query;
    
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Get total PnL
    const totalPnl = await getUserTotalPnl(wallet, pool);
    
    // Get total $Launchpad rewards
    const totalLaunchpadRewards = await getUserTotalLaunchpadRewards(wallet, pool);

    res.status(200).json({
      totalPnl,
      totalLaunchpadRewards,
      wallet
    });

  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
