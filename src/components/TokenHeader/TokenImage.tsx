import React from 'react';
import { cn } from '@/lib/utils';
import { TokenLogo } from '@/components/TokenLogo';

type TokenImageProps = {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  // Add bonding curve props
  bondingCurve?: number;
  showBondingCurve?: boolean;
  // Add graduation status to prevent showing progress ring on graduated tokens
  graduatedPool?: string;
};

const sizeMap = {
  sm: 'sm',
  md: 'md', 
  lg: 'lg'
} as const;

export const TokenImage: React.FC<TokenImageProps> = ({ 
  src, 
  alt = 'Token icon', 
  fallbackSrc = '/fallback-token-icon.svg',
  size = 'md',
  className,
  bondingCurve,
  showBondingCurve = false,
  graduatedPool
}) => {
  return (
    <div className={cn(
      'flex justify-center items-center flex-shrink-0 relative',
      className
    )}>
      {/* Token Logo Container - no overflow hidden to allow progress ring to show */}
      <div className="rounded-md">
        <TokenLogo
          src={src || fallbackSrc}
          alt={alt}
          size={sizeMap[size]}
          className="w-full h-full"
          bondingCurve={bondingCurve}
          showBondingCurve={showBondingCurve}
          graduatedPool={graduatedPool}
        />
      </div>
    </div>
  );
};

export default TokenImage;
