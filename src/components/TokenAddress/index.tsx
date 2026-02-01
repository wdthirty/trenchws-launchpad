import { memo, useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TruncatedAddress } from '../TruncatedAddress/TruncatedAddress';
import CopyIconSVG from '@/icons/CopyIconSVG';

type TokenAddressProps = React.ComponentPropsWithoutRef<'span'> & {
  address: string;
};

export const TokenAddress: React.FC<TokenAddressProps> = memo(({ address, className, ...props }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return (
    <span
      className={cn(
        'flex items-center gap-2 relative group cursor-pointer w-fit',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-2 w-fit">
        <TruncatedAddress
          className={cn(
            'font-mono text-sm md:text-xs font-medium leading-none tracking-tight transition-colors duration-200',
            copied ? 'text-[#3ce3ab]' : 'text-slight'
          )}
          address={address}
        />
        <div className="flex items-center gap-1">
          {copied ? (
            <svg 
              className="text-[#3ce3ab]" 
              width={12} 
              height={12} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          ) : (
            <CopyIconSVG 
              className="text-slight transition-colors duration-200" 
              width={12} 
              height={12}
            />
          )}
        </div>
      </div>
      
      {/* Hover text below the address - hidden on mobile */}
      <div className="absolute top-full left-0 mt-1 text-xs opacity-0 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-sm:hidden"
           style={{ color: copied ? '#3ce3ab' : '#646464' }}>
      </div>
    </span>
  );
});

TokenAddress.displayName = 'TokenAddress';
