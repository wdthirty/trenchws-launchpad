import { getTopCoinsCache } from './top-coins-cache.service';

export class CacheWarmupService {
  private static instance: CacheWarmupService;
  private isWarmedUp = false;
  private warmupPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): CacheWarmupService {
    if (!CacheWarmupService.instance) {
      CacheWarmupService.instance = new CacheWarmupService();
    }
    return CacheWarmupService.instance;
  }

  /**
   * Warm up all caches on application startup
   */
  async warmupAllCaches(): Promise<void> {
    if (this.isWarmedUp) {
      console.log('✅ Caches already warmed up, skipping...');
      return;
    }

    if (this.warmupPromise) {
      console.log('🔄 Cache warmup already in progress, waiting...');
      return this.warmupPromise;
    }

    this.warmupPromise = this.performWarmup();
    return this.warmupPromise;
  }

  private async performWarmup(): Promise<void> {
    console.log('🔥 Starting cache warmup...');
    const startTime = Date.now();

    try {
      // Warm up top coins cache
      const topCoinsCache = getTopCoinsCache();
      await topCoinsCache.warmCache();

      this.isWarmedUp = true;
      const duration = Date.now() - startTime;
      console.log(`✅ Cache warmup completed in ${duration}ms`);

    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
      // Don't throw - warmup failures shouldn't break the app
    } finally {
      this.warmupPromise = null;
    }
  }

  /**
   * Check if caches are warmed up
   */
  isWarmedUpStatus(): boolean {
    return this.isWarmedUp;
  }

  /**
   * Reset warmup status (useful for testing)
   */
  resetWarmupStatus(): void {
    this.isWarmedUp = false;
    this.warmupPromise = null;
  }
}

// Export singleton instance
export const cacheWarmupService = CacheWarmupService.getInstance();
