import TelegramIcon from '@/icons/TelegramIcon';
import XIcon from '@/icons/XIcon';
import EmailIcon from '@/icons/EmailIcon';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SolPriceDisplay } from '../SolPriceDisplay';

export const Footer = () => {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="hidden md:flex fixed bottom-0 left-0 right-0 w-full h-7 items-center justify-between px-4 text-sm text-slate-400 bg-[#0B0F13]/80 backdrop-blur-sm z-50 border-t border-slate-600/20"
      style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 50
      }}
    >
      {/* Left side */}
      <div className="flex gap-4 flex-row items-center tracking-tighter text-xs text-slate-400">
        <span>&copy; launchpad.fun v1.2</span>
        <div className="hidden md:flex">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
          >
            <SolPriceDisplay />
          </motion.div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex text-xs gap-4 items-center text-slate-400">
        <a href="mailto:contact@launchpad.fun" className="hidden sm:flex group">
          <EmailIcon fill="currentColor" className="text-slate-400 group-hover:text-white transition-colors duration-200"/>
        </a>
        <a href="https://x.com/Launchpadfun" target="_blank" rel="noopener noreferrer" className="group">
          <XIcon fill="currentColor" className="text-slate-400 group-hover:text-white transition-colors duration-200"/>
        </a>
        <a href="https://t.me/Launchpadfun" target="_blank" rel="noopener noreferrer" className="group">
          <TelegramIcon fill="currentColor" className="text-slate-400 group-hover:text-white transition-colors duration-200"/>
        </a>
        <a href="https://docs.launchpad.fun" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors duration-200">Docs</a>
        <Link href="/tos" className="text-slate-400 hover:text-white transition-colors duration-200">ToS</Link>
        <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors duration-200">Privacy</Link>
        <Link href="/fees" className="text-slate-400 hover:text-white transition-colors duration-200">Fees</Link>
      </div>
    </motion.footer>
  );
};
