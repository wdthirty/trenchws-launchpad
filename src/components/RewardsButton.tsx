import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

type RewardsButtonProps = {
  className?: string;
};

export const RewardsButton = ({ className }: RewardsButtonProps) => {
  return (
    <Link href="/rewards" className="flex items-center justify-center gap-1 no-underline">
              <Button
          asChild
          className={cn(
            "relative overflow-hidden py-1.5 px-2.5 font-medium text-black bg-primary transition border border-primary",
            className
          )}
        >
        <span>rewards</span>
      </Button>
    </Link>
  );
};
