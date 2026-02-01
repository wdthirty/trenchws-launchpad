import { Redis } from '@upstash/redis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export class UpstashCacheService {
  private redis: Redis;

  constructor() {
    const KV_REST_API_URL = process.env.KV_REST_API_URL;
    const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      console.warn('❌ Upstash Redis environment variables not set. Caching will be disabled.');
      console.warn('Required: KV_REST_API_URL and KV_REST_API_TOKEN');
      // Fallback to a no-op cache
      this.redis = null as any; // Intentionally set to null to disable operations
    } else {
      console.log('✅ Upstash Redis configured successfully');
      this.redis = new Redis({
        url: KV_REST_API_URL,
        token: KV_REST_API_TOKEN,
      });
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    if (!this.redis) return;
    try {
      const ttl = options.ttl || 300; // Default 5 minutes
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Upstash Redis set error:', error);
      // Don't throw - caching failures shouldn't break the app
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      // Handle different data types from Upstash Redis
      if (typeof data === 'string') {
        return JSON.parse(data) as T;
      } else if (typeof data === 'object' && data !== null) {
        // Data is already an object, return as-is
        return data as T;
      } else {
        // Try to parse as string if it's not already an object
        return JSON.parse(String(data)) as T;
      }
    } catch (error) {
      console.error('Upstash Redis get error:', error);
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Upstash Redis has error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const deleted = await this.redis.del(key);
      return deleted > 0;
    } catch (error) {
      console.error('Upstash Redis delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.redis) return;
    try {
      // Get all keys with our prefix and delete them
      const keys = await this.redis.keys('Launchpadfun:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Upstash Redis clear error:', error);
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.redis) return keys.map((): null => null);
    try {
      const values = await this.redis.mget(...keys);
      
      return values.map((value): T | null => {
        if (!value) return null;
        try {
          // Handle different data types from Upstash Redis
          if (typeof value === 'string') {
            return JSON.parse(value) as T;
          } else if (typeof value === 'object' && value !== null) {
            // Data is already an object, return as-is
            return value as T;
          } else {
            // Try to parse as string if it's not already an object
            return JSON.parse(String(value)) as T;
          }
        } catch (parseError) {
          console.error('Upstash Redis mget parse error:', parseError);
          console.error('Value type:', typeof value);
          console.error('Value:', value);
          return null;
        }
      });
    } catch (error) {
      console.error('Upstash Redis mget error:', error);
      return keys.map((): null => null);
    }
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (!this.redis) return;
    try {
      // Upstash doesn't have native mset with TTL, so we'll use pipeline
      const pipeline = this.redis.pipeline();
      
      for (const { key, value, ttl = 300 } of keyValuePairs) {
        pipeline.setex(key, ttl, JSON.stringify(value));
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Upstash Redis mset error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<{ 
    size: number; 
    keys: string[];
    info: string;
  }> {
    if (!this.redis) return { size: 0, keys: [], info: 'Upstash Redis not initialized' };
    try {
      const keys = await this.redis.keys('Launchpadfun:*');
      
      return {
        size: keys.length,
        keys: keys.map(key => key.replace('Launchpadfun:', '')),
        info: 'Upstash Redis connected'
      };
    } catch (error) {
      console.error('Upstash Redis stats error:', error);
      return {
        size: 0,
        keys: [],
        info: 'Error getting stats'
      };
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Upstash Redis ping error:', error);
      return false;
    }
  }

  // Get Redis instance for advanced operations
  getRedis(): Redis | null {
    return this.redis;
  }
}

// Singleton instance
let upstashCacheInstance: UpstashCacheService | null = null;

export function getUpstashCache(): UpstashCacheService {
  if (!upstashCacheInstance) {
    upstashCacheInstance = new UpstashCacheService();
  }
  return upstashCacheInstance;
}
