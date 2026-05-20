import Link from 'next/link';
import { EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <EmptyState title="Page not found" message="The page may have moved or the listing is no longer available." />
      <div className="mt-6">
        <Button asChild>
          <Link href="/">Back to search</Link>
        </Button>
      </div>
    </div>
  );
}
