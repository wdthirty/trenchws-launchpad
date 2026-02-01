import React from 'react';
import { motion } from 'framer-motion';

interface BoostsDisplayProps {
  boosts?: number;
  className?: string;
  theme?: {
    text: string;
    hover?: string;
  };
}

export const BoostsDisplay: React.FC<BoostsDisplayProps> = ({ boosts, className = '', theme }) => {
  if (!boosts || boosts === 0) {
    return null;
  }

  // Default to yellow if no theme provided
  const iconColor = theme?.text || 'text-yellow-400';
  const textColor = theme?.text || 'text-yellow-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileTap={{ scale: 0.8 }}
      className={`flex items-center gap-1 ${className}`}
    >
      {/* Lightning bolt icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={iconColor}
      >
        <path
          d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Boosts number */}
      <span className={`${textColor} font-medium text-xs`}>
        {boosts}
      </span>
    </motion.div>
  );
};
