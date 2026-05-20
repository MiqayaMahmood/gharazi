'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { presignUpload, type MediaPayload } from '@/lib/api/supply';

export function MediaEditor({ items, onChange, brochure = false, entityType, entityId }: { items: MediaPayload[]; onChange: (items: MediaPayload[]) => void; brochure?: boolean; entityType?: 'listing' | 'project'; entityId?: string }) {
  function update(index: number, key: keyof MediaPayload, value: string | boolean) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  async function upload(index: number, file?: File) {
    if (!file || !entityType || !entityId) return;
    const mediaType = items[index]?.mediaType === 'brochure' ? 'brochure' : items[index]?.mediaType === 'video' ? 'video' : items[index]?.mediaType === 'floor_plan' ? 'floorplan' : 'image';
    const presigned = await presignUpload({ filename: file.name, contentType: file.type, entityType, entityId, mediaType });
    await fetch(presigned.uploadUrl, { method: presigned.method, headers: { 'Content-Type': file.type }, body: file });
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, storageKey: presigned.storageKey, url: presigned.url } : item)));
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <Card key={index} className="grid gap-3 p-4 md:grid-cols-[160px_1fr_1fr_auto]">
          <Select value={item.mediaType} onChange={(event) => update(index, 'mediaType', event.target.value)}>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="floor_plan">Floor plan</option>
            {brochure ? <option value="brochure">Brochure</option> : null}
          </Select>
          <Input value={item.url} onChange={(event) => update(index, 'url', event.target.value)} placeholder="Media URL" />
          <Input value={item.storageKey} onChange={(event) => update(index, 'storageKey', event.target.value)} placeholder="Storage key or filename" />
          {entityType && entityId ? <Input aria-label="Upload media file" type="file" onChange={(event) => upload(index, event.target.files?.[0])} /> : null}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input checked={Boolean(item.isCover)} onChange={(event) => update(index, 'isCover', event.target.checked)} type="checkbox" />
            Cover
          </label>
        </Card>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...items, { mediaType: 'image', url: '', storageKey: '', isCover: items.length === 0 }])}>Add media metadata</Button>
    </div>
  );
}
