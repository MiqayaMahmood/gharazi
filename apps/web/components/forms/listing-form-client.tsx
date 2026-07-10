'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Stepper } from './stepper';
import { MediaEditor } from './media-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Badge, InfoChip } from '@/components/ui/badge';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { addListingMedia, archiveListing, createListing, publishListing, updateListing, type ListingFormPayload, type MediaPayload } from '@/lib/api/supply';
import { useAmenities, useAreas, useCities, usePropertyTypes, usePurposes } from '@/lib/query/hooks';
import { getDashboardListingEditHref } from '@/lib/routes';
import type { Listing } from '@/types/marketplace';

const steps = ['Purpose', 'Location', 'Details', 'Price', 'Amenities', 'Media', 'Contact', 'Review'];

const schema = z.object({
  purposeId: z.string().min(1, 'Choose a purpose'),
  propertyTypeId: z.string().min(1, 'Choose a property type'),
  cityId: z.string().min(1, 'Choose a city'),
  areaId: z.string().min(1, 'Choose an area'),
  title: z.string().min(10, 'Use a descriptive title').max(180),
  description: z.string().min(30, 'Add a useful description').max(5000),
  priceAmount: z.coerce.number().min(1, 'Enter price'),
  areaValue: z.coerce.number().min(1, 'Enter area'),
  areaUnit: z.string().min(1, 'Choose unit'),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  floorNumber: z.coerce.number().optional(),
  totalFloors: z.coerce.number().optional(),
  furnishedStatus: z.string().optional(),
  possessionStatus: z.string().optional(),
  addressLine: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  amenityIds: z.array(z.string()).optional(),
});

type ListingFormValues = z.infer<typeof schema>;

export function ListingFormClient({ initialListing }: { initialListing?: Listing }) {
  const [step, setStep] = useState(0);
  const [media, setMedia] = useState<MediaPayload[]>(() => mediaDefaults(initialListing));
  const router = useRouter();
  const queryClient = useQueryClient();
  const purposes = usePurposes();
  const propertyTypes = usePropertyTypes();
  const cities = useCities();
  const amenities = useAmenities();
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: listingDefaults(initialListing),
  });
  useEffect(() => {
    form.reset(listingDefaults(initialListing));
    setMedia(mediaDefaults(initialListing));
  }, [form, initialListing]);
  const cityId = form.watch('cityId');
  const areas = useAreas(cityId);
  async function saveListing(values: ListingFormValues) {
    const payload = cleanPayload(values);
    const listing = initialListing ? await updateListing(initialListing.id, payload) : await createListing(payload);
    await Promise.all(media.filter((item) => !item.id && item.url && item.storageKey).map((item) => addListingMedia(listing.id, item)));
    return listing;
  }
  const saveMutation = useMutation({
    mutationFn: saveListing,
    onSuccess: (listing) => {
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      router.push(getDashboardListingEditHref(listing.id));
    },
    onError: (error) => logMutationError('save listing', error),
  });
  const publishMutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      const listing = await saveListing(values);
      try {
        return await publishListing(listing.id);
      } catch (error) {
        throw new Error(`Draft saved (${listing.publicId ?? listing.id}) but publish failed: ${errorMessage(error)}`);
      }
    },
    onSuccess: (listing) => {
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      router.push(getDashboardListingEditHref(listing.id));
    },
    onError: (error) => logMutationError('publish listing', error),
  });
  const archiveMutation = useMutation({ mutationFn: () => archiveListing(initialListing?.id ?? ''), onSuccess: () => router.push('/dashboard/listings') });
  const values = form.watch();
  const summary = useMemo(() => Object.entries(values).filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)), [values]);
  const hasUnsavedChanges = form.formState.isDirty || mediaChanged(media, initialListing);

  async function next() {
    const fieldsByStep: Array<Array<keyof ListingFormValues>> = [
      ['purposeId', 'propertyTypeId'],
      ['cityId', 'areaId'],
      ['title', 'description'],
      ['priceAmount', 'areaValue', 'areaUnit'],
      [],
      [],
      [],
      [],
    ];
    const ok = await form.trigger(fieldsByStep[step]);
    if (ok) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function cancel() {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved listing changes?')) return;
    router.push('/dashboard/listings');
  }

  return (
    <form className="grid gap-6" onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}>
      <Stepper steps={steps} current={step} />
      <Card className="p-5">
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Purpose" help="Choose whether this property is for sale or rent. This controls where buyers or tenants find it." error={form.formState.errors.purposeId?.message}><Select {...form.register('purposeId')}><option value="">Select purpose</option>{purposes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Property type" help="Pick the closest property category so search filters and similar listings work correctly." error={form.formState.errors.propertyTypeId?.message}><Select {...form.register('propertyTypeId')}><option value="">Select type</option>{propertyTypes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="City" help="City and area power local search, map placement, and similar listing recommendations." error={form.formState.errors.cityId?.message}><Select {...form.register('cityId')}><option value="">Select city</option>{cities.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Area" help="Select the most specific area available. Use address line for block, street, or nearby landmark." error={form.formState.errors.areaId?.message}><Select {...form.register('areaId')}><option value="">Select area</option>{areas.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Address line"><Input {...form.register('addressLine')} placeholder="Street, block, or nearby landmark" /></Field>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid gap-4">
            <Field label="Title" error={form.formState.errors.title?.message}><Input {...form.register('title')} placeholder="10 Marla verified house near park" /></Field>
            <Field label="Description" error={form.formState.errors.description?.message}><textarea className="min-h-36 w-full rounded-md border border-line bg-white p-3 text-sm" {...form.register('description')} /></Field>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Bedrooms"><Input type="number" {...form.register('bedrooms')} /></Field>
              <Field label="Bathrooms"><Input type="number" {...form.register('bathrooms')} /></Field>
              <Field label="Floor"><Input type="number" {...form.register('floorNumber')} /></Field>
              <Field label="Total floors"><Input type="number" {...form.register('totalFloors')} /></Field>
              <Field label="Furnished"><Select {...form.register('furnishedStatus')}><option value="unfurnished">Unfurnished</option><option value="semi_furnished">Semi furnished</option><option value="furnished">Furnished</option></Select></Field>
              <Field label="Possession"><Select {...form.register('possessionStatus')}><option value="ready">Ready</option><option value="under_construction">Under construction</option><option value="leased">Leased</option><option value="other">Other</option></Select></Field>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Price" help="Enter the asking price in PKR. Do not include commas or currency symbols." error={form.formState.errors.priceAmount?.message}><Input type="number" {...form.register('priceAmount')} /></Field>
            <Field label="Area" help="Use the actual property size. Pick the matching unit so comparisons stay accurate." error={form.formState.errors.areaValue?.message}><Input type="number" {...form.register('areaValue')} /></Field>
            <Field label="Area unit" help="Marla and kanal are common for houses and plots; sq ft or sq yd may fit apartments and commercial units." error={form.formState.errors.areaUnit?.message}><Select {...form.register('areaUnit')}><option value="marla">Marla</option><option value="kanal">Kanal</option><option value="sq ft">Sq ft</option><option value="sq yd">Sq yd</option></Select></Field>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="grid gap-4">
            <StepHelp text="Amenities help users filter listings. Select only features that are actually available." />
            <div className="grid gap-3 md:grid-cols-2">
              {amenities.data?.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-2 rounded-md border border-line p-3 text-sm font-semibold">
                  <input type="checkbox" value={amenity.id} {...form.register('amenityIds')} />
                  {amenity.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {step === 5 ? <div className="grid gap-4"><StepHelp text="Upload or add image URLs from your storage. Mark one image as cover; it appears first in cards and galleries." /><MediaEditor items={media} onChange={setMedia} entityType="listing" entityId={initialListing?.id} /></div> : null}
        {step === 6 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contact name"><Input {...form.register('contactName')} /></Field>
            <Field label="Contact phone"><Input {...form.register('contactPhone')} /></Field>
          </div>
        ) : null}
        {step === 7 ? (
          <div className="grid gap-4">
            <StepHelp text="Review all details before publishing. Save draft keeps changes private until the listing is published or approved." />
            <div className="flex flex-wrap gap-2">{summary.map(([key, value]) => <InfoChip key={key}>{key}: {Array.isArray(value) ? value.length : String(value)}</InfoChip>)}</div>
            <Badge>{initialListing ? 'Edit mode' : 'New draft'}</Badge>
            <p className="text-sm text-muted">Save keeps the listing as draft when backend status requires moderation. Publish will call the backend publish transition.</p>
          </div>
        ) : null}
      </Card>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
          <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {initialListing ? <Button type="button" variant="ghost" onClick={() => archiveMutation.mutate()}>Archive</Button> : null}
          <Button type="submit" variant="secondary" disabled={saveMutation.isPending}>Save draft</Button>
          {step < steps.length - 1 ? <Button type="button" onClick={next}>Next</Button> : <Button type="button" onClick={form.handleSubmit((data) => publishMutation.mutate(data))} disabled={publishMutation.isPending || saveMutation.isPending}>Publish</Button>}
        </div>
      </div>
      {saveMutation.isError || publishMutation.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {errorMessage(saveMutation.error ?? publishMutation.error)}
        </div>
      ) : null}
    </form>
  );
}

function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      <span className="inline-flex items-center gap-2">{label}{help ? <HelpTooltip text={help} /> : null}</span>
      {children}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function StepHelp({ text }: { text: string }) {
  return <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted"><HelpTooltip text={text} /> {text}</p>;
}

function cleanPayload(values: ListingFormValues): ListingFormPayload {
  return {
    purposeId: values.purposeId,
    propertyTypeId: values.propertyTypeId,
    cityId: values.cityId,
    areaId: values.areaId,
    title: values.title,
    description: values.description,
    priceAmount: values.priceAmount,
    areaValue: values.areaValue,
    areaUnit: values.areaUnit,
    bedrooms: values.bedrooms || undefined,
    bathrooms: values.bathrooms || undefined,
    floorNumber: values.floorNumber || undefined,
    totalFloors: values.totalFloors || undefined,
    furnishedStatus: blankToUndefined(values.furnishedStatus),
    possessionStatus: blankToUndefined(values.possessionStatus),
    addressLine: blankToUndefined(values.addressLine),
    contactName: blankToUndefined(values.contactName),
    contactPhone: blankToUndefined(values.contactPhone),
    amenityIds: values.amenityIds?.length ? values.amenityIds : undefined,
  };
}

function listingDefaults(listing?: Listing): ListingFormValues {
  return {
    purposeId: listing?.purposeId ?? (listing as any)?.purpose?.id ?? '',
    propertyTypeId: listing?.propertyTypeId ?? (listing as any)?.propertyType?.id ?? '',
    cityId: listing?.cityId ?? (listing as any)?.city?.id ?? '',
    areaId: listing?.areaId ?? (listing as any)?.area?.id ?? '',
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    priceAmount: listing?.priceAmount ?? 0,
    areaValue: listing?.areaValue ?? 0,
    areaUnit: listing?.areaUnit ?? 'marla',
    bedrooms: listing?.bedrooms,
    bathrooms: listing?.bathrooms,
    floorNumber: listing?.floorNumber,
    totalFloors: listing?.totalFloors,
    furnishedStatus: listing?.furnishedStatus ?? 'unfurnished',
    possessionStatus: listing?.possessionStatus ?? 'ready',
    addressLine: listing?.addressLine ?? '',
    contactName: listing?.contactName ?? listing?.listerName ?? '',
    contactPhone: listing?.contactPhone ?? '',
    amenityIds: amenityDefaults(listing),
  };
}

function amenityDefaults(listing?: Listing) {
  return listing?.amenities?.map((item: any) => item.amenityId ?? item.amenity?.id ?? item.id).filter(Boolean) ?? [];
}

function mediaDefaults(listing?: Listing): MediaPayload[] {
  const items = listing?.media ?? listing?.images ?? [];
  return items.map((item: any, index) => ({
    id: item.id,
    mediaType: item.mediaType ?? 'image',
    storageKey: item.storageKey ?? '',
    url: item.url ?? '',
    isCover: Boolean(item.isCover),
    sortOrder: item.sortOrder ?? index,
  }));
}

function mediaChanged(media: MediaPayload[], listing?: Listing) {
  return JSON.stringify(media) !== JSON.stringify(mediaDefaults(listing));
}

function blankToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The backend rejected the request. Check required IDs and validation fields.';
}

function logMutationError(action: string, error: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`Failed to ${action}`, error);
  }
}
