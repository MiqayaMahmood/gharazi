'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Sheet } from '@/components/ui/sheet';
import { useCities } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';
import { defaultFilters, DynamicAdvancedFilters, MobileFilterPanel, type FilterValues } from './filter-sidebar';

type SearchTab = 'buy' | 'rent' | 'projects';

type GlobalSearchBarProps = {
  mode?: 'navigate' | 'controlled';
  initialTab?: SearchTab;
  values?: FilterValues;
  onChange?: (values: FilterValues) => void;
  onSearch?: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  sticky?: boolean;
  compact?: boolean;
};

const emptyValues = defaultFilters;

export function GlobalSearchBar({
  mode = 'navigate',
  initialTab = 'buy',
  values,
  onChange,
  onSearch,
  onOpenFilters,
  activeFilterCount,
  sticky = true,
  compact = false,
}: GlobalSearchBarProps) {
  const router = useRouter();
  const cities = useCities();
  const [tab, setTab] = useState<SearchTab>(initialTab);
  const [localValues, setLocalValues] = useState<FilterValues>(values ?? emptyValues);
  const [expanded, setExpanded] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const current = values ?? localValues;
  const projectMode = tab === 'projects';
  const visibleFilterCount = activeFilterCount ?? Object.entries(current).filter(([, value]) => Boolean(value) && value !== 'relevant').length;

  function set(key: keyof FilterValues, value: string | boolean) {
    const next = { ...current, [key]: value };
    setLocalValues(next);
    onChange?.(next);
  }

  function submit() {
    if (mode === 'controlled' && tab === initialTab) {
      onSearch?.();
      return;
    }
    const base = tab === 'projects' ? '/projects' : `/${tab}`;
    const query = filterQuery(current, projectMode);
    router.push(`${base}${query ? `?${query}` : ''}`);
  }

  function change(next: FilterValues) {
    setLocalValues(next);
    onChange?.(next);
  }

  function openMobileFilters() {
    if (onOpenFilters) onOpenFilters();
    else setMobileSheetOpen(true);
  }

  return (
    <section className={cn(sticky && 'sticky top-14 z-30 border-b border-line bg-paper/95 backdrop-blur sm:top-16', !sticky && 'bg-paper')}>
      <div className="mx-auto max-w-7xl px-4 py-2 lg:py-3">
        <div className="rounded-lg border border-line bg-white p-2 shadow-soft lg:p-3">
          <div className="grid gap-2 xl:hidden">
            <Tabs tabs={['buy', 'rent', 'projects']} value={tab} onChange={(value) => setTab(value as SearchTab)} />
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
              <Input
                aria-label="Search properties"
                value={current.q}
                onChange={(event) => set('q', event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
                placeholder="Area or keyword"
              />
              <Button onClick={submit}>Search</Button>
              <Button aria-label={`Open filters${visibleFilterCount ? `, ${visibleFilterCount} active` : ''}`} className="px-3" onClick={openMobileFilters} type="button" variant="secondary">
                Filters{visibleFilterCount ? ` (${visibleFilterCount})` : ''}
              </Button>
            </div>
          </div>
          <div className="hidden gap-3 xl:grid xl:grid-cols-[260px_1fr_auto] xl:items-end">
            <Tabs tabs={['buy', 'rent', 'projects']} value={tab} onChange={(value) => setTab(value as SearchTab)} />
            <div className="grid gap-2 xl:grid-cols-[0.9fr_1.1fr_1fr_0.8fr_1fr]">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted" htmlFor="global-city">City</label>
                <Select id="global-city" value={current.cityId} onChange={(event) => set('cityId', event.target.value)}>
                  <option value="">Any city</option>
                  {cities.data?.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </Select>
              </div>
              <Input aria-label="Area or society" value={current.location} onChange={(event) => set('location', event.target.value)} placeholder="Area / society optional" />
              <div>
                <label className="mb-1 block text-xs font-bold text-muted" htmlFor="global-property-type">{projectMode ? 'Project type' : 'Property type'}</label>
                <Select id="global-property-type" value={current.propertyTypeId} onChange={(event) => set('propertyTypeId', event.target.value)}>
                  <option value="">Any type</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="plot">Plot</option>
                  <option value="commercial">Commercial</option>
                  <option value="office">Office</option>
                  <option value="shop">Shop</option>
                  <option value="warehouse">Warehouse</option>
                </Select>
              </div>
              <Input aria-label="Size" value={current.minArea} onChange={(event) => set('minArea', event.target.value)} placeholder="Size from" />
              <div className="grid grid-cols-2 gap-2">
                <Input aria-label="Minimum price" value={current.minPrice} onChange={(event) => set('minPrice', event.target.value)} placeholder="Min price" />
                <Input aria-label="Maximum price" value={current.maxPrice} onChange={(event) => set('maxPrice', event.target.value)} placeholder="Max price" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button onClick={submit}>Search</Button>
              <Button onClick={() => setExpanded((value) => !value)} type="button" variant="secondary">
                {expanded ? 'Hide filters' : 'More filters'}
              </Button>
            </div>
          </div>
          {expanded ? (
            <div className={cn('mt-3 hidden border-t border-line pt-3 xl:block', compact && 'text-sm')}>
              <DynamicAdvancedFilters projectMode={projectMode} values={current} onChange={(next) => {
                setLocalValues(next);
                onChange?.(next);
              }} />
            </div>
          ) : null}
        </div>
      </div>
      {mode === 'navigate' ? (
        <Sheet open={mobileSheetOpen} title={projectMode ? 'Project filters' : 'Property filters'} onClose={() => setMobileSheetOpen(false)}>
          <MobileFilterPanel projectMode={projectMode} values={current} onChange={change} />
          <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-2 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] pt-3">
            <Button onClick={() => change(defaultFilters)} type="button" variant="secondary">Clear</Button>
            <Button onClick={() => { submit(); setMobileSheetOpen(false); }} type="button">Apply filters</Button>
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}

export function filterQuery(filters: FilterValues, projectMode = false) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (!value || value === 'relevant') return;
    if (key === 'propertyTypeId') {
      const param = propertyTypeSearchParam(String(value), projectMode);
      query.set(param.key, param.value);
      return;
    }
    query.set(key, String(value));
  });
  return query.toString();
}

export function propertyTypeSearchParam(value: string, projectMode = false) {
  if (isUuid(value)) return { key: projectMode ? 'projectTypeId' : 'propertyTypeId', value };
  return { key: projectMode ? 'projectTypeCode' : 'propertyTypeCode', value };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
