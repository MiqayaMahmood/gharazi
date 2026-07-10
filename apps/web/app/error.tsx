'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/state';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (process.env.NODE_ENV === 'development') console.error('Unhandled rendering error', error); }, [error]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <ErrorState title="Something went wrong" message="The page could not be loaded." />
      <div className="mt-6">
        <div className="flex flex-wrap gap-3"><Button onClick={reset}>Try again</Button><Button onClick={() => window.location.reload()} variant="secondary">Reload</Button><Button asChild variant="ghost"><Link href="/">Back to Home</Link></Button></div>
      </div>
    </div>
  );
}
