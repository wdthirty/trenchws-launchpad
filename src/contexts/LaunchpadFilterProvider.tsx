import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type LaunchpadFilter = {
  id: string;
  name: string;
  enabled: boolean;
};

type LaunchpadFilterContextType = {
  launchpadFilters: LaunchpadFilter[];
  toggleLaunchpad: (launchpadId: string) => void;
  setLaunchpadEnabled: (launchpadId: string, enabled: boolean) => void;
  getEnabledLaunchpads: () => string[];
  resetToDefault: () => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const LaunchpadFilterContext = createContext<LaunchpadFilterContextType | null>(null);

// Default launchpads available for filtering
const DEFAULT_LAUNCHPADS: LaunchpadFilter[] = [
  { id: 'launchpad.fun', name: 'launchpad.fun', enabled: true },
  { id: 'pump.fun', name: 'pump.fun', enabled: false },
  { id: 'letsbonk.fun', name: 'letsbonk.fun', enabled: false },
  { id: 'Believe', name: 'Believe', enabled: false },
  { id: 'met-dbc', name: 'Met DBC', enabled: false },
  { id: 'daos.fun', name: 'DAOS.FUN', enabled: false },
  { id: 'heaven', name: 'Heaven', enabled: false },
  { id: 'jup-studio', name: 'Jupiter Studio', enabled: false },
  { id: 'bags.fun', name: 'BagsApp', enabled: false },
  { id: 'moonshot', name: 'Moonshot', enabled: false },
  { id: 'boop', name: 'boop.fun', enabled: false },
  { id: 'moonit', name: 'Moonit', enabled: false },
];

export const LaunchpadFilterProvider = ({ children }: { children: ReactNode }) => {
  // Load saved filters from localStorage on mount
  const [launchpadFilters, setLaunchpadFilters] = useState<LaunchpadFilter[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('launchpadFilters');
      const version = localStorage.getItem('launchpadFiltersVersion');
      const currentVersion = '4'; // Increment this when defaults change
      
      // Clear old cached data if version doesn't match
      if (version !== currentVersion) {
        localStorage.removeItem('launchpadFilters');
        localStorage.setItem('launchpadFiltersVersion', currentVersion);
        return DEFAULT_LAUNCHPADS;
      }
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure all launchpads are present
          const merged = DEFAULT_LAUNCHPADS.map(defaultFilter => {
            const savedFilter = parsed.find((f: LaunchpadFilter) => f.id === defaultFilter.id);
            return savedFilter || defaultFilter;
          });
          return merged;
        } catch (e) {
          console.warn('Failed to parse launchpad filters from localStorage:', e);
        }
      }
    }
    return DEFAULT_LAUNCHPADS;
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('launchpadFilters', JSON.stringify(launchpadFilters));
    }
  }, [launchpadFilters]);

          const toggleLaunchpad = useCallback((launchpadId: string) => {
          setLaunchpadFilters(prev => {
            const newFilters = prev.map(filter =>
              filter.id === launchpadId
                ? { ...filter, enabled: !filter.enabled }
                : filter
            );
            return newFilters;
          });
        }, []);

  const setLaunchpadEnabled = useCallback((launchpadId: string, enabled: boolean) => {
    setLaunchpadFilters(prev => 
      prev.map(filter => 
        filter.id === launchpadId 
          ? { ...filter, enabled }
          : filter
      )
    );
  }, []);

          const getEnabledLaunchpads = useCallback(() => {
          const enabled = launchpadFilters
            .filter(filter => filter.enabled)
            .map(filter => filter.id);
          return enabled;
        }, [launchpadFilters]);

  const resetToDefault = useCallback(() => {
    setLaunchpadFilters(prev => 
      prev.map(filter => ({
        ...filter,
        enabled: filter.id === 'launchpad.fun'
      }))
    );
  }, []);

  return (
    <LaunchpadFilterContext.Provider
      value={{
        launchpadFilters,
        toggleLaunchpad,
        setLaunchpadEnabled,
        getEnabledLaunchpads,
        resetToDefault,
        isModalOpen,
        openModal,
        closeModal,
      }}
    >
      {children}
    </LaunchpadFilterContext.Provider>
  );
};

export const useLaunchpadFilter = () => {
  const context = useContext(LaunchpadFilterContext);
  if (!context) {
    throw new Error('useLaunchpadFilter must be used within LaunchpadFilterProvider');
  }
  return context;
};
