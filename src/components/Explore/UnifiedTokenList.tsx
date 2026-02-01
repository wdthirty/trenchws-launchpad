import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';
import { useExploreGemsTokenList } from '@/hooks/useExploreGemsTokenList';
import { ExploreTab, Pool } from './types';
import { TokenCardList } from '@/components/TokenCard/TokenCardList';

import { useExplore } from '@/contexts/ExploreProvider';

type TabType = 'top-performers' | 'new-coins';

interface UnifiedTokenListProps {
  selectedCoin?: string;
  activeTab: TabType;
  onQuickBuy?: (pool: Pool) => void;
  onPauseStateChange?: (isPaused: boolean) => void;
}

const UnifiedTokenList = ({ activeTab, onQuickBuy, onPauseStateChange }: UnifiedTokenListProps) => {
  const [pools, setPools] = useState<Pool[]>([]);
  
  const isMobile = useIsMobile();
  
  // Use Explore context for pause management (like Meteora implementation)
  const { pausedTabs, setTabPaused } = useExplore();
  const isPaused = pausedTabs[ExploreTab.NEW];
  const setIsPaused = useCallback(
    (paused: boolean) => {
      setTabPaused(ExploreTab.NEW, paused);
      onPauseStateChange?.(paused);
    },
    [setTabPaused, onPauseStateChange]
  );

  const listRef = useRef<HTMLDivElement>(null);
  const [snapshotData, setSnapshotData] = useState<Pool[]>();

  // Fetch top performers data
  useEffect(() => {
    const fetchTopPerformers = () => {
      fetch("/api/jupiter-pools?endpoint=pools/toptraded/24h?launchpads=launchpad.fun")
        .then((res) => res.json())
        .then((data) => {
          // Sort by market cap (highest first) as soon as we receive the API result
          const sortedByMcap = ((data.pools || []) as Pool[]).slice().sort((a, b) => {
            const aMcap = a?.baseAsset?.mcap ?? 0;
            const bMcap = b?.baseAsset?.mcap ?? 0;
            return bMcap - aMcap;
          });
          
          setPools(sortedByMcap);
        })
        .catch(() => {});
    };

    // Initial fetch
    fetchTopPerformers();

    // Set up interval to refresh every 10 seconds
    const interval = setInterval(fetchTopPerformers, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Get new coins data
  const { data: newCoinsData } = useExploreGemsTokenList((data) => data[ExploreTab.NEW]);




  const currentTabData = useMemo(() => {
    if (activeTab === 'top-performers') {
      return pools;
    }
    // Apply filtering to new coins data
    const newCoinsPools = newCoinsData?.pools || [];
    return (newCoinsPools);
  }, [activeTab, pools, newCoinsData?.pools]);

  const displayData = useMemo(() => {
    if (isPaused && snapshotData) {
      if (activeTab === 'top-performers') {
        const ids = new Set(pools.map((p) => p.baseAsset.id));
        return snapshotData.filter((p: Pool) => ids.has(p.baseAsset.id));
      }
      const tabPools = (newCoinsData?.pools || []);
      const ids = new Set(tabPools.map((p) => p.baseAsset.id));
      return snapshotData.filter((p: Pool) => ids.has(p.baseAsset.id));
    }
    
    return currentTabData;
  }, [isPaused, snapshotData, pools, newCoinsData?.pools, activeTab, currentTabData]);

  const handlePause = useCallback(() => {
    if (!isPaused) {
      // Only snapshot data from the current active tab's data source
      if (activeTab === 'top-performers') {
        setSnapshotData(pools);
      } else {
        // Create snapshot for new coins with filtering
        setSnapshotData((newCoinsData?.pools || []));
      }
      setIsPaused(true);
    }
  }, [isPaused, pools, newCoinsData?.pools, setIsPaused, activeTab]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, [setIsPaused]);

  // Mobile scroll handling with battery optimization
  useEffect(() => {
    if (!isMobile) return () => {};
    
    let scrollTimeout: NodeJS.Timeout;
    let hasScrolled = false; // Track if user has scrolled at least once
    
    const handleScroll = () => {
      // Debounce scroll events to reduce battery drain
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!listRef.current) return;
        const top = listRef.current.getBoundingClientRect().top;
        
        // Only pause if user has actually scrolled and list is in view
        if (hasScrolled && top <= 0) {
          if (!isPaused) {
            // Only snapshot data from the current active tab's data source
            if (activeTab === 'top-performers') {
              setSnapshotData(pools);
            } else {
              // Create snapshot for new coins with filtering
              setSnapshotData((newCoinsData?.pools || []));
            }
          }
          setIsPaused(true);
        } else {
          setIsPaused(false);
        }
      }, 100); // 100ms debounce
    };
    
    const handleScrollStart = () => {
      hasScrolled = true;
      handleScroll();
    };
    
    // Don't call handleScroll immediately - wait for user interaction
    window.addEventListener('scroll', handleScrollStart, { passive: true });
    
    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScrollStart);
      setIsPaused(false);
    };
  }, [isMobile, isPaused, setIsPaused, pools, newCoinsData?.pools, activeTab]);

  return (
    <div className="flex flex-col mx-auto">
      {displayData && displayData.length > 0 ? (
        <TokenCardList
          ref={listRef}
          data={displayData}
          status="success"
          timeframe="24h"
          trackPools
          showMiniChart={activeTab === 'top-performers'}
          onMouseEnter={handlePause}
          onMouseLeave={handleResume}
          onQuickBuy={activeTab === 'new-coins' ? onQuickBuy : undefined}
        />
      ): null}

    </div>
  );
};

export default UnifiedTokenList;


