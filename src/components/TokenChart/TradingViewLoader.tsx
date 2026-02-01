import { useEffect, useState } from 'react';
import Spinner from '../Spinner/Spinner';

type TradingView = {
  widget: any;
};

declare global {
  interface Window {
    TradingView: TradingView;
  }
}

interface TradingViewLoaderProps {
  children: (TradingView: TradingView) => React.ReactNode;
  fallback?: React.ReactNode;
}

const TRADING_VIEW_DOMAIN = 'https://static.jup.ag';

export const TradingViewLoader: React.FC<TradingViewLoaderProps> = ({ 
  children, 
  fallback = <Spinner /> 
}) => {
  const [TradingView, setTradingView] = useState<TradingView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTradingView = () => {
      try {
        // Check if TradingView is already loaded
        if (window.TradingView) {
          setTradingView(window.TradingView);
          setIsLoading(false);
          return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="charting_library.js"]');
        if (existingScript) {
          // Script is loading, wait for it with reduced polling interval
          const checkLoaded = () => {
            if (window.TradingView) {
              setTradingView(window.TradingView);
              setIsLoading(false);
            } else {
              setTimeout(checkLoaded, 50); // Reduced from 100ms
            }
          };
          // Reduced delay before starting to check
          setTimeout(checkLoaded, 25); // Reduced from 50ms
          return;
        }

        // Preload the library for better performance
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = `${TRADING_VIEW_DOMAIN}/tv/charting_library/charting_library.js`;
        document.head.appendChild(link);

        // Load TradingView library from CDN
        const script = document.createElement('script');
        script.src = `${TRADING_VIEW_DOMAIN}/tv/charting_library/charting_library.js`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          // Reduced delay to ensure the library is fully initialized
          setTimeout(() => {
            if (window.TradingView) {
              setTradingView(window.TradingView);
              setIsLoading(false);
            } else {
              setError('TradingView library loaded but not available');
              setIsLoading(false);
            }
          }, 50); // Reduced from 100ms
        };
        
        script.onerror = () => {
          setError('Failed to load TradingView library');
          setIsLoading(false);
        };
        
        document.head.appendChild(script);
      } catch (err) {
        console.error('Failed to load TradingView library:', err);
        setError('Failed to load chart library');
        setIsLoading(false);
      }
    };

    // Start loading immediately
    loadTradingView();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <p>Failed to load chart</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !TradingView) {
    return <>{fallback}</>;
  }

  return <>{children(TradingView)}</>;
};