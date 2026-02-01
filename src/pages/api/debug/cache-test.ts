import { NextApiRequest, NextApiResponse } from 'next';
import { getUpstashCache } from '@/lib/services/coin-creation/upstash-cache.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cache = getUpstashCache();
    
    // Test basic cache operations
    const testKey = 'Launchpadfun:test:debug';
    const testData = {
      message: 'Hello from cache',
      timestamp: Date.now(),
      version: '1.0'
    };

    // Test set operation
    await cache.set(testKey, testData, { ttl: 60 });
    console.log('✅ Test data set in cache');

    // Test get operation
    const retrievedData = await cache.get(testKey);
    console.log('✅ Test data retrieved from cache:', retrievedData);

    // Test cache health
    const isHealthy = await cache.ping();
    console.log('✅ Cache health check:', isHealthy);

    // Get cache stats
    const stats = await cache.getStats();
    console.log('✅ Cache stats:', stats);

    // Clean up test data
    await cache.delete(testKey);
    console.log('✅ Test data cleaned up');

    return res.status(200).json({
      success: true,
      message: 'Cache test completed successfully',
      results: {
        setOperation: 'success',
        getOperation: retrievedData ? 'success' : 'failed',
        retrievedData,
        healthCheck: isHealthy,
        stats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Cache test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
