'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCurrentUser } from '@/lib/query/hooks';

export function AuthActionLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();

  if (user) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      disabled={isLoading}
      onClick={() => {
        if (!isLoading) {
          const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : pathname;
          router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        }
      }}
    >
      {children}
    </button>
  );
}
