import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenCategory } from '@/lib/database/coins';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId } = req.query;

  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'Invalid token ID' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const category = await getTokenCategory(pool, tokenId);
    
    res.status(200).json({
      category: category || null
    });
  } catch (error) {
    console.error('Error fetching token category:', error);
    res.status(500).json({
      error: 'Failed to fetch token category'
    });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
