import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type TokenCategoryProps = {
  category?: string | null;
  className?: string;
};

export const TokenCategory: React.FC<TokenCategoryProps> = ({ category, className }) => {
  if (!category) {
    return null;
  }

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'meme':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'art':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'tech':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'fundraiser':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileTap={{ scale: 0.8 }}
      className={cn('flex items-center gap-2', className)}
    >
      <span className={cn(
        'px-2 py-1 text-xs font-medium rounded-full border',
        getCategoryColor(category)
      )}>
        {category}
      </span>
    </motion.div>
  );
};
