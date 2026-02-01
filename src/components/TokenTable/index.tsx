import { useInfiniteQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { memo, useState } from 'react';
import { motion } from 'framer-motion';

import { BottomPanelTab, bottomPanelTabAtom } from './config';
import { cn } from '@/lib/utils';
import { TxnsTab } from './TxnsTab';
import { HoldersTab } from './HoldersTab';
import PillButton from '../ui/PillButton';
import { appThemes } from '../TokenHeader/themes';

type TokenBottomPanelProps = {
  className?: string;
};

// Custom TabToggle component matching SidebarTabToggle style
export const TabToggle = ({ activeTab, onTabChange, paused, onPauseToggle }: { 
  activeTab: BottomPanelTab; 
  onTabChange: (tab: BottomPanelTab) => void; 
  paused: boolean;
  onPauseToggle: () => void;
}) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex bg-[#161B22]/30 rounded-full p-0.5 w-fit border border-slate-600/30">
        <button
          onClick={() => onTabChange(BottomPanelTab.TXNS)}
          className={`flex-1 py-1 px-3 text-xs font-medium rounded-full transition-all duration-200 ${
            activeTab === BottomPanelTab.TXNS
              ? 'bg-emerald-500 text-black shadow-sm font-semibold'
              : 'bg-transparent text-slate-300 hover:text-white hover:bg-[#21262D]/20'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => onTabChange(BottomPanelTab.HOLDERS)}
          className={`flex-1 py-1 px-3 text-xs font-medium rounded-full transition-all duration-200 ${
            activeTab === BottomPanelTab.HOLDERS
              ? 'bg-emerald-500 text-black shadow-sm font-semibold'
              : 'bg-transparent text-slate-300 hover:text-white hover:bg-[#21262D]/20'
          }`}
        >
          Holders
        </button>
      </div>
      
      {/* {activeTab === BottomPanelTab.TXNS && (
        <PillButton
          theme={paused ? 'green' : 'ghost'}
          icon={paused ? 'ph--play-bold' : 'ph--pause-bold'}
          onClick={onPauseToggle}
          size="sm"
          className="bg-[#0B0F13]/50"
        >
          {paused ? 'Resume' : 'Pause'}
        </PillButton>
      )} */}
    </div>
);

export const TokenBottomPanel: React.FC<TokenBottomPanelProps> = memo(({ className }) => {
  const [tab, setTab] = useAtom(bottomPanelTabAtom);
  const [paused, setPaused] = useState(false);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="pb-2 flex-shrink-0">
        <TabToggle activeTab={tab} onTabChange={setTab} paused={paused} onPauseToggle={() => setPaused(!paused)} />
      </div>

      <div className="flex-1 min-h-0">
        {tab === BottomPanelTab.TXNS && (
          <TxnsTab paused={paused} setPaused={setPaused} />
        )}
        
        {tab === BottomPanelTab.HOLDERS && (
          <HoldersTab />
        )}
      </div>
    </div>
  );
});

TokenBottomPanel.displayName = 'TokenBottomPanel';
