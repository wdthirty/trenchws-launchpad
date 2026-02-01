import React from 'react';
import { cn } from '@/lib/utils';

export const Skeleton: React.FC<React.ComponentPropsWithoutRef<'div'>> = ({ className, ...props }) => (
  <div
    className={cn('animate-pulse rounded-full bg-slate-700/50', className)}
    {...props}
  />
);

export default Skeleton;


