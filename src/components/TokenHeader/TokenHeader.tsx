import { useTokenInfo } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenSocials } from '../TokenSocials';
import { formatPoolAsTokenInfo } from '../Explore/pool-utils';
import { TokenAddress } from '../TokenAddress';
import { useTradeForm } from '@/contexts/TradeFormProvider';
import { TokenImage } from './TokenImage';
import { TokenNameSymbol } from './TokenNameSymbol';
import { useUser } from '@/contexts/UserProvider';
import { TokenCreatorInfo } from './TokenCreatorInfo';
import PillButton from '../ui/PillButton';

import { useTokenCreatorInfo, TokenCreatorInfo as TokenCreatorInfoType } from '@/hooks/useTokenCreatorInfo';
import { useTokenDescription, TokenDescriptionResponse } from '@/hooks/useTokenDescription';
import { TokenDescription } from './TokenDescription';
import Link from 'next/link';

// Custom hook to handle token info logic
const useTokenData = () => {
  const { data: fetchedPool } = useTokenInfo();
  
  // Memoize the minimalTokenInfo to prevent unnecessary re-renders
  const minimalTokenInfo = useMemo(() => {
    return fetchedPool ? formatPoolAsTokenInfo(fetchedPool) : null;
  }, [fetchedPool]);
  
  return {
    pool: fetchedPool,
    minimalTokenInfo
  };
};

// Extracted trade button component
const TradeButton = ({ symbol, address, decimals, launchpad, icon }: { symbol: string; address: string; decimals?: number; launchpad?: string; icon?: string }) => {
  const { openTradeForm, setShowWalletError } = useTradeForm();
  const user = useUser();

  const handleTrade = () => {
    if (!user?.publicKey) {
      setShowWalletError(true);
      return;
    }
    openTradeForm(
      "So11111111111111111111111111111111111111112",
      address,
      symbol,
      decimals,
      launchpad,
      icon
    );
  };

  return (
    <PillButton
      theme="green"
      size="md"
      onClick={handleTrade}
      className="font-bold"
    >
      <span className="whitespace-nowrap">Trade {symbol}</span>
    </PillButton>
  );
};

// Cross-Chain Swap button component
const CrossChainSwapButton = ({ symbol, address, name }: { symbol: string; address: string; name: string }) => {
  const bridgeUrl = `/bridge?from_token=${encodeURIComponent(address)}&token_symbol=${encodeURIComponent(symbol)}&token_name=${encodeURIComponent(name)}`;
  
  return (
    <Link href={bridgeUrl}>
      <PillButton
        theme="cyan"
        size="md"
        className="font-bold"
      >
        <span className="whitespace-nowrap">Bridge</span>
      </PillButton>
    </Link>
  );
};

type TokenHeaderProps = {
  className?: string;
};

export const TokenHeader: React.FC<TokenHeaderProps> = memo(({ className }) => {
  const { pool, minimalTokenInfo } = useTokenData();
  // Fetch creator info for launchpad.fun tokens
  const isOurToken = pool?.baseAsset?.launchpad === 'launchpad.fun';
  const { data: creatorInfo, isLoading: isLoadingCreatorInfo } = useTokenCreatorInfo(isOurToken ? minimalTokenInfo?.address : undefined);
  // Only fetch description for tokens created through our platform (launchpad.fun)
  const { data: descriptionData } = useTokenDescription(isOurToken ? minimalTokenInfo?.address : undefined);
  
  // Type assertions to fix TypeScript errors
  const typedCreatorInfo = creatorInfo as TokenCreatorInfoType | undefined;
  const typedDescriptionData = descriptionData as TokenDescriptionResponse | undefined;
  
  if (!minimalTokenInfo) return null;
  
  // Check if there are any contexts to show (description or creator info)
  const hasDescription = isOurToken && typedDescriptionData?.description;
  const hasCreatorInfo = isOurToken && typedCreatorInfo && !isLoadingCreatorInfo;
  const hasContexts = hasDescription || hasCreatorInfo;
  
  return (
    <div className={cn('h-full w-full relative z-50', className)}>
      {/* Main Token Info Row */}
      <div className={cn(
        'flex items-center gap-3',
        hasContexts ? 'flex-wrap' : 'flex-nowrap'
      )}>
        {/* Section 1: Token Info */}
        <div className="flex-shrink-0 flex items-center gap-3 p-2">
          <TokenImage 
            src={minimalTokenInfo.logoURI || pool?.baseAsset?.icon}
            alt={`${minimalTokenInfo.symbol} icon`}
            size="md"
            bondingCurve={pool?.bondingCurve}
            showBondingCurve={true}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TokenNameSymbol 
                name={minimalTokenInfo.name}
                symbol={minimalTokenInfo.symbol}
                size="md"
              />
            </div>
            <div className="flex items-center gap-2">
              <TokenAddress address={minimalTokenInfo.address} />
            </div>
          </div>
        </div>

        {/* Section 2: Trade Button & Cross-Chain Swap */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <TradeButton 
            symbol={minimalTokenInfo.symbol} 
            address={minimalTokenInfo.address} 
            decimals={pool?.baseAsset?.decimals}
            launchpad={pool?.baseAsset?.launchpad}
            icon={minimalTokenInfo.logoURI || pool?.baseAsset?.icon}
          />
          <CrossChainSwapButton 
            symbol={minimalTokenInfo.symbol}
            address={minimalTokenInfo.address}
            name={minimalTokenInfo.name}
          />
        </div>

        {/* Section 2: Socials */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-shrink-0"
        >
          <TokenSocials token={pool.baseAsset} tokenAddress={minimalTokenInfo.address} />
        </motion.div>

        {/* Section 3: Description - Only show for launchpad tokens */}
        {isOurToken && (
          <AnimatePresence>
            {typedDescriptionData?.description && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex-shrink-0"
              >
                <TokenDescription description={typedDescriptionData.description} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Section 4: Creator Info - Show for launchpad tokens */}
        {isOurToken && typedCreatorInfo && (
          <AnimatePresence>
            {!isLoadingCreatorInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex-shrink-0"
              >
                <TokenCreatorInfo
                  creator={typedCreatorInfo.creator}
                  taggedUser={typedCreatorInfo.taggedUser}
                  transferStatus={typedCreatorInfo.transferStatus}
                  isDexPaid={typedCreatorInfo.isDexPaid}
                  boosts={typedCreatorInfo.boosts}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
});

TokenHeader.displayName = 'TokenHeader';
