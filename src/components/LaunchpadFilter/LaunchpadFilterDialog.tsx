import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLaunchpadFilter } from '@/contexts/LaunchpadFilterProvider';
import { PillButton } from '@/components/ui/PillButton';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';

export const LaunchpadFilterDialog = () => {
  const { launchpadFilters, toggleLaunchpad, resetToDefault, isModalOpen, closeModal } = useLaunchpadFilter();

  const enabledCount = launchpadFilters.filter(f => f.enabled).length;

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        event.preventDefault();
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, closeModal]);

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-[#0B0F13]/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />
          
          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="w-full max-w-md bg-[#0B0F13] rounded-2xl border border-slate-600/30 overflow-hidden pointer-events-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <h3 className="text-lg font-semibold text-white">Filter by Launchpad</h3>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-96">
                <div className="grid grid-cols-2 gap-2">
                  {launchpadFilters.map((filter) => (
                    <CustomCheckbox
                      key={filter.id}
                      checked={filter.enabled}
                      onChange={() => toggleLaunchpad(filter.id)}
                      theme="ghost"
                    >
                      {filter.name}
                    </CustomCheckbox>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between p-4">
                <p className="text-xs text-slate-400">
                  Selected {enabledCount} of {launchpadFilters.length} launchpads
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={resetToDefault}
                    className="px-4 py-2 text-sm bg-[#0B0F13]/50 text-white border border-slate-600/30 hover:bg-white/[7%] hover:border-white/50 rounded-full transition-all duration-200 active:scale-95 font-medium"
                  >
                    Reset
                  </button>
                  <PillButton
                    theme="blue"
                    size="md"
                    onClick={closeModal}
                  >
                    Done
                  </PillButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
