import { getTopCoinsCache } from './top-coins-cache.service';

export class ScheduledCacheRefreshService {
  private static instance: ScheduledCacheRefreshService;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Refresh individual coin data every 2 minutes
  private readonly REFRESH_INTERVAL_MS = 2 * 60 * 1000;

  private constructor() {}

  static getInstance(): ScheduledCacheRefreshService {
    if (!ScheduledCacheRefreshService.instance) {
      ScheduledCacheRefreshService.instance = new ScheduledCacheRefreshService();
    }
    return ScheduledCacheRefreshService.instance;
  }

  /**
   * Start the scheduled refresh service
   */
  start(): void {
    if (this.isRunning) {
      console.log('🔄 Scheduled cache refresh already running');
      return;
    }

    console.log('🚀 Starting scheduled cache refresh service...');
    this.isRunning = true;

    // Start the refresh interval
    this.refreshInterval = setInterval(async () => {
      try {
        console.log('⏰ Scheduled refresh: updating individual coin data...');
        const topCoinsCache = getTopCoinsCache();
        await topCoinsCache.refreshIndividualCoinData();
        console.log('✅ Scheduled refresh completed successfully');
      } catch (error) {
        console.error('❌ Scheduled refresh failed:', error);
      }
    }, this.REFRESH_INTERVAL_MS);

    console.log(`✅ Scheduled cache refresh started (interval: ${this.REFRESH_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop the scheduled refresh service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('🔄 Scheduled cache refresh not running');
      return;
    }

    console.log('🛑 Stopping scheduled cache refresh service...');
    this.isRunning = false;

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    console.log('✅ Scheduled cache refresh stopped');
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the refresh interval in milliseconds
   */
  getRefreshInterval(): number {
    return this.REFRESH_INTERVAL_MS;
  }

  /**
   * Manually trigger a refresh
   */
  async triggerRefresh(): Promise<void> {
    console.log('🔄 Manual refresh triggered...');
    try {
      const topCoinsCache = getTopCoinsCache();
      await topCoinsCache.refreshIndividualCoinData();
      console.log('✅ Manual refresh completed successfully');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const scheduledCacheRefreshService = ScheduledCacheRefreshService.getInstance();
