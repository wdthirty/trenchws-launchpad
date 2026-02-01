import { memo } from 'react';
import { HolderContentTable } from './HolderContent';

export const HoldersTab: React.FC = memo(() => {
  return (
    <HolderContentTable />
  );
});

HoldersTab.displayName = 'HoldersTab';
