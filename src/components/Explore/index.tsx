import { DataStreamProvider } from '@/contexts/DataStreamProvider';
import { ExploreMsgHandler } from './ExploreMsgHandler';
import { ExploreProvider } from '@/contexts/ExploreProvider';
import { PropsWithChildren, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TOPBAR_HEIGHT } from '@/components/ui/Page/Page';
import { useIsMobile } from '@/hooks/useIsMobile';

const ExploreGrid = dynamic(() => import('@/components/Explore/ExploreGrid'), { ssr: false });
const NewCoinsGrid = dynamic(() => import('@/components/Explore/NewCoinsGrid'), { ssr: false });

interface ExploreProps {
  selectedCoin?: string;
}

const Explore = ({ selectedCoin }: ExploreProps) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'top-performers' | 'new-coins'>('top-performers');

  // Initialize activeTab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem('Launchpadfun-active-tab');
    if (savedTab === 'top-performers' || savedTab === 'new-coins') {
      setActiveTab(savedTab);
    }
  }, []);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('Launchpadfun-active-tab', activeTab);
  }, [activeTab]);

  return (
    <ExploreContext>
      <div className="flex flex-col w-full overflow-hidden h-full">

        {/* Content */}
        <div className="flex flex-row w-full flex-1 overflow-hidden px-2">
          {isMobile ? (
            // Mobile: Show only active tab
            <>
              {activeTab === 'top-performers' && (
                <ExploreGrid 
                  selectedCoin={selectedCoin}
                  onSwitchToNewCoins={() => setActiveTab('new-coins')}
                />
              )}
              {activeTab === 'new-coins' && (
                <NewCoinsGrid 
                  selectedCoin={selectedCoin}
                  onSwitchToTopPerformers={() => setActiveTab('top-performers')}
                />
              )}
            </>
          ) : (
            // Desktop: Show both side by side
            <div className="flex gap-2 w-full">
              <ExploreGrid selectedCoin={selectedCoin}/>
              <NewCoinsGrid selectedCoin={selectedCoin}/>
            </div>
          )}
        </div>
      </div>
    </ExploreContext>
  );
};

interface ExploreContextProps extends PropsWithChildren {}

const ExploreContext = ({ children }: ExploreContextProps) => {
  return (
    <div className="flex flex-col h-full" style={{ height: `calc(100vh - ${TOPBAR_HEIGHT}px)` }}>
      <ExploreMsgHandler />
      <ExploreProvider>
        <DataStreamProvider>{children}</DataStreamProvider>
      </ExploreProvider>
    </div>
  );
};

export default Explore;
