'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { presignUpload, type MediaPayload } from '@/lib/api/supply';
import { validateListingMediaFile } from '@/lib/forms/listing-form-utils';

export type MediaUploadState = { status: 'ready' | 'uploading' | 'uploaded' | 'error'; message?: string };

export function MediaEditor({
  items,
  onChange,
  brochure = false,
  entityType,
  entityId,
  deferUpload = false,
  uploadStates = {},
  onRetry,
}: {
  items: MediaPayload[];
  onChange: (items: MediaPayload[]) => void;
  brochure?: boolean;
  entityType?: 'listing' | 'project';
  entityId?: string;
  deferUpload?: boolean;
  uploadStates?: Record<string, MediaUploadState>;
  onRetry?: (clientKey: string) => void;
}) {
  const [immediateStates, setImmediateStates] = useState<Record<string, MediaUploadState>>({});

  function update(index: number, key: keyof MediaPayload, value: string | boolean) {
    onChange(items.map((item, itemIndex) => {
      if (key === 'isCover' && value === true) return { ...item, isCover: itemIndex === index };
      return itemIndex === index ? { ...item, [key]: value } : item;
    }));
  }

  async function upload(index: number, file?: File) {
    if (!file) return;
    const item = items[index];
    const validationError = validateListingMediaFile(file, item.mediaType);
    const clientKey = item.clientKey ?? item.id ?? String(index);
    if (validationError) {
      setImmediateStates((current) => ({ ...current, [clientKey]: { status: 'error', message: validationError } }));
      return;
    }
    if (deferUpload) {
      onChange(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, file } : entry));
      return;
    }
    if (!entityType || !entityId) return;
    const mediaType = items[index]?.mediaType === 'brochure' ? 'brochure' : items[index]?.mediaType === 'video' ? 'video' : items[index]?.mediaType === 'floor_plan' ? 'floorplan' : 'image';
    setImmediateStates((current) => ({ ...current, [clientKey]: { status: 'uploading' } }));
    try {
      const presigned = await presignUpload({ filename: file.name, contentType: file.type, entityType, entityId, mediaType });
      const response = await fetch(presigned.uploadUrl, { method: presigned.method, headers: { 'Content-Type': file.type }, body: file });
      if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
      onChange(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, storageKey: presigned.storageKey, url: presigned.url } : entry)));
      setImmediateStates((current) => ({ ...current, [clientKey]: { status: 'uploaded' } }));
    } catch (error) {
      setImmediateStates((current) => ({ ...current, [clientKey]: { status: 'error', message: error instanceof Error ? error.message : 'Upload failed. Choose the file again to retry.' } }));
    }
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <MediaRow
          key={item.id ?? item.clientKey ?? index}
          item={item}
          index={index}
          brochure={brochure}
          canUpload={deferUpload || Boolean(entityType && entityId)}
          state={uploadStates[item.clientKey ?? ''] ?? immediateStates[item.clientKey ?? item.id ?? String(index)] ?? (item.file ? { status: 'ready' } : undefined)}
          onUpdate={update}
          onUpload={upload}
          onRemove={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          onRetry={onRetry}
        />
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...items, { clientKey: crypto.randomUUID(), mediaType: 'image', url: '', storageKey: '', isCover: items.length === 0 }])}>Add photo or media</Button>
      {!items.length ? <p className="text-sm text-muted">No media added yet. Photos are recommended but do not change publication eligibility.</p> : null}
    </div>
  );
}

function MediaRow({ item, index, brochure, canUpload, state, onUpdate, onUpload, onRemove, onRetry }: {
  item: MediaPayload;
  index: number;
  brochure: boolean;
  canUpload: boolean;
  state?: MediaUploadState;
  onUpdate: (index: number, key: keyof MediaPayload, value: string | boolean) => void;
  onUpload: (index: number, file?: File) => void;
  onRemove: () => void;
  onRetry?: (clientKey: string) => void;
}) {
  const existing = Boolean(item.id);
  const previewUrl = useMediaPreview(item);
  const accept = item.mediaType === 'video' ? 'video/mp4' : item.mediaType === 'floor_plan' ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp';

  return (
    <Card className="grid gap-3 p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[112px_1fr]">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-stone-100 text-center text-xs font-semibold text-muted" style={previewUrl && item.mediaType !== 'video' && !previewUrl.endsWith('.pdf') ? { backgroundImage: `url(${JSON.stringify(previewUrl).slice(1, -1)})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined} role="img" aria-label={previewUrl ? `Preview of ${item.file?.name ?? item.mediaType}` : 'No media preview'}>
          {!previewUrl ? 'Preview' : item.mediaType === 'video' ? 'MP4 selected' : previewUrl.endsWith('.pdf') ? 'PDF selected' : null}
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-bold">Media type
            <Select disabled={existing} value={item.mediaType} onChange={(event) => onUpdate(index, 'mediaType', event.target.value)}>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="floor_plan">Floor plan</option>
              {brochure ? <option value="brochure">Brochure</option> : null}
            </Select>
          </label>
          {canUpload && !existing ? <label className="grid gap-1 text-sm font-bold">Choose file
            <Input accept={accept} aria-label={`Choose file for media item ${index + 1}`} type="file" onChange={(event) => void onUpload(index, event.target.files?.[0])} />
          </label> : null}
          {item.file ? <p className="text-xs font-semibold text-muted">Selected: {item.file.name}</p> : null}
        </div>
      </div>
      {!existing ? (
        <details className="rounded-md border border-line p-3 text-sm">
          <summary className="cursor-pointer font-bold">Advanced media details</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 font-semibold">Media URL <Input value={item.url} onChange={(event) => onUpdate(index, 'url', event.target.value)} placeholder="https://..." /></label>
            <label className="grid gap-1 font-semibold">Storage key <Input value={item.storageKey} onChange={(event) => onUpdate(index, 'storageKey', event.target.value)} placeholder="Storage key or filename" /></label>
          </div>
        </details>
      ) : <p className="text-xs text-muted">Existing media is preserved. Replacement and deletion require a dedicated ownership-checked API endpoint.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input checked={Boolean(item.isCover)} disabled={existing} onChange={(event) => onUpdate(index, 'isCover', event.target.checked)} type="checkbox" />
          Cover photo
        </label>
        {!existing ? <Button type="button" variant="ghost" onClick={onRemove}>Remove</Button> : null}
      </div>
      {state ? <p className={`text-sm font-semibold ${state.status === 'error' ? 'text-red-700' : state.status === 'uploaded' ? 'text-trust' : 'text-muted'}`} role={state.status === 'error' ? 'alert' : 'status'}>
        {state.status === 'ready' ? 'Ready to upload when you save.' : state.status === 'uploading' ? 'Uploading…' : state.status === 'uploaded' ? 'Upload complete.' : state.message ?? 'Upload failed.'}
        {state.status === 'error' && item.clientKey && onRetry ? <Button className="ml-2" type="button" variant="secondary" onClick={() => onRetry(item.clientKey!)}>Retry</Button> : null}
      </p> : null}
    </Card>
  );
}

function useMediaPreview(item: MediaPayload) {
  const [preview, setPreview] = useState(item.url);
  useEffect(() => {
    if (!item.file) {
      setPreview(item.url);
      return;
    }
    const objectUrl = URL.createObjectURL(item.file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file, item.url]);
  return preview;
}
