'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/state';
import {
  listAdminListingContactUpdates,
  updateAdminListingContact,
  type ListingContactUpdateRow,
} from '@/lib/api/admin';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';
import { isAdmin } from '@/lib/auth/roles';
import { useCurrentUser } from '@/lib/query/hooks';
import { getListingHref } from '@/lib/routes';
import { cn } from '@/lib/utils';

const ACTIVE_ROW_KEY = 'admin_listing_contact_active_row';
const PAGE_SIZES = [20, 40, 80, 1000] as const;

type Filter = 'missing' | 'all';
type EditableFields = Pick<ListingContactUpdateRow, 'contactName' | 'contactPhone' | 'contactWhatsapp'>;

function editableFields(row: ListingContactUpdateRow): EditableFields {
  return {
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    contactWhatsapp: row.contactWhatsapp,
  };
}

function sameEditable(left: EditableFields, right: EditableFields) {
  return (
    (left.contactName ?? '') === (right.contactName ?? '') &&
    (left.contactPhone ?? '') === (right.contactPhone ?? '') &&
    (left.contactWhatsapp ?? '') === (right.contactWhatsapp ?? '')
  );
}

export default function AdminListingContactUpdatePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading: userLoading, isError: userError } = useCurrentUser();
  const allowed = isAdmin(user);
  const [filter, setFilter] = useState<Filter>('missing');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZES)[number]>(20);
  const [searchDraft, setSearchDraft] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ListingContactUpdateRow[]>([]);
  const [edits, setEdits] = useState<Record<string, EditableFields>>({});
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!userLoading && (userError || !user)) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, user, userError, userLoading]);

  useEffect(() => {
    setActiveRowId(window.localStorage.getItem(ACTIVE_ROW_KEY));
  }, []);

  const query = useQuery({
    queryKey: ['admin', 'listing-contact-updates', filter, page, limit, q],
    queryFn: () => listAdminListingContactUpdates({ filter, page, limit, q }),
    enabled: allowed,
  });

  useEffect(() => {
    if (!query.data?.items) return;
    setRows(query.data.items);
    setEdits(Object.fromEntries(query.data.items.map((row) => [row.id, editableFields(row)])));
  }, [query.data]);

  const dirtyRowIds = useMemo(
    () => rows.filter((row) => !sameEditable(edits[row.id] ?? editableFields(row), editableFields(row))).map((row) => row.id),
    [edits, rows],
  );
  const hasUnsaved = dirtyRowIds.length > 0;

  function confirmDiscard() {
    return !hasUnsaved || window.confirm('Discard unsaved row changes?');
  }

  function changePage(nextPage: number) {
    if (!confirmDiscard()) return;
    setMessage('');
    setPage(nextPage);
  }

  function openSource(row: ListingContactUpdateRow) {
    if (!row.sourceUrl) return;
    setActiveRowId(row.id);
    window.localStorage.setItem(ACTIVE_ROW_KEY, row.id);
    window.open(row.sourceUrl, '_blank', 'noopener,noreferrer');
  }

  function clearHighlight() {
    setActiveRowId(null);
    window.localStorage.removeItem(ACTIVE_ROW_KEY);
  }

  function updateEdit(id: string, field: keyof EditableFields, value: string) {
    setEdits((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setRowErrors((current) => ({ ...current, [id]: '' }));
  }

  async function save(row: ListingContactUpdateRow) {
    const edited = edits[row.id] ?? editableFields(row);
    setSavingId(row.id);
    setMessage('');
    setRowErrors((current) => ({ ...current, [row.id]: '' }));
    try {
      const updated = await updateAdminListingContact(row.id, edited);
      setRows((current) => {
        if (filter === 'missing' && updated.contactName && updated.contactPhone && updated.contactWhatsapp) {
          return current.filter((item) => item.id !== row.id);
        }
        return current.map((item) => (item.id === row.id ? updated : item));
      });
      setEdits((current) => ({ ...current, [updated.id]: editableFields(updated) }));
      setMessage(`Saved ${updated.publicId}.`);
    } catch (error) {
      setRowErrors((current) => ({ ...current, [row.id]: getUserFriendlyErrorMessage(error) }));
    } finally {
      setSavingId(null);
    }
  }

  if (userLoading || (!user && !userError)) {
    return (
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-8">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </main>
    );
  }

  if (user && !allowed) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-black">Access denied</h1>
          <p className="mt-2 text-sm text-muted">Your account does not have permission to access this internal utility.</p>
          <Button className="mt-6" href="/dashboard" asChild>Return to dashboard</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-trust">Admin internal</p>
          <h1 className="text-2xl font-black text-ink">Listing Contact Update</h1>
          <p className="mt-1 text-sm text-muted">Internal admin utility to update listing contact name, phone, and WhatsApp.</p>
        </header>

        <Card className="grid gap-3 p-4 lg:grid-cols-[190px_1fr_150px_auto_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-semibold">
            Filter
            <Select
              value={filter}
              onChange={(event) => {
                if (!confirmDiscard()) return;
                setFilter(event.target.value as Filter);
                setPage(1);
              }}
            >
              <option value="missing">Missing contact info</option>
              <option value="all">All listings</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Search
            <Input
              value={searchDraft}
              placeholder="Public ID, title, city, area, or contact"
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && confirmDiscard()) {
                  setQ(searchDraft.trim());
                  setPage(1);
                }
              }}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Page size
            <Select
              value={limit}
              onChange={(event) => {
                if (!confirmDiscard()) return;
                setLimit(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </Select>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!confirmDiscard()) return;
              setQ(searchDraft.trim());
              setPage(1);
            }}
          >
            Search
          </Button>
          <Button type="button" variant="ghost" onClick={clearHighlight}>Clear highlight</Button>
        </Card>

        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-trust">{message}</p> : null}
        {hasUnsaved ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{dirtyRowIds.length} row(s) have unsaved changes.</p> : null}
        {query.isError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">Unable to load listing contacts.</p> : null}

        <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-soft">
          <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3">Public ID</th>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">City / Area</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Contact Name</th>
                <th className="px-3 py-3">Contact Phone</th>
                <th className="px-3 py-3">WhatsApp</th>
                <th className="px-3 py-3">Open Source</th>
                <th className="px-3 py-3">Save</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr><td className="px-3 py-8 text-center text-muted" colSpan={9}>Loading listings...</td></tr>
              ) : rows.length ? rows.map((row) => {
                const edited = edits[row.id] ?? editableFields(row);
                const changed = !sameEditable(edited, editableFields(row));
                const active = activeRowId === row.id;
                return (
                  <tr key={row.id} className={cn('border-t border-line align-top', active && 'bg-amber-50')}>
                    <td className="px-3 py-3">
                      <div className="grid gap-2">
                        <span className="font-bold text-ink">{row.publicId}</span>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" className="min-h-8 px-2 py-1 text-xs" variant="ghost" onClick={() => navigator.clipboard?.writeText(row.publicId)}>Copy</Button>
                          <Button className="min-h-8 px-2 py-1 text-xs" variant="ghost" href={getListingHref({ publicId: row.publicId })} asChild>Open public</Button>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-72 px-3 py-3 font-semibold text-ink">{row.title}</td>
                    <td className="px-3 py-3 text-muted">{row.cityName ?? '-'} / {row.areaName ?? '-'}</td>
                    <td className="px-3 py-3"><span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold">{row.status}</span></td>
                    <td className="px-3 py-3"><Input value={edited.contactName ?? ''} onChange={(event) => updateEdit(row.id, 'contactName', event.target.value)} /></td>
                    <td className="px-3 py-3"><Input value={edited.contactPhone ?? ''} onChange={(event) => updateEdit(row.id, 'contactPhone', event.target.value)} /></td>
                    <td className="px-3 py-3">
                      <Input value={edited.contactWhatsapp ?? ''} onChange={(event) => updateEdit(row.id, 'contactWhatsapp', event.target.value)} />
                      {rowErrors[row.id] ? <p className="mt-2 text-xs font-semibold text-red-700">{rowErrors[row.id]}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <Button type="button" variant="secondary" disabled={!row.sourceUrl} onClick={() => openSource(row)}>
                        {row.sourceUrl ? 'Open Source' : 'No source'}
                      </Button>
                    </td>
                    <td className="px-3 py-3">
                      <Button type="button" disabled={!changed || savingId === row.id} onClick={() => save(row)}>
                        {savingId === row.id ? 'Saving...' : 'Save'}
                      </Button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td className="px-3 py-8 text-center text-muted" colSpan={9}>No listings match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {query.data && query.data.totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted">Page {query.data.page} of {query.data.totalPages} · {query.data.total} listings</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
              <Button type="button" variant="secondary" disabled={page >= query.data.totalPages} onClick={() => changePage(page + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
