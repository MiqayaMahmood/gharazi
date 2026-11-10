'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/input';
import { getAdminExpirySimulation, getAdminListingExpiryMetrics, getAdminListingExpiryPreview } from '@/lib/api/admin';
import type { AdminExpirySimulationResult } from '@/lib/api/admin';
import { AdminEmpty, AdminError, AdminLoading } from './admin-primitives';

const buckets = [
  ['all_active', 'All active listings'],
  ['within_15_days', 'Expiry within 15 days'],
  ['within_7_days', 'Expiry within 7 days'],
  ['within_1_day', 'Expiry within 1 day'],
  ['overdue', 'Overdue expiry date'],
  ['null_expiry', 'No expiry date'],
] as const;

function date(value: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not set' : parsed.toLocaleDateString();
}

function localDateTime(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

type SimulationInput = { scenario: 'A' | 'B' | 'C'; cutoffAt: string; evaluatedAt: string };

function ExpirySimulation() {
  const [scenario, setScenario] = useState<SimulationInput['scenario']>('A');
  const [cutoffLocal, setCutoffLocal] = useState('');
  const [evaluationLocal, setEvaluationLocal] = useState('');
  const [submitted, setSubmitted] = useState<SimulationInput | null>(null);
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState('');
  const simulation = useQuery({
    queryKey: ['admin-expiry-simulation', submitted, page],
    queryFn: () => getAdminExpirySimulation({ ...submitted!, page, limit: 20 }),
    enabled: Boolean(submitted),
    retry: false,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cutoff = new Date(cutoffLocal);
    const evaluated = new Date(evaluationLocal);
    if (!Number.isFinite(cutoff.getTime()) || !Number.isFinite(evaluated.getTime())) {
      setFormError('Enter both simulation timestamps.');
      return;
    }
    if (evaluated < cutoff) {
      setFormError('Evaluation date must be on or after the cutoff.');
      return;
    }
    setFormError('');
    setPage(1);
    setSubmitted({ scenario, cutoffAt: cutoff.toISOString(), evaluatedAt: evaluated.toISOString() });
  }

  return (
    <Card className="min-w-0 border-amber-300 p-4 sm:p-5">
      <div className="rounded-md border-2 border-amber-500 bg-amber-50 px-4 py-3 text-center text-sm font-black tracking-wide text-amber-950">
        DRY RUN — NO LISTINGS WILL BE CHANGED
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-bold text-ink">Hypothetical expiry enforcement</h3>
        <p className="mt-1 text-sm text-muted">Comparison only. Scenarios are unapproved; this simulation cannot enforce, notify, enqueue, or change search visibility.</p>
      </div>
      <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-semibold text-ink">Policy scenario
          <Select value={scenario} onChange={(event) => { setScenario(event.target.value as SimulationInput['scenario']); setSubmitted(null); }}>
            <option value="A">A — Historical grandfathering</option>
            <option value="B">B — 30-day historical grace</option>
            <option value="C">C — No grandfathering</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-ink">Simulation cutoff
          <Input type="datetime-local" required value={cutoffLocal} onChange={(event) => { setCutoffLocal(event.target.value); setSubmitted(null); }} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-ink">Evaluation timestamp
          <Input type="datetime-local" required value={evaluationLocal} onChange={(event) => { setEvaluationLocal(event.target.value); setSubmitted(null); }} />
        </label>
        <div className="flex items-end"><Button type="submit" className="w-full">Run dry-run preview</Button></div>
        <p className="text-xs text-muted sm:col-span-2 xl:col-span-4">Times are entered in your local timezone and converted to UTC for simulation. Current timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'}.</p>
        {formError ? <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-2 xl:col-span-4">{formError}</p> : null}
      </form>

      {simulation.isError ? <div className="mt-4"><AdminError message="The simulation could not be loaded. Check the timestamps and try again." /></div> : null}
      {simulation.isLoading && submitted ? <div className="mt-4"><AdminLoading /></div> : null}
      {simulation.data ? <SimulationResults result={simulation.data} onPage={setPage} /> : null}
    </Card>
  );
}

function SimulationResults({ result, onPage }: { result: AdminExpirySimulationResult; onPage: (page: number) => void }) {
  const scenarioText = result.scenario === 'A'
    ? 'Listings overdue before cutoff stay protected; only post-cutoff expiry dates are candidates.'
    : result.scenario === 'B'
      ? 'Listings overdue before cutoff are protected until 30 days after cutoff.'
      : 'All currently ACTIVE listings overdue at the evaluation timestamp are candidates.';
  const cards: Array<[string, number]> = [
    ['Candidate listings at evaluation', result.candidates],
    ['Historically protected listings', result.historicalProtected],
    ['Active with expiry date', result.activeWithExpiry],
    ['Not yet due at evaluation', result.notYetDue],
    ['Null expiry excluded', result.nullExpiryExcluded],
    ['Projected ACTIVE after hypothetical transition', result.projectedActiveAfterHypothetical],
  ];
  return (
    <div className="mt-5 grid min-w-0 gap-4" aria-live="polite">
      <div className="rounded-md bg-stone-50 p-3 text-sm text-ink">
        <p className="font-semibold">Scenario {result.scenario} — hypothetical, not approved</p>
        <p className="mt-1">{scenarioText}</p>
        <p className="mt-1 text-xs text-muted">Cutoff: {localDateTime(result.cutoffAt)} · Evaluated: {localDateTime(result.evaluatedAt)}{result.graceEndsAt ? ` · Grace ends: ${localDateTime(result.graceEndsAt)}` : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(([label, value]) => <Card key={label} className="min-w-0 p-3 sm:p-4">
          <p className="text-xs font-semibold text-muted">{label}</p>
          <p className="mt-1 text-xl font-black tabular-nums text-ink">{value.toLocaleString()}</p>
        </Card>)}
      </div>
      {result.scenario === 'B' ? <Card className="p-3 text-sm">
        <strong>At the end of the historical grace period:</strong> {result.candidatesAtGraceEnd?.toLocaleString()} projected candidates; {result.projectedActiveAtGraceEnd?.toLocaleString()} projected ACTIVE listings.
      </Card> : null}
      <p className="text-xs text-muted">Counts use the current ACTIVE, non-deleted inventory and current expiry values as a snapshot. They do not forecast future listings, renewals, status changes, or seller responses. Candidate count is global; search only filters the visible page.</p>
      {result.items.length ? <>
        <div className="grid gap-3 md:hidden">
          {result.items.map((item) => <Card key={item.id} className="min-w-0 p-4">
            <h4 className="break-words font-bold text-ink">{item.title}</h4>
            <p className="mt-1 text-xs text-muted">{item.publicId} · ACTIVE</p>
            <p className="mt-2 text-sm">Expires {date(item.expiresAt)} · {item.daysOverdue} days overdue</p>
            <p className="mt-1 break-all text-xs text-muted">Owner reference: {item.ownerUserId.slice(0, 8)}</p>
          </Card>)}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
          <table className="min-w-[650px] divide-y divide-line text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-muted"><tr>
              {['Listing', 'Owner ref.', 'Status', 'Expiry date', 'Days overdue'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-line">{result.items.map((item) => <tr key={item.id}>
              <td className="max-w-64 px-3 py-3"><span className="block break-words font-semibold">{item.title}</span><span className="text-xs text-muted">{item.publicId}</span></td>
              <td className="px-3 py-3 font-mono text-xs">{item.ownerUserId.slice(0, 8)}</td>
              <td className="px-3 py-3">ACTIVE</td>
              <td className="px-3 py-3">{date(item.expiresAt)}</td>
              <td className="px-3 py-3">{item.daysOverdue}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </> : <AdminEmpty title="No simulated candidates" description="No current active listings match this hypothetical scenario and evaluation timestamp." />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Candidate page {result.page} of {result.totalPages} · {result.matchingCandidates.toLocaleString()} candidates match this filter</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={result.page <= 1} onClick={() => onPage(result.page - 1)}>Previous</Button>
          <Button type="button" variant="secondary" disabled={result.page >= result.totalPages} onClick={() => onPage(result.page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

export function AdminListingExpiryPanel() {
  const [bucket, setBucket] = useState<(typeof buckets)[number][0]>('all_active');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const metrics = useQuery({ queryKey: ['admin-listing-expiry-metrics'], queryFn: getAdminListingExpiryMetrics, retry: false });
  const preview = useQuery({
    queryKey: ['admin-listing-expiry-preview', bucket, page, search],
    queryFn: () => getAdminListingExpiryPreview({ bucket, page, limit: 20, q: search || undefined }),
    retry: false,
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(draftSearch.trim());
    setPage(1);
  }

  const metricItems = metrics.data ? [
    ['Total listing records', metrics.data.totalListings],
    ['Active listings', metrics.data.activeListings],
    ['Expiry within 15 days', metrics.data.approaching15Days],
    ['Expiry within 7 days', metrics.data.approaching7Days],
    ['Expiry within 1 day', metrics.data.approaching1Day],
    ['Overdue expiry date', metrics.data.overdue],
    ['Active with no expiry', metrics.data.nullExpiry],
    [`Renewed in last ${metrics.data.recentlyRenewedWindowDays} days`, metrics.data.recentlyRenewed],
  ] as const : [];

  return (
    <section className="mb-8 grid min-w-0 gap-4" aria-labelledby="expiry-preview-title">
      <div>
        <h2 id="expiry-preview-title" className="text-xl font-black text-ink">Listing lifecycle overview</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">Read-only current data. An overdue expiry date does not mean the listing has EXPIRED status. This preview does not change listing visibility or status.</p>
      </div>

      {metrics.isError ? <AdminError message="Lifecycle metrics could not be loaded." /> : metrics.isLoading ? <AdminLoading /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {metricItems.map(([label, value]) => <Card key={label} className="min-w-0 p-4">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-ink">{value.toLocaleString()}</p>
          </Card>)}
        </div>
      )}

      <Card className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Expiry enforcement impact preview</h3>
            <p className="text-sm text-muted">Active listings only. No actions are available from this preview.</p>
          </div>
          {preview.data ? <p className="text-sm text-muted">{preview.data.total.toLocaleString()} matching listings</p> : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,2fr)]">
          <label className="grid gap-1 text-sm font-semibold text-ink">Expiry filter
            <Select value={bucket} onChange={(event) => { setBucket(event.target.value as typeof bucket); setPage(1); }}>
              {buckets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </label>
          <form className="flex items-end gap-2" onSubmit={submitSearch}>
            <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold text-ink">Search title or public ID
              <Input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} maxLength={100} />
            </label>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>

        <div className="mt-4">
          {preview.isError ? <AdminError message="The expiry preview could not be loaded." /> : preview.isLoading ? <AdminLoading /> : preview.data?.items.length ? (
            <>
              <div className="grid gap-3 md:hidden">
                {preview.data.items.map((item) => <Card key={item.id} className="min-w-0 p-4">
                  <h4 className="break-words font-bold text-ink">{item.title}</h4>
                  <p className="mt-1 text-xs text-muted">{item.publicId} · ACTIVE</p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-muted">Owner reference</dt><dd className="break-all text-right">{item.ownerUserId.slice(0, 8)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Expiry date</dt><dd>{date(item.expiresAt)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Days overdue</dt><dd>{item.daysOverdue || '—'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Last renewed</dt><dd>{date(item.lastRenewalAt)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Renewal eligible</dt><dd>{item.renewalEligible ? 'Yes' : 'No'}</dd></div>
                  </dl>
                </Card>)}
              </div>
              <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
                <table className="min-w-[900px] divide-y divide-line text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase text-muted"><tr>
                    {['Listing', 'Owner ref.', 'Status', 'Expiry date', 'Days overdue', 'Last renewed', 'Renewal eligible'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-line">{preview.data.items.map((item) => <tr key={item.id}>
                    <td className="max-w-64 px-3 py-3"><span className="block break-words font-semibold">{item.title}</span><span className="text-xs text-muted">{item.publicId}</span></td>
                    <td className="px-3 py-3 font-mono text-xs">{item.ownerUserId.slice(0, 8)}</td>
                    <td className="px-3 py-3">ACTIVE</td>
                    <td className="px-3 py-3">{date(item.expiresAt)}</td>
                    <td className="px-3 py-3">{item.daysOverdue || '—'}</td>
                    <td className="px-3 py-3">{date(item.lastRenewalAt)}</td>
                    <td className="px-3 py-3">{item.renewalEligible ? 'Yes' : 'No'}</td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">Page {preview.data.page} of {preview.data.totalPages}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                  <Button type="button" variant="secondary" disabled={page >= preview.data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
                </div>
              </div>
            </>
          ) : <AdminEmpty title="No active listings match" description="Try another expiry filter or search term." />}
        </div>
      </Card>
      <ExpirySimulation />
    </section>
  );
}
