export type ReferenceItem = {
  id: string;
  code?: string;
  name: string;
  slug?: string;
  category?: string;
  cityId?: string;
  city?: { id: string; name: string; slug?: string };
};
