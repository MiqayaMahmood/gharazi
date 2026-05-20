'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/state';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <ErrorState title="Something went wrong" message="The page could not be loaded." />
      <div className="mt-6">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
