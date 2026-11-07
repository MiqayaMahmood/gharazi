'use client';

import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';

export function Sheet({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="absolute inset-0 h-full w-full cursor-default" aria-label={`Close ${title}`} onClick={onClose} tabIndex={-1} type="button" />
      <div ref={panelRef} className={cn('absolute bottom-0 left-0 right-0 max-h-[calc(100dvh-0.5rem)] overflow-auto overscroll-contain rounded-t-xl bg-paper px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-soft')}>
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-line bg-paper pb-3">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          <button ref={closeRef} className="min-h-11 rounded-md px-3 py-2 text-sm font-semibold hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust" onClick={onClose} type="button">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
