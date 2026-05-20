export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatPrice(value?: number | null) {
  if (!value) return 'Price on request';
  if (value >= 10_000_000) return `PKR ${(value / 10_000_000).toFixed(value % 10_000_000 ? 1 : 0)} crore`;
  if (value >= 100_000) return `PKR ${(value / 100_000).toFixed(value % 100_000 ? 1 : 0)} lakh`;
  return `PKR ${value.toLocaleString('en-PK')}`;
}

export function formatDate(value?: string | null) {
  if (!value) return 'Recently updated';
  return new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}
