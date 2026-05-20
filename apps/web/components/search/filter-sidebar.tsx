'use client';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { AreaAutocomplete } from './area-autocomplete';

export type FilterValues = {
  q: string;
  cityId: string;
  location: string;
  propertyTypeId: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  bedrooms: string;
  bathrooms: string;
  furnishedStatus: string;
  possessionStatus: string;
  legalStatus: string;
  floor: string;
  corner: boolean;
  parking: boolean;
  verifiedOnly: boolean;
  sort: string;
};

export const defaultFilters: FilterValues = {
  q: '',
  cityId: '',
  location: '',
  propertyTypeId: '',
  minPrice: '',
  maxPrice: '',
  minArea: '',
  maxArea: '',
  bedrooms: '',
  bathrooms: '',
  furnishedStatus: '',
  possessionStatus: '',
  legalStatus: '',
  floor: '',
  corner: false,
  parking: false,
  verifiedOnly: false,
  sort: 'relevant',
};

export function FilterSidebar({ values, onChange, onApply, projectMode = false }: { values: FilterValues; onChange: (values: FilterValues) => void; onApply: () => void; projectMode?: boolean }) {
  const set = (key: keyof FilterValues, value: string | boolean) => onChange({ ...values, [key]: value });
  return (
    <aside className="grid gap-4 rounded-lg border border-line bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-muted" htmlFor="keyword">Keyword</label>
        <Input id="keyword" value={values.q} onChange={(event) => set('q', event.target.value)} placeholder="Search by title or area" />
      </div>
      <AreaAutocomplete value={values.location} onChange={(value) => set('location', value)} />
      <div>
        <label className="mb-1 block text-xs font-bold text-muted" htmlFor="type">{projectMode ? 'Project type' : 'Property type'}</label>
        <Select id="type" value={values.propertyTypeId} onChange={(event) => set('propertyTypeId', event.target.value)}>
          <option value="">Any</option>
          <option value="house">House</option>
          <option value="apartment">Apartment</option>
          <option value="plot">Plot</option>
          <option value="commercial">Commercial</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Minimum price" value={values.minPrice} onChange={(event) => set('minPrice', event.target.value)} placeholder="Min price" />
        <Input aria-label="Maximum price" value={values.maxPrice} onChange={(event) => set('maxPrice', event.target.value)} placeholder="Max price" />
      </div>
      {!projectMode ? (
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Bedrooms" value={values.bedrooms} onChange={(event) => set('bedrooms', event.target.value)} placeholder="Beds" />
          <Input aria-label="Bathrooms" value={values.bathrooms} onChange={(event) => set('bathrooms', event.target.value)} placeholder="Baths" />
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input checked={values.verifiedOnly} onChange={(event) => set('verifiedOnly', event.target.checked)} type="checkbox" />
        Verified only
      </label>
      <div>
        <label className="mb-1 block text-xs font-bold text-muted" htmlFor="sort">Sort</label>
        <Select id="sort" value={values.sort} onChange={(event) => set('sort', event.target.value)}>
          <option value="relevant">Most relevant</option>
          <option value="newest">Newest</option>
          <option value="price_low_high">Price low to high</option>
          <option value="price_high_low">Price high to low</option>
          <option value="area_low_high">Area low to high</option>
          <option value="area_high_low">Area high to low</option>
        </Select>
      </div>
      <Button onClick={onApply}>Apply filters</Button>
    </aside>
  );
}

export function DynamicAdvancedFilters({ values, onChange, projectMode = false }: { values: FilterValues; onChange: (values: FilterValues) => void; projectMode?: boolean }) {
  const set = (key: keyof FilterValues, value: string | boolean) => onChange({ ...values, [key]: value });
  const type = values.propertyTypeId;
  const isPlot = type.includes('plot');
  const isCommercial = ['commercial', 'office', 'shop', 'warehouse', 'factory'].some((item) => type.includes(item));
  const isApartment = type.includes('apartment') || type.includes('flat');
  const isHouse = !projectMode && (!type || type.includes('house') || (!isPlot && !isCommercial && !isApartment));

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <Input aria-label="Keyword" value={values.q} onChange={(event) => set('q', event.target.value)} placeholder="Keyword, society, block" />
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Maximum size" value={values.maxArea} onChange={(event) => set('maxArea', event.target.value)} placeholder="Size to" />
        <Select aria-label="Sort" value={values.sort} onChange={(event) => set('sort', event.target.value)}>
          <option value="relevant">Most relevant</option>
          <option value="newest">Newest</option>
          <option value="price_low_high">Price low to high</option>
          <option value="price_high_low">Price high to low</option>
          <option value="area_low_high">Area low to high</option>
          <option value="area_high_low">Area high to low</option>
        </Select>
      </div>
      {!projectMode && (isHouse || isApartment) ? (
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Bedrooms" value={values.bedrooms} onChange={(event) => set('bedrooms', event.target.value)} placeholder="Beds" />
          <Input aria-label="Bathrooms" value={values.bathrooms} onChange={(event) => set('bathrooms', event.target.value)} placeholder="Baths" />
        </div>
      ) : null}
      {!projectMode && (isHouse || isApartment) ? (
        <Select aria-label="Furnished status" value={values.furnishedStatus} onChange={(event) => set('furnishedStatus', event.target.value)}>
          <option value="">Any furnishing</option>
          <option value="furnished">Furnished</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi_furnished">Semi furnished</option>
        </Select>
      ) : null}
      {(isApartment || isCommercial) && !projectMode ? <Input aria-label="Floor" value={values.floor} onChange={(event) => set('floor', event.target.value)} placeholder="Floor" /> : null}
      {(isPlot || isCommercial || projectMode) ? (
        <Select aria-label="Possession status" value={values.possessionStatus} onChange={(event) => set('possessionStatus', event.target.value)}>
          <option value="">Any possession</option>
          <option value="ready">Ready</option>
          <option value="under_construction">Under construction</option>
          <option value="possession">Possession</option>
          <option value="file">File</option>
        </Select>
      ) : null}
      {projectMode ? (
        <Select aria-label="Legal status" value={values.legalStatus} onChange={(event) => set('legalStatus', event.target.value)}>
          <option value="">Any legal status</option>
          <option value="approved">Approved</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </Select>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
        <input checked={values.verifiedOnly} onChange={(event) => set('verifiedOnly', event.target.checked)} type="checkbox" />
        Verified only
      </label>
      {(isPlot || isCommercial) && !projectMode ? (
        <label className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
          <input checked={values.corner} onChange={(event) => set('corner', event.target.checked)} type="checkbox" />
          Corner
        </label>
      ) : null}
      {(isHouse || isApartment || isCommercial) && !projectMode ? (
        <label className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
          <input checked={values.parking} onChange={(event) => set('parking', event.target.checked)} type="checkbox" />
          Parking
        </label>
      ) : null}
    </div>
  );
}
