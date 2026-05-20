'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/state';
import { useCurrentUser } from '@/lib/query/hooks';

export function ProtectedContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-black">Login required</h1>
        <p className="mt-2 text-sm text-muted">Sign in with OTP to view saved items, messages, notifications, and dashboard activity.</p>
        <Button className="mt-6" href={`/login?next=${encodeURIComponent(pathname)}`} asChild>
          Continue with OTP
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
}
