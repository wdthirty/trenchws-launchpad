import { ExploreTab } from '@/components/Explore/types';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useLocalStorage } from 'react-use';

import { TokenListFilters } from '@/components/Explore/types';
import { TokenListTimeframe } from '@/components/Explore/types';
import { GemsTokenListQueryArgs } from '@/components/Explore/queries';
import { StorageKey } from '@/constants';
import { useLaunchpadFilter } from './LaunchpadFilterProvider';

export const EXPLORE_FIXED_TIMEFRAME: TokenListTimeframe = '24h';
const DEFAULT_TAB: ExploreTab = ExploreTab.NEW;

type FiltersConfig = {
  [tab in ExploreTab]?: TokenListFilters;
};

type ExploreContextType = {
  searchQuery: string;
  setSearchQuery: (poolId: string) => void;
  mobileTab: ExploreTab;
  setMobileTab: (tab: ExploreTab) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  filters?: FiltersConfig;
  setFilters: (tab: ExploreTab, filters: TokenListFilters) => void;
  request: Required<GemsTokenListQueryArgs>;
  pausedTabs: Record<ExploreTab, boolean>;
  setTabPaused: (tab: ExploreTab, isPaused: boolean) => void;
};

const ExploreContext = createContext<ExploreContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
  mobileTab: DEFAULT_TAB,
  setMobileTab: () => {},
  currentTab: "top",
  setCurrentTab: () => {},
  filters: undefined,
  setFilters: () => {},
  request: {
    recent: {
      timeframe: EXPLORE_FIXED_TIMEFRAME,
    },
    aboutToGraduate: {
      timeframe: EXPLORE_FIXED_TIMEFRAME,
    },
    graduated: {
      timeframe: EXPLORE_FIXED_TIMEFRAME,
    },
  },
  pausedTabs: {
    [ExploreTab.NEW]: false,
    [ExploreTab.GRADUATING]: false,
    [ExploreTab.GRADUATED]: false,
  },
  setTabPaused: () => {},
});

const ExploreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<ExploreTab>(DEFAULT_TAB);
  const [currentTab, setCurrentTab] = useState<string>("top");
  const [pausedTabs, setPausedTabs] = useState<Record<ExploreTab, boolean>>({
    [ExploreTab.NEW]: false,
    [ExploreTab.GRADUATING]: false,
    [ExploreTab.GRADUATED]: false,
  });
  const { getEnabledLaunchpads } = useLaunchpadFilter();

  // Store all filters in an object to avoid tab -> filter state sync issues
  const [filtersConfig, setFiltersConfig] = useLocalStorage<FiltersConfig>(
    StorageKey.INTEL_EXPLORER_FILTERS_CONFIG,
    {}
  );

  const setFilters = useCallback(
    (tab: ExploreTab, newFilters: TokenListFilters) => {
      setFiltersConfig({
        ...filtersConfig,
        [tab]: newFilters,
      });
    },
    [setFiltersConfig, filtersConfig]
  );

  const setTabPaused = useCallback((tab: ExploreTab, isPaused: boolean) => {
    setPausedTabs((prev) => ({
      ...prev,
      [tab]: isPaused,
    }));
  }, []);

  const request = useMemo(() => {
    const enabledLaunchpads = getEnabledLaunchpads();
    return {
      recent: {
        timeframe: "24h",
        filters: {
          launchpads: enabledLaunchpads,
        }
      },
      aboutToGraduate: {
        timeframe: "24h",
        filters: {
          launchpads: enabledLaunchpads,
          maxTokenAge: 60,
          maxTopHoldersPercentage: 40,
          minMcap: 10000,
        }
      },
      graduated: {
        timeframe: "24h",
        filters: {
          launchpads: enabledLaunchpads,
          minMcap: 25000
        }
      },
    } as Required<GemsTokenListQueryArgs>;
    // return Object.fromEntries(
    //   Object.values(ExploreTab).map((tab) => [
    //     tab,
    //     {
    //       timeframe: EXPLORE_FIXED_TIMEFRAME,
    //       filters: {
    //         ...filtersConfig?.[tab],
    //         partnerConfigs,
    //       },
    //     },
    //   ])
    // ) as Required<GemsTokenListQueryArgs>;
  }, [filtersConfig, getEnabledLaunchpads]);

  return (
    <ExploreContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        mobileTab,
        setMobileTab,
        currentTab,
        setCurrentTab,
        filters: filtersConfig,
        setFilters,
        request,
        pausedTabs,
        setTabPaused,
      }}
    >
      {children}
    </ExploreContext.Provider>
  );
};

const useExplore = () => {
  const ctx = useContext(ExploreContext);
  if (!ctx) {
    throw new Error('useExplore must be used within ExploreProvider');
  }
  return ctx;
};

export { ExploreProvider, useExplore };
