import React, { useState, memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TokenLogoProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'dxl' | number;
  className?: string;
  // Add props to identify if this is a launchpad.fun top performer
  isLaunchpadToken?: boolean;
  isTopPerformer?: boolean;
  // Add bonding curve props
  bondingCurve?: number;
  showBondingCurve?: boolean;
  // Add graduation status to prevent showing progress ring on graduated tokens
  graduatedPool?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
  dxl: 120
};

const getCleanUrl = (url: string): string => {
  if (!url) return '';
  
  // Clean the URL
  let cleanedUrl = url.trim().replace(/[\x00-\x1F\x7F]/g, '');
  
  // Convert IPFS protocol URLs to HTTP gateway URLs
  if (cleanedUrl.startsWith('ipfs://')) {
    const ipfsHash = cleanedUrl.replace('ipfs://', '');
    cleanedUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
  }
  
  return cleanedUrl;
};

// Helper function to determine if optimization should be enabled
const shouldOptimize = (isLaunchpadToken?: boolean, isTopPerformer?: boolean): boolean => {
  // Only optimize for launchpad.fun tokens that are top performers
  return Boolean(isLaunchpadToken && isTopPerformer);
};

const FallbackIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <div 
    className={cn(
      'bg-gray-800 rounded-md flex items-center justify-center',
      className
    )}
    style={{ width: size, height: size }}
  >
    <svg 
      width={size * 0.4} 
      height={size * 0.4} 
      fill="currentColor" 
      viewBox="0 0 20 20"
      className="text-gray-400"
    >
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  </div>
);

/**
 * TokenLogo component that displays a token icon with optional bonding curve progress ring.
 * 
 * The bonding curve progress ring shows the progress of a token through its bonding curve phase.
 * - 0% = Token is at the start of its bonding curve
 * - 100% = Token has completed its bonding curve and graduated
 * 
 * The progress ring appears as a glowing yellow border around the token image,
 * with the progress indicated by the length of the filled portion.
 * The ring follows the same border radius as the token image and starts from the top-left.
 */
export const TokenLogo: React.FC<TokenLogoProps> = memo(({
  src,
  alt = 'Token',
  size = 'md',
  className,
  isLaunchpadToken = false,
  isTopPerformer = false,
  bondingCurve,
  showBondingCurve = false,
  graduatedPool
}) => {
  const [hasError, setHasError] = useState(false);
  
  // Determine actual size
  const actualSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Handle no source or error
  if (!src || hasError) {
    return <FallbackIcon size={actualSize} className={className} />;
  }
  
  // Get clean URL (just handle IPFS conversion)
  const cleanSrc = getCleanUrl(src);
  
  // Determine if optimization should be enabled
  const enableOptimization = shouldOptimize(isLaunchpadToken, isTopPerformer);

  // Calculate bonding curve progress
  const progress = bondingCurve ? Math.max(0, Math.min(1, bondingCurve / 100)) : 0;
  
  return (
    <div 
      className={cn(
        'relative overflow-visible rounded-md flex-shrink-0',
        className
      )}
      style={{ width: actualSize, height: actualSize }}
    >
      <Image
        src={cleanSrc}
        alt={alt}
        width={actualSize}
        height={actualSize}
        className="w-full h-full object-cover rounded-md"
        onError={() => setHasError(true)}
        draggable={false}
        unoptimized={!enableOptimization}
        loading="lazy" // Enable lazy loading for better performance
        priority={false} // Don't prioritize these images
      />

      {/* Bonding Curve Progress Ring */}
      {/* 
        Shows the progress of a token through its bonding curve phase:
        - 0% = Token is at the start of its bonding curve
        - 100% = Token has completed its bonding curve and graduated
        
        The progress ring appears as a glowing yellow border around the token image,
        with the progress indicated by the length of the filled portion.
        The ring follows the same border radius as the token image and starts from the top-left.
      */}
      {showBondingCurve && bondingCurve !== undefined && !graduatedPool && (
        <svg
          width={actualSize + 12}
          height={actualSize + 12}
          viewBox={`0 0 ${actualSize + 12} ${actualSize + 12}`}
          className="pointer-events-none absolute"
          style={{
            width: actualSize + 12,
            height: actualSize + 12,
            top: '-6px',
            left: '-6px',
            zIndex: 10,
          }}
        >
          {/* Define gradient and filter */}
          <defs>
            <linearGradient id={`bondingCurveGradient-${actualSize}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FDE047" stopOpacity="1" />
              <stop offset="50%" stopColor="#ffd268" stopOpacity="1" />
              <stop offset="100%" stopColor="#FDE047" stopOpacity="1" />
            </linearGradient>
            <filter id={`bondingCurveGlow-${actualSize}`} height="130%" width="130%" x="-15%" y="-15%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background path with rounded corners matching the image */}
          <path
            d={`
              M ${6 + 6},6
              L ${actualSize + 6 - 6},6
              Q ${actualSize + 6},6 ${actualSize + 6},${6 + 6}
              L ${actualSize + 6},${actualSize + 6 - 6}
              Q ${actualSize + 6},${actualSize + 6} ${actualSize + 6 - 6},${actualSize + 6}
              L ${6 + 6},${actualSize + 6}
              Q 6,${actualSize + 6} 6,${actualSize + 6 - 6}
              L 6,${6 + 6}
              Q 6,6 ${6 + 6},6
              Z
            `}
            fill="none"
            stroke="#1f2937"
            strokeWidth="2"
            opacity="0.8"
          />

          {/* Progress path with rounded corners matching the image - starts from top-left */}
          <path
            d={`
              M ${6 + 6},6
              L ${actualSize + 6 - 6},6
              Q ${actualSize + 6},6 ${actualSize + 6},${6 + 6}
              L ${actualSize + 6},${actualSize + 6 - 6}
              Q ${actualSize + 6},${actualSize + 6} ${actualSize + 6 - 6},${actualSize + 6}
              L ${6 + 6},${actualSize + 6}
              Q 6,${actualSize + 6} 6,${actualSize + 6 - 6}
              L 6,${6 + 6}
              Q 6,6 ${6 + 6},6
              Z
            `}
            fill="none"
            stroke={`url(#bondingCurveGradient-${actualSize})`}
            strokeWidth="2"
            strokeDasharray={`${(actualSize + 6) * 4}`}
            strokeDashoffset={`${(actualSize + 6) * 4 * (1 - progress)}`}
            filter={`url(#bondingCurveGlow-${actualSize})`}
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
});

TokenLogo.displayName = 'TokenLogo';

export default TokenLogo;
