import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { notUndefined, useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { useIsMobile } from '@/hooks/useIsMobile';

const ROW_HEIGHT = 32;

declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    symbol: string | undefined;
    walletAddress: string | undefined;
    marketCap: number | undefined;
    circSupply: number | undefined;
  }
}

type HolderTableProps<TData, TValue> = {
  symbol?: string | undefined;
  columns: ColumnDef<TData, TValue>[];
  data?: TData[];
};

export function HolderTable<TData, TValue>({ symbol, columns, data }: HolderTableProps<TData, TValue>) {
  // const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const isMobile = useIsMobile();

  // Please refer to https://tanstack.com/table/latest/docs/faq#how-do-i-stop-infinite-rendering-loops
  // for rendering optimisations
  const table = useReactTable({
    // Data
    data: data ?? [],
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
      symbol,
      walletAddress: undefined,
      marketCap: undefined,
      circSupply: undefined,
    },
  });

  const { rows } = table.getRowModel();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Function to find the actual scrollable container
  const getScrollElement = useCallback(() => {
    if (!parentRef.current) return null;
    
    // Look for the overflow-auto container that's the main scroll container
    let scrollContainer = parentRef.current;
    while (scrollContainer) {
      if (scrollContainer.classList.contains('overflow-auto')) {
        return scrollContainer as HTMLDivElement;
      }
      scrollContainer = scrollContainer.parentElement as HTMLDivElement;
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

  return (
    <>
      <div className="flex flex-col h-full">
        <div ref={parentRef} className="flex-1">
          <div
            ref={tableRef}
            style={{
              height: `${Math.max(virtualizer.getTotalSize(), ROW_HEIGHT * Math.max(rows.length, 3))}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <Table className="text-sm w-full table-fixed">
              <TableHeader className="sticky top-0 z-10 shadow-lg">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} isSticky>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          style={{ width: header.getSize() }}
                          className={cn({
                            'max-xs:hidden': header.id === 'amount',
                          })}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody style={{ minHeight: `${ROW_HEIGHT * Math.max(rows.length, 3)}px` }}>
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
                          style={{
                            height: `${virtualRow.size}px`,
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn({
                                'max-xs:hidden': cell.column.id === 'amount',
                              })}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-slate-400 py-8">
                      No holders found
                    </TableCell>
                  </TableRow>
                )}

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
    </>
  );
}
