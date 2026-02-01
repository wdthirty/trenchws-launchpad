import { useTokenInfo } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import { memo, useState, useEffect } from 'react';
import { formatPoolAsTokenInfo } from '../Explore/pool-utils';
import { useRouter } from 'next/router';
import { TokenAddress } from '../TokenAddress';
import { useTradeForm } from '@/contexts/TradeFormProvider';
import { useUser } from '@/contexts/UserProvider';
import { TokenMetricsMobile } from './TokenMetricsMobile';
import { TokenImage } from './TokenImage';
import { useTokenCategory } from '@/hooks/useTokenCategory';
import { useTokenCreatorInfo } from '@/hooks/useTokenCreatorInfo';
import PillButton from '../ui/PillButton';
import { TokenSocials } from '../TokenSocials';

import { appThemes } from './themes';
import Link from 'next/link';
import { ExternalLink } from '../ui/ExternalLink';
import XIcon from '@/icons/XIcon';
import { getDisplayNameFromUserInfo, getProfileImageUrlFromUserInfo, getProfileUrlFromUserInfo } from '@/lib/utils/profile-url';

// Custom Tooltip Component
const TokenNameTooltip = ({ children, content, isVisible, onClick }: {
  children: React.ReactNode;
  content: string;
  isVisible: boolean;
  onClick: () => void;
}) => {
  return (
    <div className="relative inline-block">
      <div onClick={onClick}>
        {children}
      </div>
      {isVisible && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in-0 zoom-in-95 duration-200" style={{ backgroundColor: '#161B22' }}>
          {content}
        </div>
      )}
    </div>
  );
};

// UserCard component matching TokenCreatorInfo
const UserCard = ({ user, label, earnings }: { 
  user: any; 
  label: string; 
  earnings: string;
}) => {
  if (!user) return null;

  // Get theme based on label
  const getTheme = (label: string) => {
    if (label === 'created by') return appThemes.yellow;
    if (label === 'royalties to') return appThemes.green;
    if (label === 'CTO by' || label === 'Acquired by') return appThemes.orange;
    return appThemes.slate;
  };

  const theme = getTheme(label);

  return (
    <div
             className={cn(
         "relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg h-fit bg-transparent border w-full",
         theme.border
       )}
    >
      {/* Label positioned within border at top left */}
             <div className={cn(
         "absolute bg-[#0B0F13] top-[-7px] left-1.5 px-1.5 text-[9px] uppercase tracking-wide font-medium rounded-tl-lg",
         theme.textSecondary
       )}>
        {label}
      </div>
      
             {/* Profile image */}
       <img
         src={getProfileImageUrlFromUserInfo(user) || '/fallback-token-icon.svg'}
         alt={getDisplayNameFromUserInfo(user)}
                  className={cn(
            "w-5 h-5 rounded-full object-cover flex-shrink-0",
            theme.border
          )}
       />
   
       {/* Username with theme-based gradient */}
       <Link 
         href={getProfileUrlFromUserInfo(user)}
                  className={cn(
            "text-sm font-semibold cursor-pointer flex-1 min-w-0",
            `bg-gradient-to-r ${theme.secondary} text-transparent bg-clip-text`
          )}
       >
         <span className="truncate block">{getDisplayNameFromUserInfo(user)}</span>
       </Link>
       
       {/* Earnings pill with theme-based styling - only show when earnings has a value */}
       {earnings && (
                  <span className={cn(
            "text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 text-center flex items-center justify-center",
            `bg-gradient-to-r ${theme.secondary}`,
            "text-black"
          )}>
           {earnings}
         </span>
           )}

       {/* Twitter link */}
       {user.twitterUrl && (
         <ExternalLink
           href={user.twitterUrl}
                      className={cn(
              "p-0.5 rounded flex-shrink-0"
            )}
         >
           <XIcon 
                          className={cn(
                "w-3.5 h-3.5 text-slate-400"
              )}
             aria-label="Twitter" 
           />
         </ExternalLink>
       )}
     </div>
  );
};

type TokenHeaderProps = {
  className?: string;
  isSocialsOpen?: boolean;
  onToggleSocials?: () => void;
  socialsButtonRef?: React.RefObject<HTMLButtonElement>;
};

export const TokenMobileHeader: React.FC<TokenHeaderProps> = memo(({
  className,
  isSocialsOpen,
  onToggleSocials,
  socialsButtonRef
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const router = useRouter();
  const { data: pool } = useTokenInfo();
  const minimalTokenInfo = formatPoolAsTokenInfo(pool);

  const handleTooltipClick = () => {
    setShowTooltip(!showTooltip);
  };

  // Auto-hide tooltip after 5 seconds
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Only fetch category for tokens created through our platform (launchpad.fun)
  const isOurToken = pool?.baseAsset?.launchpad === 'launchpad.fun';
  const { data: categoryData } = useTokenCategory(isOurToken ? minimalTokenInfo?.address : undefined);

  // Fetch creator info for launchpad tokens
  const { data: creatorInfo } = useTokenCreatorInfo(isOurToken ? minimalTokenInfo?.address : undefined);
  
  // Type assertion to fix TypeScript errors
  const typedCreatorInfo = creatorInfo as any;
  const typedCategoryData = categoryData as any;

  const { openTradeForm, setShowWalletError } = useTradeForm();
  const { publicKey } = useUser();

  // Create token object for social links
  const token = {
    id: minimalTokenInfo?.address,
    website: pool?.baseAsset?.website,
    twitter: pool?.baseAsset?.twitter,
    telegram: pool?.baseAsset?.telegram,
    launchpad: pool?.baseAsset?.launchpad,
    symbol: minimalTokenInfo?.symbol
  };

  return (
    <div className={cn('w-full', className)}>
      {minimalTokenInfo && (
        <div className="flex flex-col gap-3 p-2">
          {/* Token Info Section */}
          <div className="flex items-center">
            <TokenImage
              src={minimalTokenInfo?.logoURI || pool?.baseAsset?.icon}
              alt={`${minimalTokenInfo?.symbol} icon`}
              size="lg"
              className="flex-shrink-0"
              bondingCurve={pool?.bondingCurve}
              showBondingCurve={pool?.bondingCurve !== undefined && pool?.bondingCurve < 100}
            />

            <div className="flex flex-col gap-2 flex-1 ml-4 min-w-0">
              {/* Token Symbol and Name Row with Bridge Button */}
              <div className="flex items-center gap-2 min-w-0">
                {minimalTokenInfo?.symbol && (
                  <span className="font-medium text-primary border border-primary rounded-full px-2 py-1 text-xs flex-shrink-0">
                    {minimalTokenInfo?.symbol}
                  </span>
                )}
                <TokenNameTooltip
                  content={minimalTokenInfo?.name || ''}
                  isVisible={showTooltip}
                  onClick={handleTooltipClick}
                >
                  <span
                    className="font-bold text-white leading-none tracking-tight min-w-0 text-base sm:text-sm xs:text-xs truncate cursor-pointer"
                    style={{
                      fontSize: 'clamp(0.75rem, 4vw, 1rem)',
                      lineHeight: '1'
                    }}
                  >
                    {minimalTokenInfo?.name}
                  </span>
                </TokenNameTooltip>

                {/* Spacer to push bridge button to the right */}
                <div className="flex-1" />

                {/* Cross-Chain Swap Button */}
                <Link href={`/bridge?from_token=${encodeURIComponent(minimalTokenInfo.address)}&token_symbol=${encodeURIComponent(minimalTokenInfo.symbol)}&token_name=${encodeURIComponent(minimalTokenInfo.name)}`} data-navigation-button="bridge">
                  <PillButton
                    theme="cyan"
                    size="sm"
                    className="font-bold text-xs w-16"
                  >
                    Bridge
                  </PillButton>
                </Link>
              </div>

              {/* Token Address Row with Socials and Trade Button */}
              <div className="flex items-center gap-2 min-w-0">
                <TokenAddress address={minimalTokenInfo.address} />

                {/* Spacer to push buttons to the right */}
                <div className="flex-1" />

                {/* Socials Dropdown */}
                <TokenSocials
                  token={token}
                  tokenAddress={minimalTokenInfo.address}
                  isOpen={isSocialsOpen}
                  onToggleSocials={onToggleSocials}
                  buttonRef={socialsButtonRef}
                />

                {/* Trade Button */}
                <PillButton
                  theme="green"
                  size="sm"
                  onClick={() => {
                    if (!publicKey) {
                      setShowWalletError(true);
                      return;
                    }
                    openTradeForm(
                      "So11111111111111111111111111111111111111112",
                      minimalTokenInfo.address,
                      minimalTokenInfo.symbol,
                      pool?.baseAsset?.decimals,
                      pool?.baseAsset?.launchpad,
                      minimalTokenInfo?.logoURI || pool?.baseAsset?.icon
                    );
                  }}
                  className="font-bold text-xs w-16"
                  data-navigation-button="trade"
                >
                  Trade
                </PillButton>
              </div>
            </div>
          </div>

          {/* Token Metadata Row - Creator Info */}
          {(typedCreatorInfo?.creator || typedCreatorInfo?.taggedUser || typedCreatorInfo?.transferStatus) && (
                         <div className="flex flex-col gap-4 mt-2 w-full">
              {/* Transfer Status - Show instead of creator info when available */}
              {typedCreatorInfo?.transferStatus ? (
                <>
                  {/* Current Owner (CTO by or Acquired by) */}
                  {typedCreatorInfo.transferStatus.currentOwner && (
                    <UserCard
                      user={typedCreatorInfo.transferStatus.currentOwner}
                      label={typedCreatorInfo.transferStatus.status === 'CTO' ? 'CTO by' : 'Acquired by'}
                      earnings=""
                    />
                  )}
                </>
              ) : (
                <>
                  {/* Creator Info - Only show when no transfer status */}
                  {typedCreatorInfo?.creator && (
                    <UserCard
                      user={typedCreatorInfo.creator}
                      label="created by"
                      earnings={typedCreatorInfo?.taggedUser ? "0%" : ""}
                    />
                  )}

                  {/* Tagged User Info */}
                  {typedCreatorInfo?.taggedUser && (
                    <UserCard
                      user={typedCreatorInfo.taggedUser}
                      label="royalties to"
                      earnings="100%"
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Token Metrics - Mobile Grid Layout */}
          <div className="mt-2">
            <TokenMetricsMobile tId={minimalTokenInfo.address} creatorInfo={typedCreatorInfo} categoryData={typedCategoryData} />
          </div>
        </div>
      )}
    </div>
  );
});

TokenMobileHeader.displayName = 'TokenMobileHeader';
