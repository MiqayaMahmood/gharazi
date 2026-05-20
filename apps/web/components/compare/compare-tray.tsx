'use client';

import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/stores/ui-store';

export function CompareTray() {
  const listingIds = useCompareStore((state) => state.listingIds);
  const projectIds = useCompareStore((state) => state.projectIds);
  const total = listingIds.length + projectIds.length;
  if (!total) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 shadow-soft">
      <p className="text-sm font-bold">{total} item{total > 1 ? 's' : ''} selected for comparison</p>
      <div className="flex gap-2">
        {listingIds.length ? <Button asChild href="/compare/listings" variant="secondary">Compare listings</Button> : null}
        {projectIds.length ? <Button asChild href="/compare/projects" variant="secondary">Compare projects</Button> : null}
      </div>
    </div>
  );
}
