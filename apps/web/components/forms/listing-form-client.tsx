'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { Stepper } from './stepper';
import { MediaEditor, type MediaUploadState } from './media-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Badge, InfoChip } from '@/components/ui/badge';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { addListingMedia, archiveListing, createListing, presignUpload, publishListing, updateListing, type ListingFormPayload, type MediaPayload } from '@/lib/api/supply';
import { useAmenities, useAreas, useCities, usePropertyTypes, usePurposes } from '@/lib/query/hooks';
import { getDashboardListingEditHref } from '@/lib/routes';
import type { Listing } from '@/types/marketplace';
import { getListingCompleteness } from '@/lib/forms/listing-form-utils';

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
  contactName: z.string().max(120, 'Use 120 characters or fewer').optional(),
  contactPhone: z.string().max(32, 'Use 32 characters or fewer').optional(),
  amenityIds: z.array(z.string()).optional(),
});

type ListingFormValues = z.infer<typeof schema>;

export function ListingFormClient({ initialListing }: { initialListing?: Listing }) {
  const [step, setStep] = useState(0);
  const [media, setMedia] = useState<MediaPayload[]>(() => mediaDefaults(initialListing));
  const [mediaUploadStates, setMediaUploadStates] = useState<Record<string, MediaUploadState>>({});
  const createdListingId = useRef<string | undefined>(undefined);
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
    const existingId = initialListing?.id ?? createdListingId.current;
    const listing = existingId ? await updateListing(existingId, payload) : await createListing(payload);
    createdListingId.current = listing.id;
    for (const item of media.filter((entry) => !entry.id && (entry.file || (entry.url && entry.storageKey)))) {
      try {
        await uploadMediaItem(listing.id, item);
      } catch (error) {
        throw new Error(`Draft saved (${listing.publicId ?? listing.id}), but media upload failed: ${errorMessage(error)}`);
      }
    }
    return listing;
  }

  async function uploadMediaItem(listingId: string, item: MediaPayload) {
    const key = item.clientKey ?? item.id ?? String(item.sortOrder ?? 0);
    setMediaUploadStates((current) => ({ ...current, [key]: { status: 'uploading' } }));
    try {
      let uploaded = item;
      if (item.file) {
        const mediaType = item.mediaType === 'video' ? 'video' : item.mediaType === 'floor_plan' ? 'floorplan' : 'image';
        const presigned = await presignUpload({ filename: item.file.name, contentType: item.file.type, entityType: 'listing', entityId: listingId, mediaType });
        const response = await fetch(presigned.uploadUrl, { method: presigned.method, headers: { 'Content-Type': item.file.type }, body: item.file });
        if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
        uploaded = { ...item, storageKey: presigned.storageKey, url: presigned.url };
      }
      if (!uploaded.url || !uploaded.storageKey) throw new Error('Choose a file or provide both a media URL and storage key.');
      const saved = await addListingMedia(listingId, uploaded);
      setMedia((current) => current.map((entry) => entry.clientKey === item.clientKey ? { ...saved, clientKey: item.clientKey, file: undefined } : entry));
      setMediaUploadStates((current) => ({ ...current, [key]: { status: 'uploaded' } }));
      return saved;
    } catch (error) {
      setMediaUploadStates((current) => ({ ...current, [key]: { status: 'error', message: errorMessage(error) } }));
      throw error;
    }
  }

  async function retryMedia(clientKey: string) {
    const listingId = initialListing?.id ?? createdListingId.current;
    const item = media.find((entry) => entry.clientKey === clientKey);
    if (!item) return;
    if (!listingId) {
      setMediaUploadStates((current) => ({ ...current, [clientKey]: { status: 'error', message: 'Save the listing draft before retrying this upload.' } }));
      return;
    }
    await uploadMediaItem(listingId, item).catch(() => undefined);
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
  const completeness = useMemo(() => getListingCompleteness(values, media), [media, values]);
  const hasUnsavedChanges = form.formState.isDirty || mediaChanged(media, initialListing);
  const isSubmitting = saveMutation.isPending || publishMutation.isPending;

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
    const ok = await form.trigger(fieldsByStep[step], { shouldFocus: true });
    if (ok) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function handleInvalid(errors: FieldErrors<ListingFormValues>) {
    const firstField = Object.keys(errors)[0] as keyof ListingFormValues | undefined;
    if (!firstField) return;
    const targetStep = fieldStep(firstField);
    setStep(targetStep);
    window.setTimeout(() => {
      form.setFocus(firstField);
      document.querySelector(`[name="${firstField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function cancel() {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved listing changes?')) return;
    router.push('/dashboard/listings');
  }

  return (
    <form className="grid gap-4 sm:gap-6" noValidate onSubmit={form.handleSubmit((data) => saveMutation.mutate(data), handleInvalid)}>
      <Stepper steps={steps} current={step} />
      <CompletenessIndicator {...completeness} />
      <Card className="p-4 sm:p-5">
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SectionHeading title="Property category and purpose" description="Start with how the property should appear in marketplace searches." />
            <Field required label="Purpose" help="Choose whether this property is for sale or rent. This controls where buyers or tenants find it." error={form.formState.errors.purposeId?.message}><Select {...form.register('purposeId')}><option value="">Select purpose</option>{purposes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field required label="Property type" help="Pick the closest property category so search filters and similar listings work correctly." error={form.formState.errors.propertyTypeId?.message}><Select {...form.register('propertyTypeId')}><option value="">Select type</option>{propertyTypes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SectionHeading title="Location" description="Choose the searchable location, then add an optional landmark or street reference." />
            <Field required label="City" help="City and area power local search, map placement, and similar listing recommendations." error={form.formState.errors.cityId?.message}><Select {...form.register('cityId')}><option value="">Select city</option>{cities.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field required label="Area" help="Select the most specific area available. Use address line for block, street, or nearby landmark." error={form.formState.errors.areaId?.message}><Select {...form.register('areaId')}><option value="">Select area</option>{areas.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Address line"><Input autoComplete="street-address" {...form.register('addressLine')} placeholder="Street, block, or nearby landmark" /></Field>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid gap-4">
            <SectionHeading title="Property specifications" description="Describe only the attributes that apply to this property." />
            <Field required label="Title" error={form.formState.errors.title?.message}><Input autoComplete="off" {...form.register('title')} placeholder="10 Marla verified house near park" /></Field>
            <Field required label="Description" error={form.formState.errors.description?.message}><textarea className="min-h-36 w-full rounded-md border border-line bg-white p-3 text-base sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust" {...form.register('description')} /></Field>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Bedrooms"><Input inputMode="numeric" min="0" type="number" {...form.register('bedrooms')} /></Field>
              <Field label="Bathrooms"><Input inputMode="numeric" min="0" type="number" {...form.register('bathrooms')} /></Field>
              <Field label="Floor"><Input inputMode="numeric" type="number" {...form.register('floorNumber')} /></Field>
              <Field label="Total floors"><Input inputMode="numeric" min="0" type="number" {...form.register('totalFloors')} /></Field>
              <Field label="Furnished"><Select {...form.register('furnishedStatus')}><option value="unfurnished">Unfurnished</option><option value="semi_furnished">Semi furnished</option><option value="furnished">Furnished</option></Select></Field>
              <Field label="Possession"><Select {...form.register('possessionStatus')}><option value="ready">Ready</option><option value="under_construction">Under construction</option><option value="leased">Leased</option><option value="other">Other</option></Select></Field>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="grid gap-4 md:grid-cols-3">
            <SectionHeading title="Price and area" description="Enter numeric values without currency symbols or unit text." />
            <Field required label="Price (PKR)" help="Enter the asking price in PKR. Do not include commas or currency symbols." error={form.formState.errors.priceAmount?.message}><Input inputMode="numeric" min="1" type="number" {...form.register('priceAmount')} /></Field>
            <Field required label="Area" help="Use the actual property size. Pick the matching unit so comparisons stay accurate." error={form.formState.errors.areaValue?.message}><Input inputMode="decimal" min="1" step="any" type="number" {...form.register('areaValue')} /></Field>
            <Field required label="Area unit" help="Marla and kanal are common for houses and plots; sq ft or sq yd may fit apartments and commercial units." error={form.formState.errors.areaUnit?.message}><Select {...form.register('areaUnit')}><option value="marla">Marla</option><option value="kanal">Kanal</option><option value="sq ft">Sq ft</option><option value="sq yd">Sq yd</option></Select></Field>
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
        {step === 5 ? <div className="grid gap-4"><SectionHeading title="Photos and media" description="Add clear, authorized property media. One photo can be marked as the cover." /><StepHelp text="JPEG, PNG, WebP, MP4, and PDF floor plans are supported as applicable. Selected files upload when you save the listing." /><MediaEditor deferUpload items={media} onChange={setMedia} entityType="listing" entityId={initialListing?.id ?? createdListingId.current} uploadStates={mediaUploadStates} onRetry={(clientKey) => void retryMedia(clientKey)} /></div> : null}
        {step === 6 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SectionHeading title="Contact preferences" description="These details remain subject to the existing authenticated contact privacy rules." />
            <Field label="Contact name"><Input autoComplete="name" {...form.register('contactName')} /></Field>
            <Field label="Contact phone"><Input autoComplete="tel" inputMode="tel" type="tel" {...form.register('contactPhone')} placeholder="0300 1234567" /></Field>
            <p className="md:col-span-2 rounded-md border border-line bg-stone-50 p-3 text-sm text-muted">WhatsApp is not enabled automatically from this phone number. The seller API does not yet expose a separate, consent-backed WhatsApp preference.</p>
          </div>
        ) : null}
        {step === 7 ? (
          <div className="grid gap-4">
            <SectionHeading title="Review and submit" description="Check the required details and optional recommendations before saving or publishing." />
            <StepHelp text="Save draft keeps changes private until the listing is published or approved. Completeness recommendations do not change publication rules." />
            <div className="flex flex-wrap gap-2">{summary.map(([key, value]) => <InfoChip key={key}>{key}: {Array.isArray(value) ? value.length : String(value)}</InfoChip>)}</div>
            <Badge>{initialListing ? 'Edit mode' : 'New draft'}</Badge>
            <p className="text-sm text-muted">Save keeps the listing as draft when backend status requires moderation. Publish will call the backend publish transition.</p>
          </div>
        ) : null}
      </Card>
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap justify-between gap-3 border-t border-line bg-paper/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={cancel}>Cancel</Button>
          <Button type="button" variant="secondary" disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
        </div>
        <div className="flex flex-1 flex-wrap justify-end gap-2 sm:flex-initial">
          {initialListing ? <Button type="button" variant="ghost" disabled={isSubmitting || archiveMutation.isPending} onClick={() => archiveMutation.mutate()}>Archive</Button> : null}
          <Button type="submit" variant="secondary" disabled={isSubmitting}>{saveMutation.isPending ? 'Saving…' : 'Save draft'}</Button>
          {step < steps.length - 1 ? <Button type="button" disabled={isSubmitting} onClick={next}>Next</Button> : <Button type="button" onClick={form.handleSubmit((data) => publishMutation.mutate(data), handleInvalid)} disabled={isSubmitting}>{publishMutation.isPending ? 'Publishing…' : 'Publish'}</Button>}
        </div>
      </div>
      {saveMutation.isError || publishMutation.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
          {errorMessage(saveMutation.error ?? publishMutation.error)}
        </div>
      ) : null}
    </form>
  );
}

function Field({ label, help, error, required = false, children }: { label: string; help?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  const generatedId = useId();
  const fieldId = `listing-${generatedId.replace(/:/g, '')}`;
  const errorId = `${fieldId}-error`;
  const control = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, {
    id: (children.props as { id?: string }).id ?? fieldId,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
  }) : children;
  return (
    <label className="grid gap-1 text-sm font-bold" htmlFor={(control as ReactElement<{ id?: string }>)?.props?.id ?? fieldId}>
      <span className="inline-flex flex-wrap items-center gap-2">{label}<span className="text-xs font-medium text-muted">({required ? 'required' : 'optional'})</span>{help ? <HelpTooltip text={help} /> : null}</span>
      {control}
      {error ? <span className="text-xs text-red-700" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="md:col-span-full"><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div>;
}

function CompletenessIndicator({ percent, requiredComplete, requiredTotal, recommendedComplete, recommendedTotal, requiredReady }: ReturnType<typeof getListingCompleteness>) {
  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft sm:p-4" aria-label="Listing completeness">
      <div className="flex items-center justify-between gap-3"><div><p className="font-black">Listing completeness</p><p className="mt-1 text-xs text-muted">Required: {requiredComplete}/{requiredTotal} · Recommended: {recommendedComplete}/{recommendedTotal}</p></div><strong className="text-trust">{percent}%</strong></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label="Listing completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full rounded-full bg-trust transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} /></div>
      <p className="mt-2 text-xs text-muted">{requiredReady ? 'Required information is ready. Optional recommendations can improve buyer confidence.' : 'Complete the required fields before saving or publishing.'}</p>
    </section>
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

function fieldStep(field: keyof ListingFormValues) {
  if (field === 'purposeId' || field === 'propertyTypeId') return 0;
  if (field === 'cityId' || field === 'areaId' || field === 'addressLine') return 1;
  if (['title', 'description', 'bedrooms', 'bathrooms', 'floorNumber', 'totalFloors', 'furnishedStatus', 'possessionStatus'].includes(field)) return 2;
  if (field === 'priceAmount' || field === 'areaValue' || field === 'areaUnit') return 3;
  if (field === 'amenityIds') return 4;
  if (field === 'contactName' || field === 'contactPhone') return 6;
  return 7;
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
