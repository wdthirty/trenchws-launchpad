import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ExternalLink } from '../ui/ExternalLink';
import Link from 'next/link';
import { BoostsDisplay } from './BoostsDisplay';
import XIcon from '@/icons/XIcon';
import { appThemes } from './themes';
import { UserInfo, TransferStatus } from '@/hooks/useTokenCreatorInfo';
import { getProfileUrlFromUserInfo, getDisplayNameFromUserInfo, getProfileImageUrlFromUserInfo } from '@/lib/utils/profile-url';

interface TokenCreatorInfoProps {
  creator?: UserInfo;
  taggedUser?: UserInfo;
  transferStatus?: TransferStatus;
  isDexPaid?: boolean;
  boosts?: number;
  className?: string;
}

const UserCard = ({ user, label, earnings }: { 
  user: UserInfo; 
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg h-fit transition-all duration-200 bg-transparent border",
        theme.border,
        theme.borderHover
      )}
    >
      {/* Label positioned within border at top left */}
      <div className={cn(
        "absolute bg-[#0B0F13] top-[-6px] left-1 px-1 text-[8px] uppercase tracking-wide font-medium rounded-tl-lg",
        theme.textSecondary
      )}>
        {label}
      </div>
      
      {/* Profile image */}
      <img
        src={getProfileImageUrlFromUserInfo(user)}
        alt={getDisplayNameFromUserInfo(user)}
        className={cn(
          "w-4 h-4 rounded-full object-cover",
          theme.border
        )}
      />
  
      {/* Username with theme-based gradient */}
      <Link 
        href={getProfileUrlFromUserInfo(user)}
        className={cn(
          "text-xs font-semibold truncate cursor-pointer",
          `bg-gradient-to-r ${theme.secondary} text-transparent bg-clip-text`
        )}
      >
        {getDisplayNameFromUserInfo(user)}
      </Link>
      
      {/* Earnings pill with theme-based styling - only show when earnings has a value */}
      {earnings && (
        <span className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
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
          className="p-0.5 rounded"
        >
          <XIcon 
            className="w-3 h-3 text-slate-400"
            aria-label="Twitter" 
          />
        </ExternalLink>
      )}
    </motion.div>
  );
};

export const TokenCreatorInfo: React.FC<TokenCreatorInfoProps> = memo(({ 
  creator, 
  taggedUser, 
  transferStatus,
  isDexPaid, 
  boosts,
  className
}) => {

  return (
    <div className={cn('flex flex-row gap-3 items-center', className)}>
      {/* Transfer Status - Show instead of creator info when available */}
      {transferStatus ? (
        <>
          {/* Current Owner (CTO by or Acquired by) */}
          {transferStatus.currentOwner && (
            <UserCard
              user={transferStatus.currentOwner}
              label={transferStatus.status === 'CTO' ? 'CTO by' : 'Acquired by'}
              earnings=""
            />
          )}
        </>
      ) : (
        <>
          {/* Creator Info - Only show when no transfer status */}
          {creator && (
            <UserCard
              user={creator}
              label="created by"
              earnings={taggedUser ? "0%" : ""}
            />
          )}
          
          {/* Tagged User Info */}
          {taggedUser && (
            <UserCard
              user={taggedUser}
              label="royalties to"
              earnings="100%"
            />
          )}
        </>
      )}

      {/* DEX Paid Status and Boosts - Only show when paid */}
      {isDexPaid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          whileTap={{ scale: 0.8 }}
          className={cn(
            "min-w-[90px] relative flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg h-fit transition-all duration-200 bg-transparent border",
            appThemes.purple.border,
            appThemes.purple.borderHover
          )}
        >
          {/* Label positioned within border at top left */}
          <div className={cn(
            "absolute bg-[#0B0F13] top-[-6px] left-1 px-1 text-[8px] uppercase tracking-wide font-medium rounded-tl-lg",
            appThemes.purple.textSecondary
          )}>
            DEX status
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shadow-lg",
                `bg-gradient-to-r ${appThemes.purple.primary}`
              )}>
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={cn(
                "text-xs font-semibold",
                `bg-gradient-to-r ${appThemes.purple.primary} text-transparent bg-clip-text`
              )}>
                Paid
              </span>
            </div>
            <BoostsDisplay boosts={boosts} theme={appThemes.purple} />
          </div>
        </motion.div>
      )}
    </div>
  );
});

TokenCreatorInfo.displayName = 'TokenCreatorInfo';
