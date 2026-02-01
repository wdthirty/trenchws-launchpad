import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SearchProvider } from '@/contexts/SearchProvider';
import TopNavigationBar from '@/components/TopNavigationBar';

// Global topbar height constant
export const TOPBAR_HEIGHT = 56;

interface IProps {
  containerClassName?: string;
  pageClassName?: string;
  scrollable?: boolean;
  selectedCoin?: string;
}

const Page: React.FC<React.PropsWithChildren<IProps>> = ({
  containerClassName,
  children,
  pageClassName,
  scrollable = false,
  selectedCoin,
}) => {
  return (
    <SearchProvider>
      <div className={cn('flex min-h-screen flex-col', pageClassName)}>
        <TopNavigationBar scrollable={scrollable} />
        <div className="flex flex-1 w-full" style={{ paddingTop: `${TOPBAR_HEIGHT}px` }}>
          {/* Main Content */}
          <main className="w-full items-center">
            <div className={cn('w-full border-r border-border h-full', containerClassName)}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SearchProvider>
  );
};
export default Page;

