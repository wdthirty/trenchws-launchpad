import { getUpstashCache } from './coin-creation/upstash-cache.service';
import { Pool } from '@/components/Explore/types';

interface TopCoinsCacheData {
  pools: Pool[];
  timestamp: number;
  version: string;
}

interface CoinListStructure {
  coinIds: string[];
  order: number[];
  timestamp: number;
  version: string;
}

interface IndividualCoinData {
  [coinId: string]: Pool;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  forceRefresh?: boolean; // Force refresh even if cache exists
}

export class TopCoinsCacheService {
  private cache = getUpstashCache();
  
  // Cache keys
  private readonly TOP_COINS_KEY = 'Launchpadfun:top-coins:24h';
  private readonly TOP_COINS_METADATA_KEY = 'Launchpadfun:top-coins:metadata';
  private readonly COIN_LIST_STRUCTURE_KEY = 'Launchpadfun:top-coins:structure';
  private readonly INDIVIDUAL_COINS_KEY = 'Launchpadfun:top-coins:individual';
  
  // TTL settings - Reduced for more frequent updates
  private readonly LIST_STRUCTURE_TTL = 300; // 5 minutes - list structure changes more frequently
  private readonly INDIVIDUAL_COIN_TTL = 30; // 30 seconds - individual coin data changes very frequently
  private readonly DEFAULT_TTL = 120; // 2 minutes - fallback TTL
  
  // Cache version for invalidation
  private readonly CACHE_VERSION = '2.0';

  /**
   * Get top coins using hybrid caching strategy
   */
  async getTopCoins(options: CacheOptions = {}): Promise<Pool[]> {
    const { forceRefresh = false } = options;
    
    try {
      // Try to get cached list structure first
      const listStructure = await this.getCachedListStructure();
      
      if (listStructure && !forceRefresh) {
        // Check if cache is too old and needs refresh
        const cacheAge = Date.now() - listStructure.timestamp;
        const maxCacheAge = this.LIST_STRUCTURE_TTL * 1000; // Convert to milliseconds
        
        if (cacheAge > maxCacheAge) {
          // Force refresh if cache is too old
          return await this.getTopCoins({ forceRefresh: true });
        }
        
        // Get individual coin data from cache
        const individualCoins = await this.getCachedIndividualCoins(listStructure.coinIds);
        
        // Merge structure with individual coin data
        const mergedPools = this.mergeListStructureWithCoinData(listStructure, individualCoins);
        
        if (mergedPools.length > 0) {
          // Always trigger background refresh to keep data fresh
          this.backgroundRefreshIndividualCoins(listStructure.coinIds).catch(error => {
            console.error('Background refresh failed:', error);
          });
          
          return mergedPools;
        }
      }

      // Fetch fresh data from Jupiter API
      const freshData = await this.fetchTopCoinsFromAPI();
      
      // Cache the data using hybrid strategy
      await this.cacheHybridData(freshData);
      
      return freshData;
      
    } catch (error) {
      console.error('❌ Failed to fetch top coins from API:', error);
      
      // Try to return stale cache data if available
      const staleData = await this.getStaleCacheData();
      if (staleData) {
        return staleData;
      }
      
      throw error;
    }
  }

  /**
   * Fetch top coins directly from Jupiter API
   */
  private async fetchTopCoinsFromAPI(): Promise<Pool[]> {
    const jupiterUrl = 'https://datapi.jup.ag/v1/pools/toptraded/24h?launchpads=launchpad.fun';
    
    const response = await fetch(jupiterUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'launchpad.fun/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.pools || !Array.isArray(data.pools)) {
      throw new Error('Invalid response format from Jupiter API');
    }

    // Sort by market cap (highest first)
    const sortedPools = data.pools.slice().sort((a: Pool, b: Pool) => {
      const aMcap = a?.baseAsset?.mcap ?? 0;
      const bMcap = b?.baseAsset?.mcap ?? 0;
      return bMcap - aMcap;
    });

    return sortedPools;
  }

  /**
   * Get cached list structure
   */
  private async getCachedListStructure(): Promise<CoinListStructure | null> {
    try {
      const structure = await this.cache.get<CoinListStructure>(this.COIN_LIST_STRUCTURE_KEY);
      
      if (!structure) {
        console.log('🔄 No cached list structure found');
        return null;
      }

      if (structure.version !== this.CACHE_VERSION) {
        console.log('🔄 List structure version mismatch, invalidating...');
        return null;
      }

      // Check if structure is too old
      const maxAge = this.LIST_STRUCTURE_TTL * 1000;
      const isTooOld = Date.now() - structure.timestamp > maxAge;
      
      if (isTooOld) {
        console.log('🔄 List structure too old, invalidating...');
        return null;
      }

      console.log(`✅ List structure cache hit (${structure.coinIds.length} coins)`);
      return structure;
    } catch (error) {
      console.error('❌ Error getting cached list structure:', error);
      return null;
    }
  }

  /**
   * Get cached individual coin data
   */
  private async getCachedIndividualCoins(coinIds: string[]): Promise<IndividualCoinData> {
    try {
      const keys = coinIds.map(id => `${this.INDIVIDUAL_COINS_KEY}:${id}`);
      const values = await this.cache.mget<Pool>(keys);
      
      const result: IndividualCoinData = {};
      let hitCount = 0;
      
      values.forEach((value, index) => {
        if (value) {
          result[coinIds[index]] = value;
          hitCount++;
        }
      });
      
      console.log(`✅ Individual coins cache: ${hitCount}/${coinIds.length} hits`);
      return result;
    } catch (error) {
      console.error('❌ Error getting cached individual coins:', error);
      return {};
    }
  }

  /**
   * Merge list structure with individual coin data
   */
  private mergeListStructureWithCoinData(
    structure: CoinListStructure, 
    individualCoins: IndividualCoinData
  ): Pool[] {
    const pools: Pool[] = [];
    
    structure.coinIds.forEach((coinId) => {
      const coinData = individualCoins[coinId];
      if (coinData) {
        pools.push(coinData);
      }
    });
    
    return pools;
  }

  /**
   * Cache data using hybrid strategy
   */
  private async cacheHybridData(pools: Pool[]): Promise<void> {
    // Extract list structure
    const coinIds = pools.map(pool => pool.baseAsset.id);
    const order = pools.map((_, index) => index);
    
    const listStructure: CoinListStructure = {
      coinIds,
      order,
      timestamp: Date.now(),
      version: this.CACHE_VERSION
    };
    
    // Cache list structure with longer TTL
    await this.cache.set(this.COIN_LIST_STRUCTURE_KEY, listStructure, { 
      ttl: this.LIST_STRUCTURE_TTL 
    });
    
    // Cache individual coin data with shorter TTL
    const individualCoinPairs = pools.map(pool => ({
      key: `${this.INDIVIDUAL_COINS_KEY}:${pool.baseAsset.id}`,
      value: pool,
      ttl: this.INDIVIDUAL_COIN_TTL
    }));
    
    await this.cache.mset(individualCoinPairs);
    
    // Also cache the full data for fallback
    const fullCacheData: TopCoinsCacheData = {
      pools,
      timestamp: Date.now(),
      version: this.CACHE_VERSION
    };
    
    await this.cache.set(this.TOP_COINS_KEY, fullCacheData, { 
      ttl: this.DEFAULT_TTL 
    });
    
    // Update metadata
    await this.updateCacheMetadata();
  }

  /**
   * Background refresh individual coin data
   */
  private async backgroundRefreshIndividualCoins(coinIds: string[]): Promise<void> {
    try {
      // Fetch fresh data for individual coins
      const freshData = await this.fetchTopCoinsFromAPI();
      const freshCoinsMap = new Map(freshData.map(pool => [pool.baseAsset.id, pool]));
      
      // Update only the individual coin cache entries
      const updatePromises = coinIds.map(async (coinId) => {
        const freshCoin = freshCoinsMap.get(coinId);
        if (freshCoin) {
          await this.cache.set(
            `${this.INDIVIDUAL_COINS_KEY}:${coinId}`, 
            freshCoin, 
            { ttl: this.INDIVIDUAL_COIN_TTL }
          );
        }
      });
      
      await Promise.all(updatePromises);
      console.log('🔄 Background refresh completed for individual coins');
      
    } catch (error) {
      console.error('Background refresh failed:', error);
    }
  }

  /**
   * Get stale cache data as fallback
   */
  private async getStaleCacheData(): Promise<Pool[]> {
    const staleData = await this.cache.get<TopCoinsCacheData>(this.TOP_COINS_KEY);
    return staleData?.pools || [];
  }


  /**
   * Update cache metadata for monitoring
   */
  private async updateCacheMetadata(): Promise<void> {
    const metadata = {
      lastUpdated: Date.now(),
      version: this.CACHE_VERSION,
      source: 'jupiter-api'
    };
    
    await this.cache.set(this.TOP_COINS_METADATA_KEY, metadata, { ttl: 3600 }); // 1 hour TTL
  }

  /**
   * Invalidate the top coins cache
   */
  async invalidateCache(): Promise<void> {
    console.log('🗑️ Invalidating top coins cache...');
    
    // Delete all cache keys
    await Promise.all([
      this.cache.delete(this.TOP_COINS_KEY),
      this.cache.delete(this.TOP_COINS_METADATA_KEY),
      this.cache.delete(this.COIN_LIST_STRUCTURE_KEY)
    ]);
    
    // Delete individual coin cache entries
    try {
      const structure = await this.cache.get<CoinListStructure>(this.COIN_LIST_STRUCTURE_KEY);
      if (structure) {
        const individualKeys = structure.coinIds.map(id => `${this.INDIVIDUAL_COINS_KEY}:${id}`);
        if (individualKeys.length > 0) {
          await Promise.all(individualKeys.map(key => this.cache.delete(key)));
        }
      }
    } catch (error) {
      console.error('Error deleting individual coin cache entries:', error);
    }
    
    console.log('✅ Top coins cache invalidated');
  }

  /**
   * Clear all top coins related cache entries (including corrupted ones)
   */
  async clearAllCache(): Promise<void> {
    console.log('🗑️ Clearing all top coins cache entries...');
    
    try {
      // Get all keys with our prefix and delete them
      const allKeys = await this.cache.getRedis()?.keys('Launchpadfun:top-coins:*');
      if (allKeys && allKeys.length > 0) {
        await this.cache.getRedis()?.del(...allKeys);
        console.log(`✅ Deleted ${allKeys.length} cache entries`);
      }
      
      // Also clear the main cache entries
      await Promise.all([
        this.cache.delete(this.TOP_COINS_KEY),
        this.cache.delete(this.TOP_COINS_METADATA_KEY),
        this.cache.delete(this.COIN_LIST_STRUCTURE_KEY)
      ]);
      
      console.log('✅ All top coins cache entries cleared');
    } catch (error) {
      console.error('Error clearing cache entries:', error);
    }
  }

  /**
   * Get cache metadata for monitoring
   */
  async getCacheMetadata(): Promise<{
    lastUpdated?: number;
    version?: string;
    source?: string;
    isHealthy: boolean;
  }> {
    const metadata = await this.cache.get<{
      lastUpdated: number;
      version: string;
      source: string;
    }>(this.TOP_COINS_METADATA_KEY);

    const isHealthy = await this.cache.ping();

    return {
      ...metadata,
      isHealthy
    };
  }

  /**
   * Warm up the cache by pre-fetching data
   */
  async warmCache(): Promise<void> {
    console.log('🔥 Warming up top coins cache...');
    try {
      await this.getTopCoins({ forceRefresh: true });
      console.log('✅ Top coins cache warmed up successfully');
    } catch (error) {
      console.error('❌ Failed to warm up top coins cache:', error);
    }
  }

  /**
   * Refresh individual coin data without changing list structure
   */
  async refreshIndividualCoinData(): Promise<void> {
    console.log('🔄 Refreshing individual coin data...');
    
    try {
      const structure = await this.getCachedListStructure();
      if (!structure) {
        console.log('No cached list structure found, performing full refresh');
        await this.getTopCoins({ forceRefresh: true });
        return;
      }
      
      // Fetch fresh data and update individual coin cache
      await this.backgroundRefreshIndividualCoins(structure.coinIds);
      
      // Update the full cache as well
      const freshData = await this.fetchTopCoinsFromAPI();
      const fullCacheData: TopCoinsCacheData = {
        pools: freshData,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      
      await this.cache.set(this.TOP_COINS_KEY, fullCacheData, { 
        ttl: this.DEFAULT_TTL 
      });
      
      console.log('✅ Individual coin data refreshed successfully');
      
    } catch (error) {
      console.error('❌ Failed to refresh individual coin data:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    hasData: boolean;
    dataAge?: number;
    version?: string;
    isHealthy: boolean;
    structureAge?: number;
    individualCoinsCount?: number;
  }> {
    const [cachedData, structure, isHealthy] = await Promise.all([
      this.cache.get<TopCoinsCacheData>(this.TOP_COINS_KEY),
      this.cache.get<CoinListStructure>(this.COIN_LIST_STRUCTURE_KEY),
      this.cache.ping()
    ]);

    return {
      hasData: !!cachedData,
      dataAge: cachedData ? Date.now() - cachedData.timestamp : undefined,
      version: cachedData?.version,
      isHealthy,
      structureAge: structure ? Date.now() - structure.timestamp : undefined,
      individualCoinsCount: structure?.coinIds.length
    };
  }
}

// Singleton instance
let topCoinsCacheInstance: TopCoinsCacheService | null = null;

export function getTopCoinsCache(): TopCoinsCacheService {
  if (!topCoinsCacheInstance) {
    topCoinsCacheInstance = new TopCoinsCacheService();
  }
  return topCoinsCacheInstance;
}
