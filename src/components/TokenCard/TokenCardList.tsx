import { QueryStatus } from '@tanstack/react-query';
import React, { forwardRef, memo, useCallback, useEffect, useRef, useState } from 'react';

import { Pool, TokenListTimeframe } from '../Explore/types';
import { useDataStream } from '@/contexts/DataStreamProvider';
import { cn } from '@/lib/utils';
import { TokenCard, TokenCardSkeleton } from './TokenCard';
import { TopPerformerTokenCard } from './TopPerformerTokenCard';
import { TopPerformerTokenCardSkeleton } from './TopPerformerTokenCardSkeleton';
import { useIsMobile } from '@/hooks/useIsMobile';

import { AnimatePresence } from 'framer-motion';

type TokenCardListProps = React.ComponentPropsWithoutRef<'div'> & {
  data?: Pool[];
  status: QueryStatus;
  timeframe: TokenListTimeframe;
  trackPools?: boolean;
  emptyState?: React.ReactNode;
  showMiniChart?: boolean;
  onQuickBuy?: (pool: Pool) => void;
};

export const TokenCardList = memo(
  forwardRef<HTMLDivElement, TokenCardListProps>(
    ({ timeframe, data, status, trackPools, emptyState, showMiniChart = false, onQuickBuy, className, ...props }, ref) => {
      const [visiblePoolIds, setVisiblePoolIds] = useState<Set<string>>(() => new Set());
      const poolElements = useRef(new Map<string, Element>());
      const observer = useRef<IntersectionObserver | undefined>(undefined);
      const isMobile = useIsMobile();

      useEffect(() => {
        const newObserver = new IntersectionObserver(
          (entries) => {
            setVisiblePoolIds((prev) => {
              const next = new Set(prev);
              entries.forEach((entry) => {
                const poolId = (entry.target as HTMLElement).dataset.poolId;
                if (!poolId) return;

                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                entry.isIntersecting ? next.add(poolId) : next.delete(poolId);
              });
              return next;
            });
          },
          {
            rootMargin: '200px', // 200px ahead/behind
            threshold: 0.1,
          }
        );
        observer.current = newObserver;

        return () => newObserver.disconnect();
      }, []);

      const rowRef = useCallback((element: HTMLElement | null, poolId: string) => {
        if (!element) {
          poolElements.current.delete(poolId);
          return;
        }

        poolElements.current.set(poolId, element);
        observer.current?.observe(element);
      }, []);

      const { subscribePools, unsubscribePools } = useDataStream();
      useEffect(() => {
        if (!trackPools) return undefined;

        // Only subscribe to visible pools to reduce WebSocket load
        const poolIds = Array.from(visiblePoolIds);
        if (!poolIds.length) return undefined;
        
        // Debounce subscriptions to avoid rapid subscribe/unsubscribe
        const timeoutId = setTimeout(() => {
          subscribePools(poolIds);
        }, 100);
        
        return () => {
          clearTimeout(timeoutId);
          unsubscribePools(poolIds);
        };
      }, [trackPools, visiblePoolIds, subscribePools, unsubscribePools]);

      return (
        <div
          ref={ref}
          className={cn('relative overflow-y-auto no-scrollbar pb-[200px]', className)}
          style={{ height: '100%' }}
          {...props}
        >
          {status === 'loading' ? (
            <div 
              className="grid gap-2"
              style={showMiniChart ? {} : { 
                gridTemplateColumns: isMobile 
                  ? '1fr' 
                  : 'repeat(auto-fit, minmax(400px, 1fr))' 
              }}
            >
              {showMiniChart ? (
                // Top performers skeleton
                <>
                  <TopPerformerTokenCardSkeleton />
                  <TopPerformerTokenCardSkeleton />
                  <TopPerformerTokenCardSkeleton />
                  <TopPerformerTokenCardSkeleton />
                  <TopPerformerTokenCardSkeleton />
                  <TopPerformerTokenCardSkeleton />
                </>
              ) : (
                // New coins skeleton
                <>
                  <TokenCardSkeleton />
                  <TokenCardSkeleton />
                  <TokenCardSkeleton />
                  <TokenCardSkeleton />
                  <TokenCardSkeleton />
                  <TokenCardSkeleton />
                </>
              )}
            </div>
          ) : !data || data.length === 0 ? (
            (emptyState ?? (
              <div className="col-span-full py-12 text-center text-sm">
                <div className="text-dim">coins_not_found</div>
              </div>
            ))
          ) : (
            <div 
              className={`grid gap-2`}
              style={showMiniChart ? {} : { 
                gridTemplateColumns: isMobile 
                  ? '1fr' 
                  : 'repeat(auto-fit, minmax(400px, 1fr))' 
              }}
            >
              <AnimatePresence>
                {data.map((pool, index) => 
                  showMiniChart ? (
                    <TopPerformerTokenCard
                      key={pool.baseAsset.id}
                      pool={pool}
                      timeframe={timeframe}
                      rowRef={rowRef}
                      index={index}
                    />
                  ) : (
                    <TokenCard
                      key={pool.baseAsset.id}
                      pool={pool}
                      timeframe={timeframe}
                      rowRef={rowRef}
                      index={index}
                      showMiniChart={showMiniChart}
                      onQuickBuy={onQuickBuy}
                      isTopPerformer={showMiniChart}
                    />
                  )
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      );
    }
  )
);
