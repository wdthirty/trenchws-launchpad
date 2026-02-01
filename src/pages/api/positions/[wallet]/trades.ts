import { NextApiRequest, NextApiResponse } from 'next';
import { getUserTradeHistory } from '@/lib/database';
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
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Get user trade history
    const trades = await getUserTradeHistory(wallet, limit, offset, pool);

    res.status(200).json({
      trades,
      wallet,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching user trades:', error);
    res.status(500).json({ error: 'Failed to fetch user trades' });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
