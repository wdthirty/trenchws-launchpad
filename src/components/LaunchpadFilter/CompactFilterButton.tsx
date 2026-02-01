import React from 'react';
import { useLaunchpadFilter } from '@/contexts/LaunchpadFilterProvider';
import { appThemes } from '../TokenHeader/themes';
import PillButton from '@/components/ui/PillButton';

export const CompactFilterButton: React.FC = () => {
  const { launchpadFilters, openModal } = useLaunchpadFilter();

  const enabledCount = launchpadFilters.filter(f => f.enabled).length;

  return (
    <div className="pointer-events-none" title="Filter by launchpad">
      <PillButton
        theme="blue"
        icon="ph--funnel-bold"
        onClick={openModal}
        className="pointer-events-auto relative"
      >
        Launchpads
        <span className={`w-5 h-5 text-sm font-medium ${appThemes.blue.solid} text-white rounded-full text-center transition-all duration-200`}>
          {enabledCount}
        </span>
      </PillButton>
    </div>
  );
};
