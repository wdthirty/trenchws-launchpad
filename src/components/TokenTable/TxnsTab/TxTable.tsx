import {
  ColumnDef,
  ColumnFiltersState,
  RowData,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { notUndefined, useVirtualizer } from '@tanstack/react-virtual';
import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../Table';
import { cn } from '@/lib/utils';
import { isHoverableDevice } from '@/lib/device';
import { SkeletonTableRows } from './columns';
import { useUser } from '@/contexts/UserProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Tx } from '../../Explore/types';

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    walletAddress: string | undefined;
    symbol: string | undefined;
    marketCap: number | undefined;
    circSupply: number | undefined;
  }
}

const ROW_HEIGHT = 32;

type TxTableProps = {
  symbol?: string | undefined;
  marketCap?: number | undefined;
  circSupply?: number | undefined;
  columns: ColumnDef<Tx, any>[];
  data: Tx[];
  hasNextPage: boolean | undefined;
  isFetching: boolean;
  fetchNextPage: () => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
};

export function TxTable({
  symbol,
  marketCap,
  circSupply,
  columns,
  data,
  hasNextPage,
  isFetching,
  fetchNextPage,
  paused,
  setPaused,
}: TxTableProps) {
  // const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { publicKey } = useUser();
  const walletAddress = useMemo(() => publicKey?.toBase58(), [publicKey]);
  const isMobile = useIsMobile();

  // Please refer to https://tanstack.com/table/latest/docs/faq#how-do-i-stop-infinite-rendering-loops
  // for rendering optimisations
  const table = useReactTable({
    // Data
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // // Sorting
    // onSortingChange: setSorting,
    // getSortedRowModel: getSortedRowModel(),
    // Filtering
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      // sorting,
      columnFilters,
    },
    meta: {
      walletAddress,
      symbol,
      marketCap,
      circSupply,
    },
  });

  const { rows } = table.getRowModel();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Function to find the actual scrollable container
  const getScrollElement = useCallback(() => {
    if (!parentRef.current) return null;
    
    // Look for the overflow-auto container that's the main scroll container
    let scrollContainer: HTMLElement | null = parentRef.current;
    while (scrollContainer) {
      if (scrollContainer.classList.contains('overflow-auto')) {
        return scrollContainer;
      }
      scrollContainer = scrollContainer.parentElement;
    }
    
    // Fallback to parent element if no overflow-auto container found
    return parentRef.current;
  }, []);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    // Memoisation is REQUIRED to optimise rendering
    // @see https://tanstack.com/virtual/v3/docs/api/virtualizer#getitemkey
    getItemKey: useCallback((index: number) => rows[index]?.id ?? index, [rows]),
  });
  const items = virtualizer.getVirtualItems();
  const [before, after] =
    items.length > 0
      ? [
          notUndefined(items[0]).start - virtualizer.options.scrollMargin,
          virtualizer.getTotalSize() - notUndefined(items[items.length - 1]).end,
        ]
      : [0, 0];

  const tableRef = useRef<HTMLDivElement>(null);
  const onScroll = useCallback(() => {
    const tableEl = tableRef.current;
    if (!tableEl?.parentElement) {
      return;
    }
    
    // Find the actual scrollable container
    let scrollContainer = tableEl.parentElement;
    while (scrollContainer) {
      if (scrollContainer.classList.contains('overflow-auto')) {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }
    
    if (!scrollContainer) {
      // Fallback to parent element if no overflow-auto container found
      scrollContainer = tableEl.parentElement;
    }
    
    const { scrollHeight, scrollTop, clientHeight } = scrollContainer;
    if (scrollHeight - scrollTop - clientHeight > 3 * ROW_HEIGHT) {
      return;
    }
    if (isFetching || !hasNextPage) {
      return;
    }
    fetchNextPage();
  }, [isFetching, hasNextPage, fetchNextPage]);

  useEffect(() => {
    const tableEl = tableRef.current;
    if (!tableEl?.parentElement) {
      return;
    }
    
    // Find the actual scrollable container
    let scrollContainer = tableEl.parentElement;
    while (scrollContainer) {
      if (scrollContainer.classList.contains('overflow-auto')) {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }
    
    if (!scrollContainer) {
      // Fallback to parent element if no overflow-auto container found
      scrollContainer = tableEl.parentElement;
    }
    
    scrollContainer.addEventListener('scroll', onScroll, {
      passive: true,
    });
    return () => {
      scrollContainer.removeEventListener('scroll', onScroll);
    };
  }, [onScroll]);

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={parentRef} 
        className="flex-1"
      >
        <div
          ref={tableRef}
          style={{
            height: `${Math.max(virtualizer.getTotalSize(), ROW_HEIGHT * Math.max(rows.length, 3))}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <Table className="text-sm">
            <TableHeader className="sticky top-0 z-10 shadow-lg">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} isSticky>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{ width: header.getSize() }}
                        className={cn({})}
                      >
                        {header.id === 'timestamp' ? (
                          flexRender(header.column.columnDef.header, header.getContext())
                        ) : header.id === 'returnAmount' ? (
                          <div className="text-right">{symbol}</div>
                        ) : !header.isPlaceholder ? (
                          flexRender(header.column.columnDef.header, header.getContext())
                        ) : null}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody
              className="w-full"
              style={{ minHeight: `${ROW_HEIGHT * Math.max(rows.length, 3)}px` }}
              onMouseEnter={() => {
                // Disable when first fetching
                if (data.length === 0 && isFetching) {
                  return;
                }
                // iOS triggers, but we don't want to show the hover
                if (!isHoverableDevice()) {
                  return;
                }
                setPaused(true);
              }}
              onMouseLeave={() => setPaused(false)}
            >
              {before > 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ height: before }} />
                </tr>
              ) : null}

              {items.length > 0 ? (
                <>
                  {items.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) {
                      return null;
                    }
                    return (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className={cn(
                          "cursor-pointer hover:bg-slate-600/30 transition-all duration-200",
                          {
                            'text-emerald-400': row.original.type === 'buy',
                            'text-rose-400': row.original.type === 'sell',
                          }
                        )}
                        style={{
                          height: `${virtualRow.size}px`,
                        }}
                        onClick={() => {
                          const traderAddress = row.getValue('traderAddress') as string;
                          if (traderAddress) {
                            window.open(`https://solscan.io/account/${traderAddress}`, '_blank');
                          }
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn({
                              'text-emerald-400': row.original.type === 'buy',
                              'text-rose-400': row.original.type === 'sell',
                            })}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}

                  {/* Next page loading indicator */}
                  {isFetching ? (
                    <MessageRow colSpan={columns.length}>Loading transactions...</MessageRow>
                  ) : null}
                </>
              ) : isFetching ? (
                <>
                  {/* First page loading indicator */}
                  <SkeletonTableRows />
                </>
              ) : hasNextPage === false ? (
                <>
                  {/* No more txs  */}
                  <MessageRow colSpan={columns.length}>No more transactions</MessageRow>
                </>
              ) : null}

              {after > 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ height: after }} />
                </tr>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

type MessageRowProps = {
  colSpan: number;
};
const MessageRow: React.FC<PropsWithChildren<MessageRowProps>> = ({ colSpan, children }) => {
  return (
    <tr>
      <td className="table-cell h-8 text-slate-400" colSpan={colSpan}>
        <div className="flex items-center justify-center text-xs">{children}</div>
      </td>
    </tr>
  );
};
