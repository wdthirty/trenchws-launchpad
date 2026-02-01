import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type TokenDescriptionProps = {
  className?: string;
  description?: string;
};

export const TokenDescription: React.FC<TokenDescriptionProps> = ({ className, description }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!description) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn('relative', className)}
    >
      {/* Description pill/badge */}
      <div 
        className="inline-flex items-center px-3 py-1.5 rounded-full border border-slate-600/30 text-xs font-medium text-slate-400 hover:text-primary hover:border-primary/30 transition-all duration-200 cursor-default"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        About
      </div>

      {/* Tooltip on hover */}
      <div 
        className={`absolute left-0 top-full mt-2 z-50 bg-[#0B0F13]/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[280px] transition-all duration-200 ${
          isHovered ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-400 mb-1">
              Coin Description
            </div>
            <div className="text-xs text-slate-300 leading-relaxed break-words whitespace-pre-wrap max-h-32 overflow-y-auto">
              {description}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
