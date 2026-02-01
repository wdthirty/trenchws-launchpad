import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { HolderAddressTag } from '../HolderTag';
import { HolderInfo } from './utils';
import { formatReadablePercentChange } from '@/lib/format/number';
import { ReadableNumber } from '@/components/ui/ReadableNumber';
import { TraderAddress } from '../../TraderAddress';
import { TraderIndicators } from '../../TraderIndicators';

export const columns: ColumnDef<HolderInfo>[] = [
  {
    accessorKey: 'address',
    size: 140,
    header: () => {
      return <div className="flex gap-x-1.5 py-0.5 text-left text-xs text-slate-400 tracking-wide">{`Address`}</div>;
    },
    cell: function Cell({ row }) {
      return (
        <div className="flex items-center gap-x-1.5 min-w-0">
          <span className="text-xs text-emerald tabular-nums tracking-tighter text-slgith flex-shrink-0">
            {row.original.index}
          </span>
          <div className="flex items-center min-w-0 flex-1">
            <Link
              href={`https://solscan.io/account/${row.original.address}`}
              target="_blank"
              prefetch={false}
              className="group-hover/row:underline"
            >
              <TraderAddress
                variant="regular"
                chars={4}
                address={row.original.address}
                className="flex-row-reverse text-left text-xs truncate"
              />
            </Link>
            <HolderAddressTag address={row.original.address} tags={row.original.tags} />
            <TraderIndicators address={row.original.address} className="pl-1" />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'percentage',
    size: 70,
    header: () => <div className="text-left text-xs text-slate-400 tracking-wide">{`Supply`}</div>,
    cell: ({ row }) => {
      return (
        <div className="truncate text-left font-medium text-xs">
          {formatReadablePercentChange(
            row.original.percentage === undefined ? undefined : row.original.percentage / 100,
            { hideSign: 'positive' }
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'amount',
    size: 70,
    header: ({ table }) => {
      const symbol = table.options.meta?.symbol || 'Amount';
      const truncatedSymbol = symbol && symbol.length > 10 ? symbol.substring(0, 10) + '...' : symbol || 'Amount';
      return <div className="text-left text-xs text-slate-400 tracking-wide">{truncatedSymbol}</div>;
    },
    cell: ({ row }) => {
      return (
        <div className="text-left">
          <ReadableNumber
            className="truncate text-left font-medium text-xs"
            num={row.original.amount}
            format="compact"
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'balance',
    size: 70,
    header: () => <div className="text-left text-xs text-slate-400 tracking-wide">{`USD`}</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.original.balance?.toString() ?? '0');

      return (
        <div className="mt-1 flex h-full flex-col justify-center text-left font-medium">
          <ReadableNumber className="block text-xs truncate" num={amount} format="compact" prefix="$" />
        </div>
      );
    },
  },
];
