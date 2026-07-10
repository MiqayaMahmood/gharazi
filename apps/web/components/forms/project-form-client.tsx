'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Stepper } from './stepper';
import { MediaEditor } from './media-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Badge, InfoChip } from '@/components/ui/badge';
import {
  addProjectMedia,
  addProjectUnit,
  addProjectUpdate,
  archiveProject,
  createProject,
  publishProject,
  updateProject,
  type MediaPayload,
  type ProjectFormPayload,
  type ProjectUnitPayload,
  type ProjectUpdatePayload,
} from '@/lib/api/supply';
import { useAmenities, useAreas, useCities, usePropertyTypes } from '@/lib/query/hooks';
import { getDashboardProjectEditHref } from '@/lib/routes';
import type { Project } from '@/types/marketplace';

const steps = ['Basics', 'Location', 'Overview', 'Payment', 'Units', 'Media', 'Updates', 'Review'];

const schema = z.object({
  cityId: z.string().min(1, 'Choose a city'),
  areaId: z.string().min(1, 'Choose an area'),
  projectTypeId: z.string().min(1, 'Choose a project type'),
  name: z.string().min(6, 'Enter project name').max(180),
  shortDescription: z.string().optional(),
  description: z.string().min(30, 'Add a transparent project overview').max(5000),
  possessionStatus: z.string().min(1, 'Choose possession status'),
  legalStatus: z.string().optional(),
  expectedHandoverDate: z.string().optional(),
  launchDate: z.string().optional(),
  addressLine: z.string().optional(),
  brochureUrl: z.string().optional(),
  paymentPlanSummary: z.string().optional(),
  minPriceAmount: z.coerce.number().optional(),
  maxPriceAmount: z.coerce.number().optional(),
  amenityIds: z.array(z.string()).optional(),
});

type ProjectFormValues = z.infer<typeof schema>;

export function ProjectFormClient({ initialProject }: { initialProject?: Project }) {
  const [step, setStep] = useState(0);
  const [media, setMedia] = useState<MediaPayload[]>([]);
  const [units, setUnits] = useState<ProjectUnitPayload[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdatePayload[]>([]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const cities = useCities();
  const propertyTypes = usePropertyTypes();
  const amenities = useAmenities();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cityId: '',
      areaId: '',
      projectTypeId: '',
      name: initialProject?.name ?? '',
      shortDescription: '',
      description: initialProject?.description ?? '',
      possessionStatus: initialProject?.possessionStatus ?? 'under_construction',
      legalStatus: initialProject?.legalStatus ?? '',
      expectedHandoverDate: initialProject?.expectedHandoverDate ?? '',
      launchDate: initialProject?.launchDate ?? '',
      addressLine: '',
      brochureUrl: '',
      paymentPlanSummary: initialProject?.paymentPlanSummary ?? '',
      minPriceAmount: initialProject?.minPriceAmount ?? 0,
      maxPriceAmount: initialProject?.maxPriceAmount ?? 0,
      amenityIds: [],
    },
  });
  const cityId = form.watch('cityId');
  const areas = useAreas(cityId);
  async function saveProject(values: ProjectFormValues) {
    const payload = cleanPayload(values);
    const project = initialProject ? await updateProject(initialProject.id, payload) : await createProject(payload);
    await Promise.all([
      ...media.filter((item) => item.url && item.storageKey).map((item) => addProjectMedia(project.id, item)),
      ...units.filter((unit) => unit.title && unit.propertyTypeId).map((unit) => addProjectUnit(project.id, cleanUnitPayload(unit))),
      ...updates.filter((update) => update.title && update.body && update.updateDate).map((update) => addProjectUpdate(project.id, cleanUpdatePayload(update))),
    ]);
    return project;
  }
  const saveMutation = useMutation({
    mutationFn: saveProject,
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      router.push(getDashboardProjectEditHref(project.id));
    },
    onError: (error) => logMutationError('save project', error),
  });
  const publishMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const project = await saveProject(values);
      try {
        return await publishProject(project.id);
      } catch (error) {
        throw new Error(`Draft saved (${project.slug ?? project.id}) but publish failed: ${errorMessage(error)}`);
      }
    },
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      router.push(getDashboardProjectEditHref(project.id));
    },
    onError: (error) => logMutationError('publish project', error),
  });
  const archiveMutation = useMutation({ mutationFn: () => archiveProject(initialProject?.id ?? ''), onSuccess: () => router.push('/dashboard/projects') });

  async function next() {
    const fieldsByStep: Array<Array<keyof ProjectFormValues>> = [
      ['name', 'projectTypeId'],
      ['cityId', 'areaId'],
      ['description', 'possessionStatus'],
      [],
      [],
      [],
      [],
      [],
    ];
    const ok = await form.trigger(fieldsByStep[step]);
    if (ok) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <form className="grid gap-6" onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}>
      <Stepper steps={steps} current={step} />
      <Card className="p-5">
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project name" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field>
            <Field label="Project type" error={form.formState.errors.projectTypeId?.message}><Select {...form.register('projectTypeId')}><option value="">Select type</option>{propertyTypes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Short description"><Input {...form.register('shortDescription')} /></Field>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="City" error={form.formState.errors.cityId?.message}><Select {...form.register('cityId')}><option value="">Select city</option>{cities.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Area" error={form.formState.errors.areaId?.message}><Select {...form.register('areaId')}><option value="">Select area</option>{areas.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Address"><Input {...form.register('addressLine')} /></Field>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid gap-4">
            <Field label="Overview" error={form.formState.errors.description?.message}><textarea className="min-h-40 w-full rounded-md border border-line p-3 text-sm" {...form.register('description')} /></Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Possession" error={form.formState.errors.possessionStatus?.message}><Select {...form.register('possessionStatus')}><option value="pre_launch">Pre launch</option><option value="under_construction">Under construction</option><option value="ready">Ready</option><option value="completed">Completed</option><option value="other">Other</option></Select></Field>
              <Field label="Legal status"><Input {...form.register('legalStatus')} placeholder="Approved, NOC submitted" /></Field>
              <Field label="Brochure URL"><Input {...form.register('brochureUrl')} /></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">{amenities.data?.map((amenity) => <label key={amenity.id} className="flex items-center gap-2 rounded-md border border-line p-3 text-sm font-semibold"><input type="checkbox" value={amenity.id} {...form.register('amenityIds')} />{amenity.name}</label>)}</div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Launch date"><Input type="date" {...form.register('launchDate')} /></Field>
              <Field label="Handover date"><Input type="date" {...form.register('expectedHandoverDate')} /></Field>
              <Field label="Min price"><Input type="number" {...form.register('minPriceAmount')} /></Field>
              <Field label="Max price"><Input type="number" {...form.register('maxPriceAmount')} /></Field>
            </div>
            <Field label="Payment plan summary"><textarea className="min-h-28 w-full rounded-md border border-line p-3 text-sm" {...form.register('paymentPlanSummary')} /></Field>
          </div>
        ) : null}
        {step === 4 ? <UnitEditor units={units} onChange={setUnits} propertyTypes={propertyTypes.data ?? []} /> : null}
        {step === 5 ? <MediaEditor items={media} onChange={setMedia} brochure entityType="project" entityId={initialProject?.id} /> : null}
        {step === 6 ? <UpdatesEditor updates={updates} onChange={setUpdates} /> : null}
        {step === 7 ? (
          <div className="grid gap-3">
            <Badge>{initialProject ? 'Edit project' : 'New project draft'}</Badge>
            <p className="text-sm text-muted">Review the core project facts, payment plan, units, and updates before publishing.</p>
            <div className="flex flex-wrap gap-2">
              <InfoChip>{units.length} units</InfoChip>
              <InfoChip>{updates.length} updates</InfoChip>
              <InfoChip>{media.length} media records</InfoChip>
            </div>
          </div>
        ) : null}
      </Card>
      <div className="flex flex-wrap justify-between gap-3">
        <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
        <div className="flex flex-wrap gap-2">
          {initialProject ? <Button type="button" variant="ghost" onClick={() => archiveMutation.mutate()}>Archive</Button> : null}
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

function UnitEditor({ units, onChange, propertyTypes }: { units: ProjectUnitPayload[]; onChange: (units: ProjectUnitPayload[]) => void; propertyTypes: Array<{ id: string; name: string }> }) {
  function update(index: number, key: keyof ProjectUnitPayload, value: string | number) {
    onChange(units.map((unit, itemIndex) => (itemIndex === index ? { ...unit, [key]: value } : unit)));
  }

  return (
    <div className="grid gap-3">
      {units.map((unit, index) => (
        <Card key={index} className="grid gap-3 p-4 md:grid-cols-4">
          <Input value={unit.title} onChange={(event) => update(index, 'title', event.target.value)} placeholder="2 bed apartment" />
          <Select value={unit.propertyTypeId} onChange={(event) => update(index, 'propertyTypeId', event.target.value)}><option value="">Type</option>{propertyTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Input type="number" value={unit.areaValue ?? ''} onChange={(event) => update(index, 'areaValue', Number(event.target.value))} placeholder="Area" />
          <Input type="number" value={unit.minPriceAmount ?? ''} onChange={(event) => update(index, 'minPriceAmount', Number(event.target.value))} placeholder="Min price" />
        </Card>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...units, { title: '', propertyTypeId: '', areaUnit: 'sq ft', inventoryStatus: 'available' }])}>Add unit type</Button>
    </div>
  );
}

function UpdatesEditor({ updates, onChange }: { updates: ProjectUpdatePayload[]; onChange: (updates: ProjectUpdatePayload[]) => void }) {
  function update(index: number, key: keyof ProjectUpdatePayload, value: string | number | boolean) {
    onChange(updates.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  return (
    <div className="grid gap-3">
      {updates.map((item, index) => (
        <Card key={index} className="grid gap-3 p-4">
          <Input value={item.title} onChange={(event) => update(index, 'title', event.target.value)} placeholder="Progress update title" />
          <textarea className="min-h-24 rounded-md border border-line p-3 text-sm" value={item.body} onChange={(event) => update(index, 'body', event.target.value)} placeholder="Update details" />
          <div className="grid gap-3 md:grid-cols-3">
            <Input type="date" value={item.updateDate} onChange={(event) => update(index, 'updateDate', event.target.value)} />
            <Input type="number" value={item.progressPercent ?? ''} onChange={(event) => update(index, 'progressPercent', Number(event.target.value))} placeholder="Progress %" />
            <label className="flex items-center gap-2 text-sm font-semibold"><input checked={Boolean(item.publish)} onChange={(event) => update(index, 'publish', event.target.checked)} type="checkbox" />Publish update</label>
          </div>
        </Card>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...updates, { title: '', body: '', updateDate: new Date().toISOString().slice(0, 10), publish: true }])}>Add progress update</Button>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      {children}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function cleanPayload(values: ProjectFormValues): ProjectFormPayload {
  return {
    cityId: values.cityId,
    areaId: values.areaId,
    projectTypeId: values.projectTypeId,
    name: values.name,
    shortDescription: blankToUndefined(values.shortDescription),
    description: values.description,
    possessionStatus: values.possessionStatus,
    legalStatus: blankToUndefined(values.legalStatus),
    expectedHandoverDate: blankToUndefined(values.expectedHandoverDate),
    launchDate: blankToUndefined(values.launchDate),
    addressLine: blankToUndefined(values.addressLine),
    brochureUrl: blankToUndefined(values.brochureUrl),
    paymentPlanSummary: blankToUndefined(values.paymentPlanSummary),
    minPriceAmount: values.minPriceAmount || undefined,
    maxPriceAmount: values.maxPriceAmount || undefined,
    amenityIds: values.amenityIds?.length ? values.amenityIds : undefined,
  };
}

function cleanUnitPayload(unit: ProjectUnitPayload): ProjectUnitPayload {
  return {
    ...unit,
    areaValue: unit.areaValue || undefined,
    bedrooms: unit.bedrooms || undefined,
    bathrooms: unit.bathrooms || undefined,
    minPriceAmount: unit.minPriceAmount || undefined,
    maxPriceAmount: unit.maxPriceAmount || undefined,
    possessionStatus: blankToUndefined(unit.possessionStatus),
    inventoryStatus: blankToUndefined(unit.inventoryStatus),
  };
}

function cleanUpdatePayload(update: ProjectUpdatePayload): ProjectUpdatePayload {
  return {
    ...update,
    progressPercent: update.progressPercent || undefined,
  };
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
