import React from 'react';
import { cn } from '@/lib/utils';

type ExternalLinkProps = React.ComponentPropsWithoutRef<'a'>;

export const ExternalLink: React.FC<ExternalLinkProps> = ({ className, children, ...props }) => {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-1 text-slate-300 hover:text-white', className)}
      {...props}
    >
      {children}
    </a>
  );
};

export default ExternalLink;


