import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenDescription } from '@/lib/database';
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
    const description = await getTokenDescription(pool, tokenId);
    
    if (description === null) {
      return res.status(404).json({ error: 'Token description not found' });
    }

    return res.status(200).json({ description });
  } catch (error) {
    console.error('❌ API: Error fetching token description:', error);
    return res.status(500).json({ error: 'Failed to fetch token description' });
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
