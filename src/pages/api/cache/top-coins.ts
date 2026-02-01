import { NextApiRequest, NextApiResponse } from 'next';
import { getTopCoinsCache } from '@/lib/services/top-coins-cache.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET and POST methods
  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const topCoinsCache = getTopCoinsCache();

    if (req.method === 'GET') {
      // Get cache status and metadata
      const [stats, metadata] = await Promise.all([
        topCoinsCache.getCacheStats(),
        topCoinsCache.getCacheMetadata()
      ]);

      return res.status(200).json({
        success: true,
        data: {
          stats,
          metadata,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      switch (action) {
        case 'invalidate':
          await topCoinsCache.invalidateCache();
          return res.status(200).json({
            success: true,
            message: 'Top coins cache invalidated successfully',
            timestamp: new Date().toISOString()
          });

        case 'warm':
          await topCoinsCache.warmCache();
          return res.status(200).json({
            success: true,
            message: 'Top coins cache warmed up successfully',
            timestamp: new Date().toISOString()
          });

        case 'refresh':
          // Force refresh the cache
          await topCoinsCache.getTopCoins({ forceRefresh: true });
          return res.status(200).json({
            success: true,
            message: 'Top coins cache refreshed successfully',
            timestamp: new Date().toISOString()
          });

        case 'refresh-individual':
          // Refresh only individual coin data without changing list structure
          await topCoinsCache.refreshIndividualCoinData();
          return res.status(200).json({
            success: true,
            message: 'Individual coin data refreshed successfully',
            timestamp: new Date().toISOString()
          });

        case 'clear-all':
          // Clear all cache entries (including corrupted ones)
          await topCoinsCache.clearAllCache();
          return res.status(200).json({
            success: true,
            message: 'All cache entries cleared successfully',
            timestamp: new Date().toISOString()
          });

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: invalidate, warm, refresh, refresh-individual, clear-all'
          });
      }
    }
  } catch (error) {
    console.error('Cache management error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
