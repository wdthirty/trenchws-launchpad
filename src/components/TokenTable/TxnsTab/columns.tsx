import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

import { DateMode } from './datemode';
import { Tx } from '../../Explore/types';
import { CurrentAge } from './CurrentAge';
import { intlDate } from '@/lib/format/date';
import { ReadableNumber } from '../../ui/ReadableNumber';
import { TruncatedAddress } from '../../TruncatedAddress/TruncatedAddress';
import { ExternalLink } from '../../ui/ExternalLink';
import { TableCell } from '../../Table';
import { TableRow } from '../../Table';
import { Skeleton } from '../../ui/Skeleton';
import ExternalIcon from '@/icons/ExternalIcon';

export const columns: ColumnDef<Tx>[] = [
  {
    accessorKey: 'timestamp',
    size: 45,
    header: () => <div className="text-xs text-slate-400 tracking-wide">{`Age`}</div>,
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-x-1 truncate text-left font-medium" translate="no">
          <div className="text-slate-400">
            <CurrentAge date={new Date(row.original.timestamp)} />
          </div>
        </div>
      );
    },
  },
  // {
  //   accessorKey: 'type',
  //   size: 45,
  //   header: () => <div className="text-center text-xs text-slate-400 tracking-wide max-lg:hidden">{`Type`}</div>,
  //   cell: ({ row }) => {
  //     return (
  //       <Badge
  //         variant={row.original.type === 'buy' ? 'green' : 'red'}
  //         className="text-center max-lg:hidden"
  //       >
  //         {row.original.type}
  //       </Badge>
  //     );
  //   },
  // },
  {
    accessorKey: 'mcap',
    size: 70,
    header: () => <div className="text-left text-xs text-slate-400 tracking-wide">{`MC`}</div>,
    cell: ({ row, table }) => {
      const currentMarketCap = table.options.meta?.marketCap;
      const circSupply = table.options.meta?.circSupply;
      
      // Calculate market cap at the time of this transaction
      // If we have circulating supply, use transaction price * circ supply
      // Otherwise fall back to current market cap
      const transactionMarketCap = circSupply && row.original.usdPrice 
        ? row.original.usdPrice * circSupply 
        : currentMarketCap;
      
      return (
        <div className="text-left">
          <ReadableNumber
            format="compact"
            className="font-medium"
            num={transactionMarketCap}
            prefix="$"
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'usdVolume',
    size: 75,
    header: () => <div className="text-left text-xs text-slate-400 tracking-wide">{`USD`}</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('usdVolume'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);

      return <div className="text-left font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'amount',
    size: 70,
    header: ({ table }) => {
      const symbol = table.options.meta?.symbol || 'Coins';
      const truncatedSymbol = symbol.length > 10 ? symbol.substring(0, 10) + '...' : symbol;
      return <div className="text-left text-xs text-slate-400 tracking-wide">{truncatedSymbol}</div>;
    },
    cell: ({ row }) => {
      return (
        <div className="text-left">
          <ReadableNumber format="compact" className="font-medium" num={row.original.amount} />
        </div>
      );
    },
  },
  {
    accessorKey: 'traderAddress',
    size: 100,
    header: () => <div className="text-left text-xs text-slate-400 tracking-wide">{`Address`}</div>,
    cell: ({ row, table }) => {
      return (
        <div className="flex items-center gap-x-1.5 text-left text-slight">
          <div className="flex items-center gap-x-1">
            <TruncatedAddress
              className={cn(
                "max-w-[8ch] truncate text-left font-medium",
                {
                  'text-emerald-400': row.original.type === 'buy',
                  'text-rose-400': row.original.type === 'sell',
                }
              )}
              address={row.original.traderAddress}
              charsStart={3}
              charsEnd={3}
            />
            {row.original.traderAddress === table.options.meta?.walletAddress ? (
              <span className="px-1 text-xs bg-slate-600 text-slate-300 rounded">
                {`You`}
              </span>
            ) : null}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'txHash',
    size: 20,
    header: () => '',
    cell: ({ row }) => {
      return (
        <ExternalLink
          className={cn(
            {
              'text-emerald-400': row.original.type === 'buy',
              'text-rose-400': row.original.type === 'sell',
            }
          )}
          href={`https://solscan.io/tx/${row.original.txHash}`}
        >
          <ExternalIcon height={12} width={12} />
        </ExternalLink>
      );
    },
  },
];

const SKELETON_COUNT = 5;

export const SkeletonTableRows: React.FC = () => {
  return (
    <>
      {new Array(SKELETON_COUNT).fill(0).map((_, i) => (
        <SkeletonTableRow key={i} index={i} />
      ))}
    </>
  );
};

const SkeletonTableRow: React.FC<{ index: number }> = ({ index }) => {
  const opacity = Math.max(0, 1 - index / SKELETON_COUNT);
  return (
    <TableRow
      style={{
        opacity,
      }}
    >
      {/* Date / Age */}
      <TableCell>
        <Skeleton className="h-5 w-12" />
      </TableCell>

      {/* Market Cap */}
      <TableCell>
        <Skeleton className="ml-auto h-5 w-10" />
      </TableCell>

      {/* Usd Volume */}
      <TableCell>
        <Skeleton className="ml-auto h-5 w-10" />
      </TableCell>

      {/* Asset Volume */}
      <TableCell>
        <Skeleton className="ml-auto h-5 w-10" />
      </TableCell>

      {/* Trader */}
      <TableCell className="max-sm:hidden">
        <Skeleton className="ml-auto h-5 w-20" />
      </TableCell>
    </TableRow>
  );
};
