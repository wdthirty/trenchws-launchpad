import { motion, AnimatePresence } from 'framer-motion';
import Spinner from '@/components/Spinner/Spinner';

interface AuthOverlayProps {
  isVisible: boolean;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ isVisible }) => {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-[#0B0F13]/95 backdrop-blur-md flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647, // Maximum possible z-index value
          }}
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => e.preventDefault()}
        >
          <motion.div 
            className="flex flex-col items-center space-y-6 p-8 max-w-sm mx-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Logo */}
            <motion.div 
              className="w-16 h-16"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <img 
                src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
                alt="Launchpad Logo" 
                className="w-full h-full object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </motion.div>

            {/* Spinner */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Spinner 
                width={32} 
                height={32} 
                baseColor="#10B981" 
                spinnerColor="#34D399"
              />
            </motion.div>

            {/* Text - Fixed to prevent re-rendering issues */}
            <motion.div 
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-white leading-tight">
                Logging you in
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Please wait while we log you in. This may take a few moments.
              </p>
            </motion.div>

            {/* Progress dots */}
            <motion.div 
              className="flex space-x-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-emerald-500 rounded-full"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
