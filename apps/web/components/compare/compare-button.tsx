'use client';

import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/stores/ui-store';

export function CompareButton({ type, id }: { type: 'listing' | 'project'; id: string }) {
  const listingIds = useCompareStore((state) => state.listingIds);
  const projectIds = useCompareStore((state) => state.projectIds);
  const addListing = useCompareStore((state) => state.addListing);
  const removeListing = useCompareStore((state) => state.removeListing);
  const addProject = useCompareStore((state) => state.addProject);
  const removeProject = useCompareStore((state) => state.removeProject);
  const selected = type === 'listing' ? listingIds.includes(id) : projectIds.includes(id);

  return (
    <Button
      type="button"
      variant={selected ? 'primary' : 'secondary'}
      onClick={() => {
        if (type === 'listing') selected ? removeListing(id) : addListing(id);
        else selected ? removeProject(id) : addProject(id);
      }}
    >
      {selected ? 'In compare' : 'Compare'}
    </Button>
  );
}
