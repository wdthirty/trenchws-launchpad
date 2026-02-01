import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { useDataStream } from '@/contexts/DataStreamProvider';
import UnifiedTokenList from '@/components/Explore/UnifiedTokenList';
import { useIsMobile } from '@/hooks/useIsMobile';
import ExchangeIcon from '@/icons/ExchangeIcon';

interface ExploreGridProps {
  selectedCoin?: string;
  onSwitchToNewCoins?: () => void;
}

const ExploreGrid = ({ selectedCoin, onSwitchToNewCoins }: ExploreGridProps) => {
  const { subscribeRecentTokenList, unsubscribeRecentTokenList } = useDataStream();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    subscribeRecentTokenList();
    // Trigger animation on every mount/reload
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => {
      unsubscribeRecentTokenList();
      clearTimeout(timer);
    };
  }, [subscribeRecentTokenList, unsubscribeRecentTokenList]);

  // Animation props - state-controlled for reload animations
  const animationProps = {
    initial: { opacity: 0, y: 20 },
    animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { 
      delay: 0.1,
      duration: 0.6,
      ease: "easeOut" as const
    }
  };


  return (
    <div className="flex flex-col w-full md:w-[350px] h-full min-h-0 overflow-hidden flex-shrink-0">
      <div className="flex flex-row bg-[#0B0F13] backdrop-blur-sm pt-2 pb-2 pl-2 justify-between items-center ">
        <motion.div
          {...animationProps}
          className="flex w-full gap-2 pr-2 items-end justify-between"
        >
          {isMobile && onSwitchToNewCoins ? (
            <button
              onClick={onSwitchToNewCoins}
              className="flex flex-col gap-1 text-left rounded-lg px-1 py-2 -m-2 transition-all duration-200 group"
              title="Switch to New Coins"
            >
              <div className="flex items-center gap-2">
                <div className="text-md font-semibold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500">
                  Top Launchpad Coins
                </div>
                <ExchangeIcon className="text-slate-400 text-sm group-hover:scale-110 transition-transform duration-200" width={14} height={14} />
              </div>
              <div className="text-slate-300 text-sm sm:text-xs">
                Discover our top performing coins
              </div>
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="text-md font-semibold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500">
                  Top Launchpad Coins
                </div>
              </div>
              <div className="text-slate-300 text-sm sm:text-xs">
                Discover our top performing coins
              </div>
            </div>
          )}

        </motion.div>
      </div>
      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="w-full flex-1 overflow-y-auto no-scrollbar min-h-0 rounded-lg">
        <UnifiedTokenList
          selectedCoin={selectedCoin}
          activeTab="top-performers"
        />
      </div>
      

    </div>
  )
};

export default ExploreGrid;
