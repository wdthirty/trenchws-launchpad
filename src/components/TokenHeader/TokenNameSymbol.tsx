import React from 'react';
import { cn } from '@/lib/utils';

type TokenNameSymbolProps = {
  name?: string;
  symbol?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  nameClassName?: string;
  symbolClassName?: string;
  showSymbol?: boolean;
  vertical?: boolean;
};

const sizeClasses = {
  sm: {
    name: 'text-sm',
    symbol: 'text-xs px-1.5 py-0.5'
  },
  md: {
    name: 'text-lg md:text-base',
    symbol: 'text-sm md:text-xs px-2 py-1'
  },
  lg: {
    name: 'text-lg',
    symbol: 'text-sm px-2.5 py-1.5'
  }
};

export const TokenNameSymbol: React.FC<TokenNameSymbolProps> = ({
  name,
  symbol,
  size = 'md',
  className,
  nameClassName,
  symbolClassName,
  showSymbol = true,
  vertical = false
}) => {
  if (!name) return null;

  return (
    <div className={cn('flex flex-col gap-2 min-w-0 flex-1', className)}>
      <div className={cn(
        'flex min-w-0 w-full',
        vertical ? 'flex-col items-start' : 'items-center gap-2'
      )}>
        {showSymbol && symbol && (
          <span className={cn(
            'font-medium text-primary border border-primary rounded-full flex-shrink-0 whitespace-nowrap',
            sizeClasses[size].symbol,
            symbolClassName
          )}>
            {symbol}
          </span>
        )}
        <span
          className={cn(
            'font-bold text-white leading-none tracking-tight truncate min-w-0',
            vertical ? 'w-full' : 'w-fit',
            sizeClasses[size].name,
            nameClassName
          )}
          title={name}
        >
          {name}
        </span>
      </div>
    </div>
  );
};

export default TokenNameSymbol;
