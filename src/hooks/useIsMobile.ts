import { useState, useEffect } from 'react';

export const useIsMobile = (width = 768) => {
  const [isMobile, setIsMobile] = useState<boolean>(true); // Default to mobile to prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    
    function updateSize() {
      const desktopQuery = window.matchMedia(`(min-width: ${width}px)`);
      setIsMobile(!desktopQuery.matches);
    }

    // Initial check
    updateSize();

    // Listen to resize events
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width]);

  // Return the default value during SSR and initial render to prevent hydration mismatch
  if (!hasMounted) {
    return true; // Default to mobile during SSR
  }

  return isMobile;
};

export const useIsSmallDesktop = (maxWidth = 1624) => {
  const [isSmallDesktop, setIsSmallDesktop] = useState<boolean>(false); // Default to false to prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);

    const updateSize = () => {
      setIsSmallDesktop(mediaQuery.matches);
    };

    updateSize(); // initial check
    mediaQuery.addEventListener('change', updateSize); // modern syntax

    return () => mediaQuery.removeEventListener('change', updateSize);
  }, [maxWidth]);

  // Return the default value during SSR and initial render to prevent hydration mismatch
  if (!hasMounted) {
    return false; // Default to false during SSR
  }

  return isSmallDesktop;
};

