'use client';

import { useState } from 'react';

export function HelpTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line bg-white text-xs font-black text-muted hover:text-ink"
        aria-label="Help"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open ? (
        <span role="tooltip" className="absolute left-0 top-7 z-20 w-64 rounded-md border border-line bg-white p-3 text-xs font-semibold leading-5 text-ink shadow-soft">
          {text}
        </span>
      ) : null}
    </span>
  );
}
