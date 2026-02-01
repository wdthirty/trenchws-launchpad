import React from 'react';
import { cn } from '@/lib/utils';

type TopPerformerTokenCardSkeletonProps = React.ComponentPropsWithoutRef<'div'>;

export const TopPerformerTokenCardSkeleton: React.FC<TopPerformerTokenCardSkeletonProps> = ({ 
  className, 
  ...props 
}) => (
  <div className={cn('px-2 py-2 text-xs rounded-lg bg-[#0B0F13]/10 mb-2', className)} {...props}>
    <div className="flex items-center">
      {/* Icon shimmer */}
      <div className="relative group shrink-0 pr-2 overflow-visible">
        <div className="w-8 h-8 rounded-sm bg-slate-700/50 animate-pulse" />
      </div>

      {/* Content shimmer */}
      <div className="flex w-full items-center justify-between gap-3 overflow-hidden">
        {/* Token name/symbol skeleton */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="h-3 w-12 bg-slate-700/50 rounded-full animate-pulse mb-1" />
          <div className="h-4 w-16 bg-slate-700/50 rounded animate-pulse" />
        </div>
        
        {/* Metrics skeleton */}
        <div className="flex flex-col items-start justify-between gap-1">
          {/* Age metric */}
          <div className="h-3 w-20 bg-slate-700/50 rounded animate-pulse" />
          
          {/* Volume metric */}
          <div className="h-3 w-24 bg-slate-700/50 rounded animate-pulse" />
          
          {/* MCap metric */}
          <div className="h-3 w-18 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);
