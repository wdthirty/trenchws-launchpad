'use client';

import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { categorySortBy, categorySortDir, createPoolSorter } from '@/components/Explore/pool-utils';
import { ApeQueries, GemsTokenListQueryArgs, QueryData } from '@/components/Explore/queries';
import { ExploreTab, normalizeSortByField } from '@/components/Explore/types';
import { TokenCardList } from '@/components/TokenCard/TokenCardList';
import { useExploreGemsTokenList } from '@/hooks/useExploreGemsTokenList';
import { EXPLORE_FIXED_TIMEFRAME, useExplore } from '@/contexts/ExploreProvider';
import { Pool } from '@/contexts/types';
import { isHoverableDevice } from '@/lib/device';
import { useIsMobile } from '@/hooks/useIsMobile';

type ExploreColumnProps = {
  tab: ExploreTab;
};

export const ExploreTabTitleMap: Record<ExploreTab, string> = {
  [ExploreTab.NEW]: `NEW COINS`,
  [ExploreTab.GRADUATING]: `GRADUATING`,
  [ExploreTab.GRADUATED]: `GRADUATED`,
};

export const ExploreColumn: React.FC<ExploreColumnProps> = ({ tab }) => {
  const { pausedTabs, setTabPaused, request } = useExplore();
  const isPaused = pausedTabs[tab];
  const setIsPaused = useCallback(
    (paused: boolean) => {
      setTabPaused(tab, paused);
    },
    [setTabPaused, tab]
  );

  return (
    <div className="flex flex-col bg-[#0B0F13] overflow-hidden h-full w-full">
      {/* List */}
      <div className="flex-1">
        <TokenCardListContainer
          tab={tab}
          request={request}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
        />
      </div>
    </div>
  );
};

type TokenCardListContainerProps = {
  tab: ExploreTab;
  request: Required<GemsTokenListQueryArgs>;
  isPaused: boolean;
  setIsPaused: (isPaused: boolean) => void;
};

const timeframe = EXPLORE_FIXED_TIMEFRAME;

const TokenCardListContainer: React.FC<TokenCardListContainerProps> = memo(
  ({ tab, request, isPaused, setIsPaused }) => {
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();

    const listRef = useRef<HTMLDivElement>(null);
    const { data: currentData, status } = useExploreGemsTokenList((data) => data[tab]);
    const [snapshotData, setSnapshotData] = useState<Pool[]>();

    const handleMouseEnter = useCallback(() => {
      if (!isHoverableDevice() || status !== 'success') {
        return;
      }
      if (!isPaused) {
        setSnapshotData(currentData?.pools || []);
      }
      setIsPaused(true);
    }, [currentData?.pools, isPaused, setIsPaused, status, tab]);

    const handleMouseLeave = useCallback(() => {
      if (!isHoverableDevice()) {
        return;
      }
      setIsPaused(false);
    }, [setIsPaused]);

    useEffect(() => {
      queryClient.setQueriesData(
        { type: 'active', queryKey: ApeQueries.gemsTokenList(request).queryKey },
        (prev?: QueryData<typeof ApeQueries.gemsTokenList>) => {
          const prevPools = prev?.[tab]?.pools;
          if (!prevPools) return prev;

          const pools = [...prevPools];
          const sortDir = categorySortDir(tab);
          const defaultSortBy = categorySortBy(tab, timeframe);
          const sortBy = defaultSortBy ? normalizeSortByField(defaultSortBy) : undefined;

          if (sortBy) {
            const sorter = createPoolSorter({ sortBy, sortDir }, timeframe);
            pools.sort(sorter);
          }

          return {
            ...prev,
            [tab]: { ...prev[tab], pools },
            args: { ...prev?.args, timeframe },
          };
        }
      );
    }, [queryClient, tab, request]);

    const handleScroll = useCallback((hasScrolled: boolean) => {
      if (!isMobile || !listRef.current) return;
      const top = listRef.current.getBoundingClientRect().top;
      
      // Only pause if user has actually scrolled and list is in view
      if (hasScrolled && top <= 0) {
        if (!isPaused) {
          setSnapshotData(currentData?.pools || []);
        }
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    }, [currentData?.pools, isPaused, setIsPaused, isMobile, tab]);

    useEffect(() => {
      if (!isMobile) return () => {};
      
      let hasScrolled = false; // Track if user has scrolled at least once
      
      const handleScrollStart = () => {
        hasScrolled = true;
        handleScroll(hasScrolled);
      };
      
      // Don't call handleScroll immediately - wait for user interaction
      window.addEventListener('scroll', handleScrollStart, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScrollStart);
        setIsPaused(false);
      };
    }, [isMobile, setIsPaused, handleScroll]);

    const displayData = isPaused && snapshotData
      ? (() => {
          const ids = new Set((currentData?.pools || []).map((p) => p.baseAsset.id));
          return snapshotData.filter((p) => ids.has(p.baseAsset.id));
        })()
      : currentData?.pools;

    return (
      <div 
        className="w-full h-full"
      >
        <TokenCardList
          ref={listRef}
          data={displayData}
          status={status}
          timeframe={timeframe}
          trackPools
          className="lg:h-0 lg:min-h-full"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    );
  }
);

TokenCardListContainer.displayName = 'TokenCardListContainer';
