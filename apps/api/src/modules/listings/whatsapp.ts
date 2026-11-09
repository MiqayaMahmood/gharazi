export function normalizePakistanWhatsAppNumber(value?: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (!digits) return undefined;

  let normalized = digits;
  if (normalized.startsWith('0092')) normalized = normalized.slice(2);
  else if (normalized.startsWith('0')) normalized = `92${normalized.slice(1)}`;
  else if (!normalized.startsWith('92')) normalized = `92${normalized}`;

  if (!/^92[1-9]\d{8,9}$/.test(normalized)) return undefined;
  return normalized;
}

export function buildWhatsAppUrl(value?: string | null): string | undefined {
  const normalized = normalizePakistanWhatsAppNumber(value);
  return normalized ? `https://wa.me/${normalized}` : undefined;
}
