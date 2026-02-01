import { useTokenAddress, useTokenInfo } from '@/hooks/queries';
import { useInfiniteQuery } from '@tanstack/react-query';
import { memo, useEffect, useMemo, useState } from 'react';
import { ApeQueries } from '../../Explore/queries';
import { TxTable } from './TxTable';
import { columns } from './columns';
import { Tx } from '../../Explore/types';
import ChartShimmer from '@/components/ui/ChartShimmer';

export const TxnsTab: React.FC<{ paused: boolean; setPaused: (paused: boolean) => void }> = memo(({ paused, setPaused }) => {
  const tokenId = useTokenAddress();
  const { data: symbol } = useTokenInfo((data) => data?.baseAsset.symbol);
  const { data: marketCap } = useTokenInfo((data) => data?.baseAsset.mcap);
  const { data: circSupply } = useTokenInfo((data) => data?.baseAsset.circSupply);

  const { data, isFetching, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    ...ApeQueries.tokenTxs({ id: tokenId || '' }),
    enabled: !!tokenId,
  });

  const allRows = useMemo(
    () => (data && data.pages ? data.pages.flatMap((d) => d?.txs ?? []) : []),
    [data]
  );

  // TODO: optimize re-renders, seems like tables re-render unnecessarily while paused
  const [pausedPage, setPausedPage] = useState<Tx[]>([]);

  useEffect(() => {
    if (paused) {
      return;
    }
    setPausedPage(data?.pages[0]?.txs ?? []);
  }, [data, paused]);

  const pausedRows = useMemo(() => {
    const fetchedPages =
      data && data.pages.length > 1 ? data.pages.slice(1).flatMap((d) => d?.txs ?? []) : [];
    return [...pausedPage, ...fetchedPages];
  }, [data, pausedPage]);

  // Don't render if tokenId is not available
  if (!tokenId) {
    return null;
  }

  // Show loading shimmer while fetching initial data
  // if (isLoading) {
  //   return <ChartShimmer height="h-full" lines={12} />;
  // }

  return (
    <TxTable
      symbol={symbol}
      marketCap={marketCap}
      circSupply={circSupply}
      data={paused ? pausedRows : allRows}
      columns={columns}
      fetchNextPage={fetchNextPage}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      paused={paused}
      setPaused={setPaused}
    />
  );
});

TxnsTab.displayName = 'TxnsTab';
