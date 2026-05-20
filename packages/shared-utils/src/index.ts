export function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[^\d+]/g, '');
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function makePublicId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}-${time}${random}`;
}
