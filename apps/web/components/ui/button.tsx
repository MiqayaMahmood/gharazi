import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  asChild?: boolean;
  href?: string;
  children: ReactNode;
};

export function Button({ className, variant = 'primary', asChild, href, children, ...props }: ButtonProps) {
  const styles = cn(
    'inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-trust disabled:cursor-not-allowed disabled:opacity-60',
    variant === 'primary' && 'bg-trust text-white hover:bg-emerald-800',
    variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-emerald-50',
    variant === 'ghost' && 'bg-transparent text-ink hover:bg-emerald-50',
    className,
  );

  if (asChild && href) return <Link className={styles} href={href}>{children}</Link>;
  return <button className={styles} {...props}>{children}</button>;
}
