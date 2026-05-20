import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm', className)} {...props}>{children}</select>;
}
