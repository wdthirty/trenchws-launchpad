import { useEffect, useRef, useState } from 'react';
import { useTokensBySearch } from '@/hooks/queries';
import { useSearch } from '@/contexts/SearchProvider';
import { useRouter } from 'next/router';
import SearchIcon from '@/icons/SearchIcon';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TokensBySearchInfo } from '../Explore/types';
import { TokenLogo } from '@/components/TokenLogo';
import { TokenNameSymbol } from '../TokenHeader/TokenNameSymbol';
import { TokenCardAgeMetric, TokenCardVolumeMetric, TokenCardMcapMetric } from '../TokenCard/TokenCardMetric';

interface SearchOverlayProps {
  triggerButton?: React.ReactNode;
  className?: string;
}


export default function SearchOverlay({ triggerButton, className = '' }: SearchOverlayProps) {
  const { searchQuery, setSearchQuery } = useSearch();
  const router = useRouter();
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useTokensBySearch(searchQuery);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        setShowOverlay(false);
        setSearchQuery('');
      }
    };

    if (showOverlay) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOverlay, setSearchQuery]);

  useEffect(() => {
    if (showOverlay && inputRef.current) {
      // Small delay to ensure the input is properly rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      // Reset selected index when overlay opens
      setSelectedIndex(0);
    }
  }, [showOverlay]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Auto-scroll to selected item when navigating with arrow keys
  useEffect(() => {
    if (showOverlay && data && data.length > 0 && selectedIndex >= 0) {
      const listElement = overlayRef.current;
      if (listElement) {
        const selectedElement = listElement.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
        if (selectedElement) {
          // Calculate if the selected element is visible
          const containerRect = listElement.getBoundingClientRect();
          const elementRect = selectedElement.getBoundingClientRect();
          
          // Check if element is below the visible area (scrolling down)
          if (elementRect.bottom > containerRect.bottom) {
            selectedElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
          // Check if element is above the visible area (scrolling up)
          else if (elementRect.top < containerRect.top) {
            selectedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }
  }, [selectedIndex, showOverlay, data]);

  // Keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open search dialog with '/' key (only when not typing in input and dialog not open)
      if (event.key === '/' && !showOverlay && !(event.target as Element)?.matches('input, textarea')) {
        event.preventDefault();
        setShowOverlay(true);
      }
      
      // Close search dialog with ESC key (only when dialog is open)
      if (event.key === 'Escape' && showOverlay) {
        event.preventDefault();
        setShowOverlay(false);
        setSearchQuery('');
        setSelectedIndex(0);
      }

      // Search result navigation (only when dialog is open and has results)
      if (showOverlay && data && data.length > 0) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            setSelectedIndex(prev => prev < data.length - 1 ? prev + 1 : prev);
            break;
          case 'ArrowUp':
            event.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
            break;
          case 'Enter':
            event.preventDefault();
            if (data[selectedIndex]) {
              handleResultClick(data[selectedIndex]);
            }
            break;
        }
      }
    };

    // Add listener globally
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showOverlay, data, selectedIndex, setSearchQuery]);

  const handleResultClick = (item: TokensBySearchInfo) => {
    // Close the overlay
    setShowOverlay(false);
    
    // Clear the search query
    setSelectedIndex(0);
    setSearchQuery('');
    
    // Navigate to the specific token page
    router.push(`/coin/${item.id}`);
  };

  return (
    <>
      {/* 🔍 Trigger Button */}
      {triggerButton ? (
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOverlay(true);
          }} 
          className={className}
        >
          {triggerButton}
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOverlay(true);
          }}
          className={`w-fit p-2 mr-2 ${className}`}
        >
          <SearchIcon/>
        </button>
      )}

      {/* 🔍 Search Overlay */}
      {showOverlay && createPortal(
        <AnimatePresence>
          <motion.div
            key="search-overlay"
            className="fixed inset-0 bg-[#0B0F13]/50 backdrop-blur-sm z-[55]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => {
              setShowOverlay(false);
              setSearchQuery('');
            }}
          />
          
          <motion.div
            key="search-container"
            className="fixed inset-0 z-[60] flex justify-center items-start pt-20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              ref={overlayRef}
              className="bg-[#0B0F13] border border-[#21262d] rounded-2xl w-full max-w-[500px] max-h-[80vh] no-scrollbar overflow-y-auto pointer-events-auto mx-4 md:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: '14px'
              }}
            >
                <div className="flex items-center justify-between my-4 px-6">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Coin or CA"
                    autoFocus
                    className="w-full bg-transparent outline-none text-white placeholder-slate-400 text-sm border-none focus:outline-none focus:ring-0"
                    style={{ caretColor: 'white' }}
                  />
                  <button
                    onClick={() => {
                      setShowOverlay(false);
                      setSearchQuery('');
                    }}
                    className="text-slate-300 hover:text-white text-xs p-1 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {!searchQuery && (
                  <div className="text-center text-sm text-slate-300 py-6">
                    <div>Search by Coin or CA</div>
                    <div className="text-xs text-slate-500 mt-2">Press <span className="font-mono text-slate-400">/</span> anywhere to search</div>
                  </div>
                )}

                {searchQuery && isLoading && (
                  <div className="text-center text-sm text-slate-300 py-6">
                    Searching...
                  </div>
                )}

                {searchQuery && !isLoading && data && data.length === 0 && (
                  <div className="text-center text-sm text-slight py-6">
                    No Results Found
                  </div>
                )}

                {!isLoading && data && data.length > 0 && (
                  <>
                    <div className="px-6 py-2 text-xs text-slate-500 md:block hidden">
                      Use ↑↓ arrows to navigate, Enter to select
                    </div>
                    <ul className="pb-3">
                      {data.map((item, index) => (
                          <li 
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className={`relative flex items-center cursor-pointer px-2 text-xs h-[80px] w-full transition-colors duration-150 ${
                              index === selectedIndex 
                                ? 'bg-[#161B22] border-l-2 border-emerald-400' 
                                : 'hover:bg-[#161B22]/40'
                            }`}
                            data-index={index}
                          >
                            {/* Left Column: Token Icon (full height) */}
                            <div className="flex items-center justify-center mr-3 relative">
                              <TokenLogo
                                src={item.icon}
                                alt={item.symbol}
                                size="lg"
                                className="rounded-md self-center"
                              />
                              {/* Launchpad icon overlay */}
                              {item.launchpad === 'launchpad.fun' && (
                                <div className="absolute -bottom-1 -right-1 bg-[#0B0F13]/80 border border-slate-600/40 rounded-full p-0.5 z-10 transition-all duration-200 shadow-lg backdrop-blur-2xl">
                                  <img
                                    src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
                                    alt="launchpad"
                                    className="w-[10px] h-[10px]"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Center Column: Content (two rows) */}
                            <div className="flex-1 flex flex-col min-w-0 mr-2">
                              {/* Row 1: Metrics */}
                              <div className="flex items-center gap-4 mb-2">
                                <TokenCardAgeMetric createdAt={item.firstPool?.createdAt} />
                                <TokenCardVolumeMetric
                                  buyVolume={item.stats24h?.buyVolume}
                                  sellVolume={item.stats24h?.sellVolume}
                                />
                                <TokenCardMcapMetric mcap={item.mcap} />
                              </div>

                              {/* Row 2: Name/Ticker - constrained to not overflow metrics */}
                              <div className="flex items-center min-w-0">
                                <div className="flex flex-col min-w-0 overflow-hidden">
                                  <TokenNameSymbol 
                                    name={item.name}
                                    symbol={item.symbol}
                                    size="md"
                                  />
                                </div>
                              </div>
                            </div>
                          </li>
                      ))}
                    </ul>
                  </>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
