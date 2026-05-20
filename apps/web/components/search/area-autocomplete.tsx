'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useAreaAutocomplete } from '@/lib/query/hooks';

export function AreaAutocomplete({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  const { data = [] } = useAreaAutocomplete(value);
  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-bold text-muted" htmlFor="area-search">Location</label>
      <Input id="area-search" value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setFocused(true)} placeholder="City, area, society" />
      {focused && data.length > 0 ? (
        <div className="absolute z-20 mt-2 w-full rounded-md border border-line bg-white p-1 shadow-soft">
          {data.map((area) => (
            <button key={area.id} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-emerald-50" type="button" onMouseDown={() => { onChange(`${area.name}, ${area.cityName ?? ''}`); setFocused(false); }}>
              <span className="font-semibold">{area.name}</span>
              <span className="ml-2 text-muted">{area.cityName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
