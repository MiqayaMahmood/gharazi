'use client';

import { cn } from '@/lib/utils';

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={cn('min-h-11 rounded-md px-4 py-2 text-sm font-semibold capitalize text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust', value === tab && 'bg-trust text-white')}
          onClick={() => onChange(tab)}
          type="button"
        >
          {tab.replace('-', ' ')}
        </button>
      ))}
    </div>
  );
}
