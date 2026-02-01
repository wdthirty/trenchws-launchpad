import { NextApiRequest, NextApiResponse } from 'next';
import { getTopCoinsCache } from '@/lib/services/top-coins-cache.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, forceRefresh } = req.query;
    
    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'Endpoint parameter is required' });
    }

    // Check if this is a top performers request that should use caching
    const isTopPerformersRequest = endpoint.includes('pools/toptraded/24h') && endpoint.includes('launchpads=launchpad.fun');
    
    if (isTopPerformersRequest) {
      // Use cached top coins service
      const topCoinsCache = getTopCoinsCache();
      
      try {
        const pools = await topCoinsCache.getTopCoins({
          forceRefresh: forceRefresh === 'true'
        });
        
        const data = { pools };
        
        // Set cache headers for client-side caching
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.setHeader('X-Cache-Status', 'HIT');
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        return res.status(200).json(data);
        
      } catch (cacheError) {
        console.error('❌ Top coins cache error:', cacheError);
        // Fall through to direct API call
      }
    }

    // Fallback to direct Jupiter API call for non-cached endpoints or cache failures
    const jupiterUrl = `https://datapi.jup.ag/v1/${endpoint}`;
    
    // Make the request to Jupiter API
    const response = await fetch(jupiterUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'launchpad.fun/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Jupiter API error: ${response.statusText}` 
      });
    }

    const data = await response.json();
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    res.setHeader('X-Cache-Status', 'MISS');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Jupiter API proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
