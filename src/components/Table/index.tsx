import { cn } from '@/lib/utils';
import * as React from 'react';

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn('w-full caption-bottom', className)} {...props} />
  )
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('whitespace-nowrap', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

type TableBodyProps = React.ComponentProps<'tbody'>;
const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn('font-medium', className)} {...props} />
));
TableFooter.displayName = 'TableFooter';

type TableRowProps = React.ComponentProps<'tr'> & {
  // We use shadow to display the bottom border if this is a sticky row
  isSticky?: boolean;
  // Animation props for entry animation
  animationIndex?: number;
};
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, isSticky, animationIndex = 0, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'h-8 transition-all duration-200 hover:bg-[#0B0F13]/40 border-b border-slate-800/30 bg-[#0B0F13] animate-table-row',
        className
      )}
      style={{
        animationDelay: `${(animationIndex || 0) * 50}ms`
      }}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-8 whitespace-nowrap px-2 text-left text-xs font-semibold text-slate-300 bg-[#0B0F13] backdrop-blur-md border-b border-slate-700/30',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.memo(
  React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
      <td
        ref={ref}
        // NOTE: table-cell required for `colSpan` attribute to work
        className={cn('table-cell whitespace-nowrap px-2 py-1 text-xs text-slate-200', className)}
        {...props}
      />
    )
  )
);
TableCell.displayName = 'TableCell';

export { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow };
