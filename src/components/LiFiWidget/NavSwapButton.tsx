'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PillButton from '@/components/ui/PillButton';

interface NavSwapButtonProps {
  className?: string;
}

export const NavSwapButton: React.FC<NavSwapButtonProps> = ({ className = '' }) => {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.95 }}
      className={className}
    >
      <Link
        href="/bridge"
        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 backdrop-blur-sm rounded-full text-cyan-400 transition-all duration-200 hover:bg-cyan-500/30 hover:border-cyan-500/50 shadow-lg"
      >
        <span className="iconify ph--bridge-bold text-xs transition-all duration-200" />
        <span className="text-xs font-semibold transition-all duration-200 whitespace-nowrap">Bridge</span>
      </Link>
    </motion.div>
  );
};

export default NavSwapButton;
