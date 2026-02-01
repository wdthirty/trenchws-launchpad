import { NextApiRequest, NextApiResponse } from 'next';
import { getTotalClaimedFeesForUser } from '@/lib/database/claimedFees';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const totalClaimed = await getTotalClaimedFeesForUser(pool, wallet);
    res.status(200).json({ totalClaimed });
  } catch (error) {
    console.error('Error fetching total claimed fees:', error);
    res.status(500).json({ error: 'Failed to fetch total claimed fees' });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
