import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ContactActionLink({
  href,
  children,
  ariaLabel,
  external = false,
  primary = false,
  className,
}: {
  href: string;
  children: ReactNode;
  ariaLabel: string;
  external?: boolean;
  primary?: boolean;
  className?: string;
}) {
  return (
    <a
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-center text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust',
        primary ? 'bg-trust text-white hover:bg-emerald-800' : 'border border-line bg-white text-ink hover:bg-emerald-50',
        className,
      )}
      href={href}
      rel={external ? 'noopener noreferrer' : undefined}
      target={external ? '_blank' : undefined}
    >
      {children}
    </a>
  );
}
