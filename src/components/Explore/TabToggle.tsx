import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type TabType = 'top-performers' | 'new-coins';

interface TabToggleProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  quickBuyAmount?: string;
  onQuickBuyAmountChange?: (amount: string) => void;
}

const TabToggle = ({ activeTab, onTabChange, quickBuyAmount, onQuickBuyAmountChange }: TabToggleProps) => {
  // Get the opposite tab to show what will happen when clicked
  const getOppositeTab = () => {
    return activeTab === 'top-performers' ? 'new-coins' : 'top-performers';
  };

  const oppositeTab = getOppositeTab();
  
  // Get the display text and icon for the opposite tab
  const getToggleInfo = () => {
    if (activeTab === 'top-performers') {
      return {
        text: 'New',
        icon: <span className="iconify ph--sparkle-bold" />
      };
    } else {
      return {
        text: 'Top Performers',
        icon: <span className="iconify ph--trend-up-bold" />
      };
    }
  };

  const toggleInfo = getToggleInfo();

  const handleToggle = () => {
    onTabChange(oppositeTab);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >      
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={handleToggle}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 border border-slate-600/30 rounded-full text-white transition-all duration-200 hover:bg-primary hover:text-black hover:border-primary active:scale-95"
          )}
        >
          {toggleInfo.icon}
          <span className="text-sm font-medium">{toggleInfo.text}</span>
        </button>

      </div>

      {/* Current tab indicator */}
      <div className="flex items-center justify-center mt-2">
        <span className="text-xs text-slate-400 font-medium">
          Currently viewing: {activeTab === 'top-performers' ? 'Top Performers' : 'New'}
        </span>
      </div>

    </motion.div>
  );
};

export default TabToggle;


