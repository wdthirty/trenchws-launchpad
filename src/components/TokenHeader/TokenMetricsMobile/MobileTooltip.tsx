import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileTooltipProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  titleColor?: string | (() => string);
};

export const MobileTooltip: React.FC<MobileTooltipProps> = memo(({ 
  title, 
  description, 
  children, 
  className,
  titleColor = "text-emerald"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div 
        className={className}
        onClick={handleToggle}
      >
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-[#0B0F13]/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Tooltip Dialog */}
            <motion.div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl max-w-[280px] w-full pointer-events-auto"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className={cn("text-sm font-medium", typeof titleColor === 'function' ? titleColor() : titleColor)}>
                    {title}
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              
              {/* Content */}
              <div className="text-xs text-slate-300 leading-relaxed">
                {description}
              </div>
            </motion.div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

MobileTooltip.displayName = 'MobileTooltip';
