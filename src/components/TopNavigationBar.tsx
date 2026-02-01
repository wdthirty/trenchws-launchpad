
import Link from 'next/link';
import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";
import { cn } from '@/lib/utils';
import { TOPBAR_HEIGHT } from '@/components/ui/Page/Page';
import { useUser } from '@/contexts/UserProvider';
import SearchOverlay from './SearchBar/SearchBar';
import PillButton from './ui/PillButton';
import { MobileSidebar } from './MobileSidebar';
import { getUserDisplayIcon } from '@/lib/utils/user-icon';
import { getProfileUrl, getDisplayName } from '@/lib/utils/profile-url';
import { NavSwapButton } from '@/components/LiFiWidget';
import { toast } from 'sonner';

interface TopNavigationBarProps {
  scrollable?: boolean;
}

export default function TopNavigationBar({ scrollable = false }: TopNavigationBarProps) {
  const { ready, authenticated, logout } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { } = useUser();
  const user = useUser();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!scrollable) return undefined;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 100; // Start hiding after 100px of scroll

      if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
        // Scrolling down - hide topbar
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY <= scrollThreshold) {
        // Scrolling up or near top - show topbar
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollable, lastScrollY]);



  // Handle navigation with brief hiding effect
  const handleNavigation = (href: string) => {
    router.push(href);
  };

  // Handle logo navigation with mobile-specific improvements
  const handleLogoNavigation = () => {
    // Force navigation to home page with error handling
    try {
      router.push('/');
    } catch (error) {
      // Fallback: try to navigate using window.location
      window.location.href = '/';
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // First, disconnect external wallets if any are connected
      if (solanaWallets && solanaWallets.length > 0) {
        for (const wallet of solanaWallets) {
          if (wallet.walletClientType !== 'privy') {
            try {
              await wallet.disconnect();
            } catch (error) {
              console.warn('Failed to disconnect external wallet:', error);
            }
          }
        }
      }
      
      // Then logout from Privy
      await logout();
      toast.success('Logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
    }
  };

  const baseClasses = scrollable
    ? cn(
      "fixed top-0 left-0 right-0 transition-transform duration-300 ease-in-out",
      isVisible ? "translate-y-0" : "-translate-y-full"
    )
    : "fixed top-0 left-0 right-0";

  return (
    <>
      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Static Banner */}
      <div className={cn("md:hidden z-50 bg-[#0B0F13]/80 backdrop-blur-sm px-2", baseClasses)} style={{ height: `${TOPBAR_HEIGHT}px` }}>
        <div className="h-full flex items-center justify-between">
          {/* Left side - Login Button */}
          <div className="flex items-center w-24 justify-start">
            {!isClient ? (
              <div className="w-7 h-7 rounded-full bg-white/5" />
            ) : user?.publicKey ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-full ml-1 bg-[#0B0F13]/80 backdrop-blur-sm transition-all duration-200 hover:bg-[#0B0F13]/60"
                >
                  <img
                    src={getUserDisplayIcon(user?.displayIcon)}
                    alt={user ? getDisplayName(user) : 'User'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </button>
              </div>
            ) : !ready ? (
              // Show loading state only when Privy is not ready
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0B0F13]/80 backdrop-blur-sm transition-all duration-200">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <PillButton
                onClick={() => handleNavigation('/login')}
                theme="ghost"
                size="md"
                icon="ph--user-circle-bold"
                className="px-4 py-2 text-sm whitespace-nowrap"
              >
                Log in
              </PillButton>
            )}
          </div>

          {/* Center - Logo */}
          <div className="flex items-center justify-center">
            <button
              onClick={handleLogoNavigation}
              className="flex items-center justify-center px-1 py-2 rounded-full transition-all active:scale-95 touch-manipulation"
            >
              <img
                src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
                alt="launchpad logo"
                className="w-8 h-8"
              />
            </button>
          </div>

          {/* Right side - Search Button */}
          <div className="flex items-center w-24 justify-end">
            <SearchOverlay
              triggerButton={
                <button className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0B0F13] backdrop-blur-sm transition-all duration-200 hover:bg-[#161B22]/60">
                  <span className="iconify ph--magnifying-glass-bold text-white text-xl" />
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* Desktop Top Bar */}
      <div className={cn("hidden md:flex z-50 bg-[#0B0F13]/80 backdrop-blur-sm", baseClasses)} style={{ height: `${TOPBAR_HEIGHT}px` }}>
        <div className="flex items-center justify-between h-full w-full px-2">
          {/* Left side */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogoNavigation}
              className="flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-200 active:scale-95 touch-manipulation"
            >
              <div className="flex items-center gap-2 transition-all duration-200">
                <img
                  src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
                  alt="launchpad logo"
                  className="w-6 h-6"
                />
                <span className="text-white font-bold text-lg tracking-tight">
                  launchpad.fun
                </span>
              </div>
            </button>
            <SearchOverlay
              triggerButton={
                <PillButton theme="ghost" icon="ph--magnifying-glass-bold" className="text-white text-sm px-4 py-2 bg-[#0B0F13] backdrop-blur-sm">
                  Search
                  <span className="text-xs text-slate-400 font-mono bg-[#161B22] rounded-md px-1 py-0.5">/</span>
                </PillButton>
              }
            />

          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Cross-Chain Swap Button */}
            <NavSwapButton />



            {/* Rewards Button */}
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              whileTap={{ scale: 0.95 }}
            >
              {isClient && user?.publicKey ? (
                <Link
                  href="/rewards"
                  className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 backdrop-blur-sm rounded-full text-emerald-400 transition-all duration-200 hover:bg-emerald-500/30 hover:border-emerald-500/50 shadow-lg"
                >
                  <span className="iconify ph--gift-bold text-xs transition-all duration-200" />
                  <span className="text-xs font-semibold transition-all duration-200">Rewards</span>
                </Link>
              ) : (
                <button
                  onClick={() => handleNavigation('/login')}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 backdrop-blur-sm rounded-full text-emerald-400 transition-all duration-200 hover:bg-emerald-500/30 hover:border-emerald-500/50 shadow-lg"
                >
                  <span className="iconify ph--gift-bold text-xs transition-all duration-200" />
                  <span className="text-xs font-semibold transition-all duration-200">Rewards</span>
                </button>
              )}
            </motion.div>

            {!isClient ? (
              <div className="w-28 h-8 rounded-full bg-white/5" />
            ) : user?.publicKey ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-3 px-4 py-2 text-slight transition-all duration-200 group"
                >
                  {/* SOL Balance */}
                  <Link href={user ? getProfileUrl(user) : '#'}
                    className="flex items-center gap-2 transition-all duration-200">

                    <img
                      src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
                      alt="SOL"
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold text-emerald-400">
                      {user?.walletBalance === 0 ? '0' :
                        user?.walletBalance && user.walletBalance < 0.001 ? Math.floor(user.walletBalance * 10000) / 10000 :
                          user?.walletBalance && user.walletBalance < 1 ? Math.floor(user.walletBalance * 1000) / 1000 :
                            user?.walletBalance && user.walletBalance < 10 ? Math.floor(user.walletBalance * 100) / 100 :
                              user?.walletBalance && user.walletBalance < 100 ? Math.floor(user.walletBalance * 10) / 10 :
                                user?.walletBalance ? Math.floor(user.walletBalance).toLocaleString() : '0'}
                    </span>

                  </Link>

                  {/* Divider */}
                  <div className="w-px h-4 bg-slate-600/50"></div>

                  {/* User Profile */}
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href={user ? getProfileUrl(user) : '#'} className="flex items-center gap-2 transition-all duration-200">
                      <img
                        src={getUserDisplayIcon(user?.displayIcon)}
                        alt={user ? getDisplayName(user) : 'User'}
                        className="w-6 h-6 rounded-full shrink-0 object-cover"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slight leading-tight">
                          {user ? getDisplayName(user) : 'User'}
                        </span>
                        {!user?.isWalletOnly && (
                          <span className="text-[10px] text-[#949EA9] leading-tight">
                            @{user ? (user.twitterUsername || user.walletDisplayName) : 'user'}
                          </span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-fit h-6 rounded-full text-[#949EA9] hover:text-red-500 bg-[#0B0F13]/80 transition-all duration-200"
                  >
                    <span className="iconify ph--sign-out-bold text-sm" />
                  </button>
                </div>
              </div>
            ) : !ready ? (
              // Show loading state only when Privy is not ready
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2 px-3 py-2 w-28 backdrop-blur-sm rounded-full text-slight">
                  <div className="w-2 h-2 border-2 border-[#3ce3ab] border-t-transparent rounded-full animate-spin" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={() => handleNavigation('/login')}
                  className="flex items-center justify-center gap-2 px-3 py-2 w-28 backdrop-blur-sm rounded-full text-slight transition-all duration-200 hover:bg-white/[7%]"
                >
                  <span className="iconify ph--user-circle-bold" />
                  <span className="text-sm font-semibold">Log in</span>
                </button>
              </motion.div>
            )}

            {/* Launch Button */}
            <motion.div
              key="launch"
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              whileTap={{ scale: 0.99 }}
              className="cursor-pointer"
              onClick={() => handleNavigation('/launch')}
            >
              <PillButton
                theme="ghost"
                size="md"
                icon="ph--plus-bold"
                className="w-28 font-bold cursor-pointer bg-[#0B0F13]"
              >
                Launch
              </PillButton>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
