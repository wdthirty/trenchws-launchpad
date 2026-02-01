import React from 'react';
import { cn } from '@/lib/utils';

interface ChartShimmerProps {
  className?: string;
  lines?: number;
  height?: string;
}

export const ChartShimmer: React.FC<ChartShimmerProps> = ({ 
  className, 
  lines = 8, 
  height = "h-full" 
}) => {
  return (
    <div className={cn("w-full", height, className)}>
      {/* Table header shimmer */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/30 bg-[#0B0F13]/50">
        <div className="h-5 w-24 bg-slate-700/50 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
          <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </div>
      
      {/* Table rows shimmer */}
      <div className="flex-1 p-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-700/20 last:border-b-0">
            {/* Row content shimmer */}
            <div className="flex-1 flex items-center gap-3">
              <div className="h-8 w-8 bg-slate-700/50 rounded animate-pulse" />
              <div className="flex flex-col gap-1">
                <div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-700/50 rounded animate-pulse" />
              </div>
            </div>
            
            {/* Metrics shimmer */}
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 bg-slate-700/50 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse" />
              <div className="h-4 w-18 bg-slate-700/50 rounded animate-pulse" />
            </div>
            
            {/* Action button shimmer */}
            <div className="h-8 w-16 bg-slate-700/50 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartShimmer;
