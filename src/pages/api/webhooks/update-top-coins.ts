import { NextApiRequest, NextApiResponse } from 'next';
import { getTopCoinsCache } from '@/lib/services/top-coins-cache.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook secret for security (optional but recommended)
    const webhookSecret = process.env.TOP_COINS_WEBHOOK_SECRET;
    const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action = 'invalidate' } = req.body;
    const topCoinsCache = getTopCoinsCache();

    switch (action) {
      case 'invalidate':
        await topCoinsCache.invalidateCache();
        console.log('🔄 Top coins cache invalidated via webhook');
        break;

      case 'refresh':
        await topCoinsCache.getTopCoins({ forceRefresh: true });
        console.log('🔄 Top coins cache refreshed via webhook');
        break;

      case 'warm':
        await topCoinsCache.warmCache();
        console.log('🔥 Top coins cache warmed via webhook');
        break;

      default:
        return res.status(400).json({ 
          error: 'Invalid action. Supported actions: invalidate, refresh, warm' 
        });
    }

    return res.status(200).json({
      success: true,
      message: `Top coins cache ${action} completed successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
