import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/contexts/UserProvider';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { toast } from 'sonner';
import PillButton from '@/components/ui/PillButton';
import TelegramIcon from '@/icons/TelegramIcon';
import XIcon from '@/icons/XIcon';
import EmailIcon from '@/icons/EmailIcon';
import { getUserDisplayIcon } from '@/lib/utils/user-icon';
import { getProfileUrl, getDisplayName } from '@/lib/utils/profile-url';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const user = useUser();
  const { logout } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();

  // Handle logout with proper external wallet disconnection
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
      onClose();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
    }
  };

  const navigationItems = [
    {
      label: 'Profile & Wallet',
      href: user ? getProfileUrl(user) : '/profile',
      icon: 'ph--user-circle-bold'
    },
    {
      label: 'Cross-Chain Bridge',
      href: '/bridge',
      icon: 'ph--bridge-bold'
    },
    {
      label: 'Rewards',
      href: '/rewards',
      icon: 'ph--gift-bold'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-[#0B0F13]/50 backdrop-blur-sm z-[45] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            className="fixed left-0 top-0 h-full w-80 bg-[#0B0F13]/95 backdrop-blur-md z-[55] md:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex flex-col h-full">
              {/* Header with Profile */}
              <div className="px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#0B0F13]/80 backdrop-blur-sm flex items-center justify-center">
                    <img
                      src={getUserDisplayIcon(user?.displayIcon)}
                      alt={user ? getDisplayName(user) : 'User'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-lg">
                        {user ? getDisplayName(user) : 'User'}
                      </span>
                    </div>
                    {!user?.isWalletOnly && (
                      <div className="text-slate-400 text-sm">
                        @{user ? (user.twitterUsername || user.walletDisplayName) : 'username'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Launch Button */}
              <div className="px-4 pt-2 pb-4">
                <Link href="/launch" onClick={onClose}>
                  <PillButton
                    theme="ghost"
                    icon="ph--plus-bold"
                    className="w-full justify-center bg-[#0B0F13]"
                  >
                    Launch Coin
                  </PillButton>
                </Link>
              </div>

              {/* Navigation Items */}
              <div className="flex-1">
                <nav className="space-y-3">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-4 px-4 py-3 text-white hover:bg-[#161B22]/50 transition-colors group"
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <span className={`iconify ${item.icon} text-xl transition-transform`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.label}</div>
                      </div>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Logout Button */}
              <div className="px-4 py-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-center text-red-400 hover:text-red-300 transition-colors text-sm"
                >
                  Log out
                  <span className="iconify ph--sign-out-bold text-sm" />
                </button>
              </div>

              {/* Footer Section */}
              <div className="px-4 py-4 border-t border-slate-600/20">
                {/* Copyright */}
                <div className="text-xs text-slate-400 mb-3 tracking-tighter">
                  &copy; launchpad.fun v1.2
                </div>

                {/* Social Links */}
                <div className="flex gap-3 mb-3">
                  <a href="mailto:contact@launchpad.fun" className="group">
                    <EmailIcon fill="currentColor" className="text-slate-400 group-hover:text-white transition-colors duration-200 w-5 h-5" />
                  </a>
                  <a href="https://x.com/Launchpadfun" target="_blank" rel="noopener noreferrer" className="group">
                    <XIcon fill="currentColor" className="text-slate-400 group-hover:text-white transition-colors duration-200 w-5 h-5" />
                  </a>
                  <a href="https://t.me/Launchpadfun" target="_blank" rel="noopener noreferrer" className="group">
                    <TelegramIcon fill="currentColor" className="text-slate-400 group-hover:text-white transition-colors duration-200 w-5 h-5" />
                  </a>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <a href="https://docs.launchpad.fun" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors duration-200">
                    Docs
                  </a>
                  <Link href="/tos" className="text-slate-400 hover:text-white transition-colors duration-200" onClick={onClose}>
                    ToS
                  </Link>
                  <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors duration-200" onClick={onClose}>
                    Privacy
                  </Link>
                  <Link href="/fees" className="text-slate-400 hover:text-white transition-colors duration-200" onClick={onClose}>
                    Fees
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
