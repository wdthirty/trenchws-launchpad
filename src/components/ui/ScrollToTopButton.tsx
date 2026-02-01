import React from 'react';
import { cn } from '@/lib/utils';

interface ScrollToTopButtonProps {
  show: boolean;
  onClick: () => void;
  className?: string;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ 
  show, 
  onClick, 
  className = "" 
}) => {
  if (!show) return null;

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "absolute bottom-20 right-4 z-10 w-12 h-12 bg-[#0B0F13]/50 backdrop-blur-sm border border-slate-600/30 hover:bg-white/[7%] hover:border-white/50 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 opacity-0 font-medium group",
          className
        )}
        style={{
          animation: 'fadeIn 0.3s ease-out forwards'
        }}
        aria-label="Scroll to top"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-200 hover:scale-110"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default ScrollToTopButton;
