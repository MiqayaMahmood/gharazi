# GHARAZI-003E-03D1 — Listing Expiry Enforcement Readiness & Grandfathering Policy

## 1. Status

**ANALYSIS COMPLETE.** This is a source-based design. No application code, Prisma schema, database, queues, notifications, search documents, or environment configuration were changed or accessed. The historical figure of 3,632 overdue ACTIVE listings is not treated as current.

## 2. Existing components and lifecycle findings

| Capability | Current source behavior | Enforcement relevance |
|---|---|---|
| First publication | `ListingsService.publish()` transitions `draft` to `active`, sets `publishedAt` if absent, sets `expiresAt` to now + 90 days only if currently null, sets `lastRefreshedAt`, writes `ListingStatusHistory`, and indexes the listing. It does not recalculate a non-null expiry. | Reuse existing 90-day default semantics; no package-dependent term was found. |
| Refresh | `POST /listings/:id/refresh`; active only. Updates `lastRefreshedAt` and reindexes; does not extend expiry or change status. | Keep separate from expiry and renewal. |
| Seller renewal | `POST /listings/:id/renew`; owner/manager only; ACTIVE, non-deleted, non-null expiry; within 15 days or overdue; 90-day cooldown; free. A serializable transaction uses database time, conditional update, idempotency, and `AuditLog(action='listing.renewed')`. It leaves status and public search behavior unchanged. | Existing renewal cannot renew an `expired` status. If enforcement changes status, a reactivation/appeal policy is needed before that transition. |
| Sold/rented/archive | Explicit lifecycle routes use `ListingsService.transition()` with transactional `ListingStatusHistory`; the caller then reindexes or removes the listing. Archive deletes the search document. | Reuse history semantics, but automated expiry needs a conditional, expiry-aware transition and reliable side-effect recovery. |
| Expiry reminders | Daily reminder scheduler is registered, but `LISTING_EXPIRY_REMINDERS_ENABLED` defaults false and the worker checks the gate. It creates deduplicated in-app reminders for active, non-deleted listings; historical overdue reminders require separately configured `LISTING_EXPIRY_REMINDERS_BASELINE_AT`. No email is sent by this workflow. | Can be coordinated as a pre-expiry notice, but existing reminders do not enforce expiry and are not proof that a seller saw the notice. |
| Admin preview | Existing `/admin/listings` now includes guarded read-only metrics and stable paginated preview. It shows overdue dates separately from status and reports renewal eligibility informationally. | Reuse for dry-run/cohort review; current endpoint has no 30-day bucket or overdue-age bands. |
| Search visibility | Elasticsearch listing filters require `status='active'`; PostgreSQL fallback requires `status='active'` and `deletedAt=null`. Neither path filters on `expiresAt`. EXPIRED status is excluded by active-only filtering. | A status transition changes intended search eligibility, but a stale Elasticsearch document can remain visible until its document is updated/deleted. |
| Status/audit history | Listing transitions write `ListingStatusHistory`; `changedByUserId` is nullable, suitable for a system actor being absent. Ordinary transitions do not also write general `AuditLog`; renewal does. | An expiry transition should create explicit, queryable system history and an audit event within the same transaction. |

No listing-expiry enforcement route, scheduled job, worker processor, or public-search expiry predicate was found. The value of `expiresAt` becoming past does not itself change status, hide a listing, or stop renewal. No promotion rule should be inferred from listing expiry.

### Files and evidence reviewed

- `apps/api/src/modules/listings/listings.service.ts` — publish, refresh, renew, mark-status, archive, and transactional transition paths.
- `apps/api/src/modules/search/search.service.ts` — Elasticsearch active-status filter and PostgreSQL fallback filter.
- `apps/worker/src/jobs/listing-expiry-reminders/listing-expiry-reminders.service.ts` and processor — reminder gate, baseline, selection, deduplication, and in-app creation.
- `apps/api/src/modules/scheduler/scheduler.module.ts` — existing reminder schedule registration; no expiry-enforcement schedule.
- `apps/api/src/modules/admin-operations/admin-operations.controller.ts` and service — admin guards, current metrics and preview APIs.
- `prisma/schema.prisma` — listing expiry/status fields, listing status history, audit log, and current indexes.
- `packages/shared-config/src/index.ts` and `.env.example` — existing feature gates.
- Prior reports: `GHARAZI-003E-03A-LIFECYCLE-NOTIFICATION-AUDIT.md`, `GHARAZI-003E-03B-EXPIRY-REMINDERS-ACCEPTANCE.md`, and `GHARAZI-003E-03C-ADMIN-EXPIRY-PREVIEW-ACCEPTANCE.md`.

## 3. Grandfathering options

| Option | Seller / fairness impact | Inventory impact | Complexity, notices, and data | Audit and rollback |
|---|---|---|---|---|
| **A. Indefinite grandfathering** — ACTIVE listings overdue at the enforcement cutoff are not automatically expired; owner action/status change remains necessary. | Least surprising; sellers retain time to act. Fair for listings created before policy, but long-term sellers may never renew. | No initial reduction from the historical overdue cohort; new expiries can still be enforced under the new policy. | Requires an immutable cohort cutoff or explicit cohort record. Notices recommended but not a prerequisite for the grandfather exception. | Easy to explain and audit if cutoff is preserved. Reversal is straightforward because the cohort remains ACTIVE. This is an exemption rather than a complete enforcement policy.
| **B. Fixed grace period** — overdue at the approved cutoff receives, for example, 30 days before enforcement. | Clear deadline but can surprise sellers if notices fail or the deadline is not prominent. Fairer than immediate bulk action, but a single deadline treats all overdue ages alike. | Potentially large cohort impact around the same date; current affected count must be measured first. | Needs a durable activation/cutoff timestamp and grace policy. Requires advance in-app notices and a preview showing cohort and projected date. No per-listing expiry-date rewrite should be used to encode the grace period. | Auditable if cutoff is immutable. Reversal after status changes needs a controlled restore path; disabling the job does not restore already expired listings.
| **C. Staged overdue-age cohorts** — expire in waves according to overdue age (e.g. oldest first, then progressively newer cohorts). | Gives more runway to less-overdue sellers; policy can appear complex and arbitrary without clear published rules. | Spreads impact and improves capacity to monitor outcomes. | Highest operational complexity: stable cohort definitions, staged dates, notices per wave, and protection against repeated/overlapping batches. Requires a durable policy version/cutoff; not necessarily listing data migration if derived consistently. | Good cohort-level auditability when each wave has a recorded policy version. Rollback is still difficult after status/search changes; requires per-cohort stop and recovery controls.

**Recommendation for owner review:** Prefer **B, with an explicit activation cutoff and 30-day grace for the already-overdue cohort**, if the objective is eventual enforcement rather than permanent exemption. It bounds the legacy exception while offering notice time. The historical 3,632 count is not a usable rollout estimate; obtain a fresh read-only preview and validate seller notice delivery before choosing B. If a measurable owner impact or delivery assurance is unavailable, use A as an interim, no-enforcement policy until readiness criteria are met. Do not combine or activate these policies without owner selection.

For new listings becoming overdue after the chosen enforcement start, the owner must separately decide whether transition occurs immediately at expiry or after a standard grace window. The existing seller renewal endpoint only accepts ACTIVE listings, so sellers must have a clear renewal/review opportunity before the status transition.

## 4. Current impact assessment

No live database query or admin API request was made. The historical snapshot (15,191 ACTIVE; 3,632 overdue ACTIVE) is not current. The existing admin metrics API can provide current total, active, 1/7/15-day due, overdue, null-expiry, and recent-renewal values when queried by an authorized admin. It does not provide a 30-day bucket or overdue-age breakdown. The following read-only query is supplied for an owner-authorized Supabase SQL Editor run; it returns counts only and no personal data:

```sql
WITH clock AS (
  SELECT CURRENT_TIMESTAMP AS now
), active AS (
  SELECT l.expires_at
  FROM sch_gharazi.listings AS l
  WHERE l.status = 'active'
    AND l.deleted_at IS NULL
), listing_counts AS (
  SELECT
    COUNT(*) AS active_total,
    COUNT(*) FILTER (WHERE expires_at < clock.now) AS overdue,
    COUNT(*) FILTER (WHERE expires_at >= clock.now AND expires_at <= clock.now + INTERVAL '1 day') AS due_within_1_day,
    COUNT(*) FILTER (WHERE expires_at >= clock.now AND expires_at <= clock.now + INTERVAL '7 days') AS due_within_7_days,
    COUNT(*) FILTER (WHERE expires_at >= clock.now AND expires_at <= clock.now + INTERVAL '15 days') AS due_within_15_days,
    COUNT(*) FILTER (WHERE expires_at >= clock.now AND expires_at <= clock.now + INTERVAL '30 days') AS due_within_30_days,
    COUNT(*) FILTER (WHERE expires_at IS NULL) AS null_expiry,
    COUNT(*) FILTER (WHERE expires_at < clock.now AND expires_at >= clock.now - INTERVAL '30 days') AS overdue_1_to_30_days,
    COUNT(*) FILTER (WHERE expires_at < clock.now - INTERVAL '30 days' AND expires_at >= clock.now - INTERVAL '90 days') AS overdue_31_to_90_days,
    COUNT(*) FILTER (WHERE expires_at < clock.now - INTERVAL '90 days') AS overdue_more_than_90_days
  FROM active CROSS JOIN clock
), renewed AS (
  SELECT COUNT(DISTINCT a.entity_id) AS recently_renewed_active
  FROM sch_gharazi.audit_logs AS a
  JOIN sch_gharazi.listings AS l ON l.id = a.entity_id
  CROSS JOIN clock
  WHERE a.action = 'listing.renewed'
    AND a.entity_type = 'listing'
    AND a.created_at >= clock.now - INTERVAL '90 days'
    AND l.status = 'active'
    AND l.deleted_at IS NULL
)
SELECT listing_counts.*, renewed.recently_renewed_active
FROM listing_counts CROSS JOIN renewed;
```

Due-within figures are cumulative (the 1-day cohort is also in 7/15/30-day totals); overdue-age bands are disjoint. A listing expiring exactly at `CURRENT_TIMESTAMP` is due now, not overdue. If the owner also needs total non-deleted listings across all statuses, query that separately; enforcement cohort is ACTIVE/non-deleted only.

## 5. Proposed enforcement architecture (not implemented)

1. **Separate default-off gate.** Introduce a proposed `LISTING_EXPIRY_ENFORCEMENT_ENABLED=false`; absence, invalid values, or false must fail closed. Add a separate dry-run control defaulting to true. Neither existing feature gate controls enforcement.
2. **Explicit immutable policy cutoff.** Store/review the selected policy version and cutoff independently of process start/deployment time. A configuration value alone is operationally fragile; prefer a durable activation record or immutable release record. Do not rewrite historical `expires_at` values to encode grandfathering.
3. **Read-only dry run.** Reuse admin metrics/preview and a bounded selector to count/list the exact candidates under the chosen cutoff and policy. Dry run must not enqueue, notify, write status/history, or index. Require signed-off counts/cohorts and a time-stamped artifact before moving to write mode.
4. **Bounded due selection.** Use database time and keyset pagination on `(expires_at, id)`; select only `status='active'`, `deleted_at IS NULL`, `expires_at IS NOT NULL`, and policy-eligible rows. Cap batch size and frequency; check the gate between batches. Exclude promotions and do not change expiry dates.
5. **Atomic transition.** In a transaction, conditionally update only when ID, ACTIVE status, non-deleted state, and selected expiry/cutoff still match. On a one-row CAS win, write `ListingStatusHistory` (`active` → `expired`) and an audit event with system actor, reason/policy version, original expiry, cutoff, and stable event/idempotency identity. A losing/repeated attempt is a no-op. Never create history on a failed CAS.
6. **Notification sequence.** Existing 15/7/1-day in-app reminders may be reused as advance notices, but delivery is only persisted in-app and there are no user notification preferences in the current model. Confirm notice policy, recipient scope, and grace interval. Send/ensure the final notice before the status transition, not after the listing becomes ineligible for current renewal. Deduplicate by listing + expiry cycle + policy stage. Do not add email without separate consent and delivery design.
7. **Search side effects.** After the database transition, update/remove the existing Elasticsearch document using its stable listing ID through existing indexing services. PostgreSQL fallback excludes non-ACTIVE status immediately. A failed ES update can temporarily leave an ACTIVE document visible in Elasticsearch. Use durable intent/retry or a reconciler and expose failure counts before relying on search parity. Do not issue a full reindex.
8. **Failure and recovery.** Persist transition and side-effect intent atomically (reuse a compatible generic outbox if one exists; current reviewed outbox work is promotion-specific). If none supports listing lifecycle events, a small additive outbox/event schema may be needed. Consumers must be idempotent, acknowledge only after success, retain terminal failures, and support bounded manual replay. Do not rely solely on BullMQ job IDs for permanent deduplication.
9. **Stop/rollback.** Disabling the enforcement gate stops new claims/batches after the current transaction; it does not reverse already committed `expired` statuses, notices, or index operations. Keep a per-run/cohort ledger and admin visibility. Before activation, define a separately authorized restore/review path; do not promise rollback by toggling the flag.

## 6. Feature gates and schedules

Verified existing gates:

| Gate | Existing behavior | Enforcement relationship |
|---|---|---|
| `PROMOTION_ACTIVATION_ENABLED` | Defaults false in shared config; gates scheduled promotion activation/outbox delivery. | Must remain independent; must neither enable nor disable listing expiry enforcement. |
| `LISTING_EXPIRY_REMINDERS_ENABLED` | Defaults false; checked by reminder worker before reads/creation and for queued generation work. | Controls reminder generation only. Enforcement cannot use it as its write gate. |
| `LISTING_EXPIRY_REMINDERS_BASELINE_AT` | Optional explicit cutoff for overdue reminder eligibility; not synthesized from startup time. | Reminder-specific baseline; do not reuse as enforcement grandfathering cutoff. |

No listing-enforcement flag or schedule currently exists in the inspected shared config/source. A future worker schedule must be separately registered, default-off, and checked at processor/service entry so existing queued jobs cannot bypass it. Config changes require restarting the consuming process under the existing startup configuration pattern. A gate does not undo committed transitions.

## 7. Performance and index recommendations

The listing model has indexes including `(status, published_at)` and `(owner_user_id, status)`, but no expiry-oriented index. The current admin expiry aggregate/preview can scan active rows; future due selection needs efficient range access.

Candidate for query-plan review, **not a migration proposal yet**:

```sql
CREATE INDEX CONCURRENTLY listings_active_expiry_id_idx
ON sch_gharazi.listings (expires_at, id)
WHERE status = 'active' AND deleted_at IS NULL AND expires_at IS NOT NULL;
```

This partial B-tree could support due/overdue range selection and stable keyset pagination while omitting irrelevant statuses, soft-deleted rows, and null expiry. `CREATE INDEX CONCURRENTLY` has operational constraints and cannot run inside a transaction block; an owner/DBA must inspect the actual query plan, table size, write load, and existing physical indexes first. Do not apply this SQL as part of this phase. It does not by itself optimize counts for active rows with null expiry or the full ACTIVE total. Renewal-history counts may need a composite `audit_logs` index only if measured plans show the existing `action`, `entityType/entityId`, and timestamp indexes are insufficient.

## 8. Owner decision worksheet

Please select and document before implementation:

| Decision | Proposed starting point | Owner selection |
|---|---|---|
| Grandfather policy for listings already overdue at cutoff | B: fixed 30-day grace, contingent on fresh cohort counts and notice readiness; A is the conservative interim choice. | ☐ A ☐ B ☐ C ☐ Other: ___ |
| Grace for listings that become overdue after enforcement starts | 15-day grace aligned to current early-renewal window, or immediate at expiry only if explicit notice/recovery policy is approved. | ☐ 0 days ☐ 15 days ☐ Other: ___ |
| Enforcement activation cutoff/time zone | Explicit timestamp recorded after dry-run approval; never infer deployment time. | Timestamp/time zone: ___ |
| Seller notice obligations | In-app 15/7/1-day notices plus final notice and adequate response window; decide whether email is excluded. | Policy/notice owner: ___ |
| Dry-run acceptance criteria | Fresh SQL cohort counts reconcile with admin preview; sample and total counts reviewed; zero writes/notifications; query plan and stale-index risk accepted. | Thresholds/approver: ___ |
| Batch size and cadence | Start conservatively (e.g. 100 listings per batch, daily) and adjust only from staging/load evidence. | Size/cadence: ___ |
| Stop and rollback strategy | Gate-off + stop new batches; explicit admin restore/review procedure for committed transitions; no automatic bulk restoration. | Recovery owner/SLA: ___ |
| Seller renewal after expiry transition | Current renewal accepts ACTIVE only; decide whether expired listings can be restored/reviewed or must be renewed before enforcement. | ☐ Keep ACTIVE-only ☐ Add approved recovery path ☐ Other: ___ |
| Admin access and reporting | Extend existing `/admin/listings` with cohort/run results and failures; define roles and retention. | Roles/retention: ___ |

## 9. Risks and limitations

- **High — irreversible seller impact:** existing renewal rejects non-ACTIVE listings, and current seller publish flow accepts drafts only. Expiring listings could strand sellers without an approved recovery route.
- **High — stale search documents:** PostgreSQL visibility changes at status commit, but Elasticsearch can remain stale if indexing fails. Durable retry/reconciliation must be accepted before enforcement.
- **High — historical cohort uncertainty:** 3,632 is a historical snapshot; activation impact cannot be sized until current read-only counts are captured.
- **Medium — reminders are not guaranteed user notice:** reminders are in-app only, delivery/preferences do not establish that the seller saw them, and the reminder gate is independent.
- **Medium — index/query load:** no expiry index exists in the inspected schema; mass selection and admin aggregate queries may scan the listings table.
- **Medium — status-history/audit gap:** existing ordinary listing transition writes status history but not a general audit row; automated system action needs explicit actor/reason/policy traceability.
- **Operational limitation:** no live database, runtime, queue, or search status was inspected. No current inventory or query plan is claimed.

## 10. Recommended implementation phases

1. **03D2 — Policy and cohort preview:** obtain owner decisions; add read-only 30-day/age-band admin preview and a durable, reviewable cutoff/cohort artifact. No status changes.
2. **03D3 — Dry-run processor:** implement bounded candidate selection and reporting behind a new default-off enforcement gate, with dry-run forced on. Verify isolated fixtures and staging query plans; no writes or notifications.
3. **03D4 — Transaction and side-effect readiness:** implement/extend atomic status/history/audit and durable indexing/notification intent with failure visibility; dry-run remains default. Approve any additive schema separately.
4. **03D5 — Controlled enforcement approval:** only after fresh impact review, seller notice confirmation, recovery path, measured index plan, staging acceptance, monitoring, and explicit owner activation approval. This phase must retain a separate stop gate and must not include automatic expiry-date rewrites.

No phase is approved by this design document. The next action is for the owner to fill the policy worksheet and run the SELECT-only cohort query through the authorized Supabase process.
