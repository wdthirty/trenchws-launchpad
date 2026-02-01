import { memo, useCallback, useMemo, useEffect } from 'react';
import { Pool } from '../Explore/types';
import { cn } from '@/lib/utils';
import { ExternalLink } from '../ui/ExternalLink';
import TelegramIcon from '@/icons/TelegramIcon';
import { WebsiteIcon } from '@/icons/WebsiteIcon';
import SearchIcon from '@/icons/SearchIcon';
import XIcon from '@/icons/XIcon';
import { deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { PublicKey } from '@solana/web3.js';
import Image from "next/image";
import { PumpfunIcon } from '@/icons/PumpfunIcon';
import { LetsbonkfunIcon } from '@/icons/LetsbonkfunIcon';
import { useIsMobile } from '@/hooks/useIsMobile';
import { motion, AnimatePresence } from 'framer-motion';

import { ChevronDown } from 'lucide-react';
import { BelieveIcon } from '@/icons/BelieveIcon';
import { VirtualsIcon } from '@/icons/VirtualsIcon';
import { BoopIcon } from '@/icons/BoopIcon';
import { DBCIcon } from '@/icons/DBCIcon';
import { DaosfunIcon } from '@/icons/DaosfunIcon';
import { HeavenIcon } from '@/icons/HeavenIcon';

const NEXT_PUBLIC_POOL_CONFIG_KEY = process.env.NEXT_PUBLIC_POOL_CONFIG_KEY!;

type PartialBaseAsset = Pick<
  Pool['baseAsset'],
  'id' | 'website' | 'twitter' | 'telegram' | 'launchpad' | 'symbol'
>;

type TokenSocialsProps = React.ComponentPropsWithoutRef<'span'> & {
  token: PartialBaseAsset;
  tokenAddress?: string; // Add tokenAddress for DEX buttons
  onOpenSocials?: () => void;
  onToggleSocials?: () => void;
  isOpen?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
};

export const TokenSocials: React.FC<TokenSocialsProps> = memo(({ token, tokenAddress, className, onOpenSocials, onToggleSocials, isOpen, buttonRef, ...props }) => {
  const isMobile = useIsMobile();

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  }, []);

  const handleToggleSocials = useCallback(() => {
    onToggleSocials?.();
  }, [onToggleSocials]);

  // Click outside to close for mobile dropdown
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking on the socials button itself
      if (buttonRef?.current && buttonRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on navigation buttons (Bridge/Trade buttons)
      const clickedElement = target as Element;
      if (clickedElement.closest('a[href*="/bridge"]') || 
          clickedElement.closest('button[class*="PillButton"]') ||
          clickedElement.closest('[data-navigation-button]')) {
        return;
      }
      
      onToggleSocials?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen, onToggleSocials, buttonRef]);

  // Get all available social links for mobile dropdown
  const socialLinks = useMemo(() => {
    const links = [
      {
        name: 'Solscan',
        href: `https://solscan.io/token/${token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Solscan" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: true
      },
      {
        name: 'Twitter',
        href: token.twitter || `https://x.com/search?q=${token.id}`,
        icon: <XIcon className="w-3.5 h-3.5 text-slate-400" />,
        alwaysShow: true
      },
      {
        name: 'Telegram',
        href: token.telegram,
        icon: <TelegramIcon className="w-3.5 h-3.5 text-slate-400" />,
        alwaysShow: !!token.telegram
      },
      {
        name: 'Website',
        href: token.website,
        icon: <WebsiteIcon className="w-3.5 h-3.5 text-slate-400" />,
        alwaysShow: !!token.website
      },
      {
        name: 'DEXScreener',
        href: `https://dexscreener.com/solana/${tokenAddress || token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="DEX" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: true
      },
      {
        name: 'MobyScreener',
        href: `https://mobyscreener.com/solana/${tokenAddress || token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Moby" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: true
      },
      {
        name: 'Pump.fun',
        href: `https://pump.fun/coin/${token.id}`,
        icon: <PumpfunIcon className="w-3.5 h-3.5 opacity-80" />,
        alwaysShow: token.launchpad === "pump.fun"
      },
      {
        name: 'Letsbonk.fun',
        href: `https://letsbonk.fun/token/${token.id}`,
        icon: <LetsbonkfunIcon className="w-3.5 h-3.5 opacity-80" />,
        alwaysShow: token.launchpad === "letsbonk.fun"
      },
      {
        name: 'Believe App',
        href: `https://believe.app/coin/${token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Believe" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "Believe"
      },
      {
        name: 'boop.fun',
        href: `https://boop.fun/tokens/${token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Boop" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "boop"
      },
      {
        name: 'launchpad.fun',
        href: `#`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Launchpad" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "launchpad.fun"
      },
      {
        name: 'Meteora DBC',
        href: `https://jup.ag/tokens/${token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="DBC" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "met-dbc"
      },
      {
        name: 'Bags App',
        href: `https://bags.fm/${token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Bags" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "bags.fun"
      },
      {
        name: 'Moon.it',
        href: `https://moon.it/token/${token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Moonit" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "moonit"
      },
      {
        name: 'Jup Studio',
        href: `https://jup.ag/tokens/${token.id}`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="JupStudio" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "jup-studio"
      },
      {
        name: 'Moonshot',
        href: `#`,
        icon: <img 
          src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
          alt="Moonshot" 
          width={14} 
          height={14}
          className="w-3.5 h-3.5 opacity-80"
          style={{ minWidth: '14px', minHeight: '14px' }}
        />,
        alwaysShow: token.launchpad === "moonshot"
      },
      {
        name: 'DAOS.FUN',
        href: `https://daos.fun/token/${token.id}`,
        icon: <DaosfunIcon className="w-3.5 h-3.5 opacity-80" />,
        alwaysShow: token.launchpad === "daos.fun"
      },
      {
        name: 'Heaven',
        href: `https://heaven.com/token/${token.id}`,
        icon: <HeavenIcon className="w-3.5 h-3.5 opacity-80" />,
        alwaysShow: token.launchpad === "heaven"
      }
    ].filter(link => link.alwaysShow);

    return links;
  }, [token, tokenAddress]);

  // Calculate dropdown position based on button location
  const getDropdownPosition = useMemo(() => {
    if (!buttonRef?.current) {
      return { top: '100%', right: 0 }; // Fallback position
    }
    
    return {
      top: '100%',
      right: 0
    };
  }, [buttonRef]);

  // Mobile version: Button with dropdown
  if (isMobile) {
    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleToggleSocials}
          className={cn(
            'rounded-full flex items-center justify-center gap-1.5 text-xs font-medium min-w-[80px]',
            className
          )}
          {...props}
        >
          <span className="text-slight">Socials</span>
          <ChevronDown className={cn("w-3 h-3 text-slight transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
                         <motion.div
               className="absolute bg-[#0B0F13] border border-slate-600/20 rounded-xl shadow-lg z-50 min-w-[200px] text-sm mt-2"
               style={{
                 top: getDropdownPosition.top,
                 right: getDropdownPosition.right
               }}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="p-2 space-y-1">
                {socialLinks.map((link, index) => {
                  // For non-clickable items (like launchpad.fun and moonshot), render as div instead of link
                  if (link.href === '#') {
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-md text-sm text-slate-400 cursor-default"
                      >
                        <div className="flex-shrink-0">
                          {link.icon}
                        </div>
                        <span>{link.name}</span>
                      </div>
                    );
                  }
                  
                  return (
                    <ExternalLink
                      key={index}
                      href={link.href}
                      onClick={handleClick}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 transition-colors duration-200 text-sm text-slate-300 hover:text-white"
                    >
                      <div className="flex-shrink-0">
                        {link.icon}
                      </div>
                      <span>{link.name}</span>
                    </ExternalLink>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop version: Horizontal layout (existing code)
  return (
    <span
      className={cn(
        'flex items-center gap-2',
        className
      )}
      {...props}
    >
      {/* Solscan Link */}
      <div className="relative group">
        <ExternalLink
          className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
          onClick={handleClick}
          href={`https://solscan.io/token/${token.id}`}
        >
          <img
            src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
            alt="Solscan"
            width={14}
            height={14}
            className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
            style={{ minWidth: '14px', minHeight: '14px' }}
          />
        </ExternalLink>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          Solscan
        </div>
      </div>

      {/* X/Twitter Link - always show, fallback to search if no Twitter address */}
      <div className="relative group">
        <ExternalLink
          className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
          onClick={handleClick}
          href={token.twitter || `https://x.com/search?q=${token.id}`}
        >
          <XIcon
            className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200"
            aria-label="Twitter"
            color="#DEDEDE"
          />
        </ExternalLink>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          {token.twitter ? 'Twitter' : 'Search X'}
        </div>
      </div>

      {/* Telegram Link */}
      {token.telegram && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={token.telegram}
          >
            <TelegramIcon
              className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200"
              aria-label="Telegram"
              color="#DEDEDE"
            />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Telegram
          </div>
        </div>
      )}

      {/* Website Link */}
      {token.website && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={token.website}
          >
            <WebsiteIcon
              className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200"
              aria-label="Website"
            />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Website
          </div>
        </div>
      )}

      {/* DEX Buttons */}
      {tokenAddress && (
        <>
          {/* DEXScreener Button */}
          <div className="relative group">
            <ExternalLink
              href={`https://dexscreener.com/solana/${tokenAddress}`}
              className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
              onClick={handleClick}
            >
              <img
                src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
                alt="DEX"
                width={14}
                height={14}
                className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
                style={{ minWidth: '14px', minHeight: '14px' }}
              />
            </ExternalLink>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              DEXScreener
            </div>
          </div>

          {/* MobyScreener Button */}
          <div className="relative group">
            <ExternalLink
              href={`https://mobyscreener.com/solana/${tokenAddress}`}
              className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
              onClick={handleClick}
            >
              <img
                src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
                alt="Moby"
                width={14}
                height={14}
                className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
                style={{ minWidth: '14px', minHeight: '14px' }}
              />
            </ExternalLink>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              MobyScreener
            </div>
          </div>
        </>
      )}

            {/* Pump.fun Launchpad */}
            {token.launchpad === "pump.fun" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://pump.fun/coin/${token.id}`}
          >
            <PumpfunIcon className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Pump.fun
          </div>
        </div>
      )}

      {/* Letsbonk.fun Launchpad */}
      {token.launchpad === "letsbonk.fun" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://letsbonk.fun/token/${token.id}`}
          >
            <LetsbonkfunIcon className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Letsbonk.fun
          </div>
        </div>
      )}

      {/* Believe Launchpad */}
      {token.launchpad === "Believe" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://believe.app/coin/${token.id}`}
          >
            <BelieveIcon className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Believe App
          </div>
        </div>
      )}

      {/* Believe Launchpad */}
      {token.launchpad === "boop" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://boop.fun/tokens/${token.id}`}
          >
            <BoopIcon className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            boop.fun
          </div>
        </div>
      )}

            {/* Believe Launchpad */}
            {token.launchpad === "launchpad.fun" && (
        <div className="relative group">
          <div
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
          >
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="Bags"
              width={14}
              height={14}
              className="w-3.5 h-3.5 transition-opacity duration-200 flex-shrink-0"
              style={{ minWidth: '14px', minHeight: '14px' }}
            />          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            launchpad.fun
          </div>
        </div>
      )}

      {/* Believe Launchpad */}
      {token.launchpad === "met-dbc" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://jup.ag/tokens/${token.id}`}
          >
            <img 
              src="https://www.meteora.ag/icons/v2/logo.svg" 
              alt="Meteora" 
              className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200"
            />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Meteora DBC
          </div>
        </div>
      )}

      {/* Bags Launchpad */}
      {token.launchpad === "bags.fun" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://bags.fm/${token.id}`}
          >
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="Bags"
              width={14}
              height={14}
              className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
              style={{ minWidth: '14px', minHeight: '14px' }}
            />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Bags App
          </div>
        </div>
      )}

      {/* Bags Launchpad */}
      {token.launchpad === "moonit" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://moon.it/token/${token.id}`}
          >
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="Moonit"
              width={14}
              height={14}
              className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
              style={{ minWidth: '14px', minHeight: '14px' }}
            />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Moon.it
          </div>
        </div>
      )}

      {/* Bags Launchpad */}
      {token.launchpad === "jup-studio" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://jup.ag/tokens/${token.id}`}
          >
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="JupStudio"
              width={14}
              height={14}
              className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
              style={{ minWidth: '14px', minHeight: '14px' }}
            />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Jup Studio
          </div>
        </div>
      )}

      {/* Bags Launchpad */}
      {token.launchpad === "moonshot" && (
        <div className="relative group">
          <div
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
          >
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="Moonshot"
              width={14}
              height={14}
              className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
              style={{ minWidth: '14px', minHeight: '14px' }}
            />
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Moonshot
          </div>
        </div>
      )}

      {/* DAOS.FUN Launchpad */}
      {token.launchpad === "daos.fun" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://daos.fun/token/${token.id}`}
          >
            <DaosfunIcon className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            DAOS.FUN
          </div>
        </div>
      )}

      {/* Heaven Launchpad */}
      {token.launchpad === "heaven" && (
        <div className="relative group">
          <ExternalLink
            className="p-2 bg-[#0B0F13] rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center"
            onClick={handleClick}
            href={`https://heaven.com/token/${token.id}`}
          >
            <HeavenIcon className="w-3.5 h-3.5 opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </ExternalLink>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-slight opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Heaven
          </div>
        </div>
      )}
    </span>
  );
});

TokenSocials.displayName = 'TokenSocials';
