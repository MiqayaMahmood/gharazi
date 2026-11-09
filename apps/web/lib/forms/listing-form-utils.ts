export const LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const LISTING_VIDEO_TYPES = ['video/mp4'] as const;
export const FLOOR_PLAN_TYPES = [...LISTING_IMAGE_TYPES, 'application/pdf'] as const;

type CompletenessValues = {
  purposeId?: string;
  propertyTypeId?: string;
  cityId?: string;
  areaId?: string;
  title?: string;
  description?: string;
  priceAmount?: number;
  areaValue?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  contactName?: string;
  contactPhone?: string;
};

type CompletenessMedia = { id?: string; url?: string; file?: File };

export function getListingCompleteness(values: CompletenessValues, media: CompletenessMedia[]) {
  const required = [
    Boolean(values.purposeId),
    Boolean(values.propertyTypeId),
    Boolean(values.cityId),
    Boolean(values.areaId),
    (values.title?.trim().length ?? 0) >= 10,
    (values.description?.trim().length ?? 0) >= 30,
    Number(values.priceAmount) > 0,
    Number(values.areaValue) > 0 && Boolean(values.areaUnit),
  ];
  const recommended = [
    media.some((item) => Boolean(item.id || item.url || item.file)),
    Boolean(values.contactName?.trim()),
    Boolean(values.contactPhone?.trim()),
    Number(values.bedrooms) > 0 || Number(values.bathrooms) > 0,
  ];
  const requiredComplete = required.filter(Boolean).length;
  const recommendedComplete = recommended.filter(Boolean).length;
  const complete = requiredComplete + recommendedComplete;
  const total = required.length + recommended.length;

  return {
    percent: Math.round((complete / total) * 100),
    requiredComplete,
    requiredTotal: required.length,
    recommendedComplete,
    recommendedTotal: recommended.length,
    requiredReady: requiredComplete === required.length,
  };
}

export function validateListingMediaFile(file: Pick<File, 'type'>, mediaType: string) {
  const allowed = mediaType === 'video'
    ? LISTING_VIDEO_TYPES
    : mediaType === 'floor_plan'
      ? FLOOR_PLAN_TYPES
      : LISTING_IMAGE_TYPES;
  return (allowed as readonly string[]).includes(file.type)
    ? undefined
    : mediaType === 'video'
      ? 'Choose an MP4 video.'
      : mediaType === 'floor_plan'
        ? 'Choose a JPEG, PNG, WebP, or PDF floor plan.'
        : 'Choose a JPEG, PNG, or WebP image.';
}
