'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorState, Skeleton } from '@/components/ui/state';
import { cn } from '@/lib/utils';

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-black text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ value }: { value?: unknown }) {
  const text = String(value ?? 'unknown');
  const normalized = text.toLowerCase();
  return (
    <Badge
      className={cn(
        normalized.includes('active') || normalized.includes('approved') || normalized.includes('verified') ? 'border-emerald-200 bg-emerald-50 text-trust' : '',
        normalized.includes('pending') || normalized.includes('open') || normalized.includes('draft') ? 'border-amber-200 bg-amber-50 text-amber-800' : '',
        normalized.includes('reject') || normalized.includes('suspend') || normalized.includes('dismiss') ? 'border-red-200 bg-red-50 text-red-700' : '',
      )}
    >
      {text}
    </Badge>
  );
}

export function AdminLoading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-20" />
      <Skeleton className="h-80" />
    </div>
  );
}

export function AdminError({ message = 'Unable to load this admin view.' }: { message?: string }) {
  return <ErrorState title="Admin data unavailable" message={message} />;
}

export function AdminEmpty({ title = 'No records found', description = 'There are no records for this view yet.' }: { title?: string; description?: string }) {
  return (
    <Card className="p-8 text-center">
      <h3 className="text-lg font-black text-ink">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </Card>
  );
}

export function AdminTable({ columns, rows, actions }: { columns: Array<{ key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }>; rows: Record<string, unknown>[]; actions?: (row: Record<string, unknown>) => React.ReactNode }) {
  if (!rows.length) return <AdminEmpty />;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-stone-50 text-left text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              {columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
              {actions ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="max-w-[280px] px-4 py-3 text-ink">
                    {column.render ? column.render(row) : String(row[column.key] ?? '-')}
                  </td>
                ))}
                {actions ? <td className="px-4 py-3">{actions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function readPath(row: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object') return (value as Record<string, unknown>)[key];
    return undefined;
  }, row);
}

export function formatDate(value?: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}
