'use client';

import { cn } from '@/lib/utils';

export function Sheet({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 h-full w-full cursor-default" aria-label="Close" onClick={onClose} type="button" />
      <div className={cn('absolute bottom-0 left-0 right-0 max-h-[86vh] overflow-auto rounded-t-xl bg-paper p-4 shadow-soft')}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="rounded-md px-3 py-2 text-sm font-semibold" onClick={onClose} type="button">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
