const PAKISTAN_E164 = /^92[1-9]\d{8,9}$/;

export function normalizePakistanPhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (!digits) return undefined;

  let normalized = digits;
  if (normalized.startsWith('0092')) normalized = normalized.slice(2);
  else if (normalized.startsWith('0')) normalized = `92${normalized.slice(1)}`;
  else if (!normalized.startsWith('92')) normalized = `92${normalized}`;

  return PAKISTAN_E164.test(normalized) ? normalized : undefined;
}

export function buildTelephoneHref(value?: string | null): string | undefined {
  const normalized = normalizePakistanPhone(value);
  return normalized ? `tel:+${normalized}` : undefined;
}

export function buildPropertyWhatsAppHref(whatsappUrl: string | undefined, title: string, publicId?: string): string | undefined {
  if (!whatsappUrl) return undefined;
  try {
    const url = new URL(whatsappUrl);
    const number = url.pathname.replace(/^\/+/, '');
    if (url.protocol !== 'https:' || url.hostname !== 'wa.me' || !PAKISTAN_E164.test(number)) return undefined;
    const reference = publicId ? ` (Listing ${publicId})` : '';
    url.search = '';
    url.searchParams.set('text', `Hello, I am interested in "${title}"${reference} on Gharazi. Is it still available?`);
    return url.toString();
  } catch {
    return undefined;
  }
}
