# GHARAZI-003E-03A — Lifecycle, Notifications & Feature-Flag Audit

## 1. Executive summary

This was a source/documentation audit only. No application code, schema, environment configuration, database, queue, search index, or external provider was changed or accessed. Existing local changes from GHARAZI-003E-02C-R1 were preserved.

Confirmed facts:

- Listing `expiresAt` is assigned a 90-day date on first publication if no date exists. An expiry date passing does not itself change status or public visibility.
- There is no listing-expiry worker, scheduled job, API enforcement path, or public-search expiry predicate in the inspected source.
- Seller renewal is now an explicit owner/manager action under the approved 90-day / 15-day-window / 90-day-cooldown policy. Refresh is a separate freshness operation.
- The only expiry-related feature gate found is `PROMOTION_ACTIVATION_ENABLED`, which gates scheduled paid promotion activation and its outbox delivery. It does not stop the API scheduler from registering its repeatable jobs.
- Generic notification jobs are still a placeholder for email/SMS/push delivery. In-app notifications are persisted and displayed. Promotion activation notifications have a separate outbox-backed in-app flow.
- `/admin/listings` is the best existing page to extend, but its current API returns at most 200 updated listings and the UI does not show expiry. There is no expiry preview or complete count endpoint.
- The historical count of 3,632 active overdue listings is retained as a prior snapshot only; it was not rechecked.

Recommended order: implement disabled-by-default, in-app seller reminders first; then an admin read-only preview; consider enforcement only after preview, grandfathering policy, and separate explicit owner activation approval.

## 2. Listing lifecycle inventory

| Operation | Route / implementation | Authorization and fields | History, indexing, automation |
|---|---|---|---|
| Draft creation | `POST /listings`; `ListingsController.create` → `ListingsService.create` | JWT; authenticated user becomes owner; Prisma status default is `draft` | Creates `ListingStatusHistory` from `null` to `draft`; no search indexing until publication. No deletion/restoration route was found in the listing controller/service; `deletedAt` exists as a field and is filtered in public/owner reads. |
| Edit | `PATCH /listings/:id`; `ListingsService.update` | JWT; owner/manager check (`assertCanWrite`); DTO fields do not include lifecycle timestamps/status | Updates active listing document through existing indexing service. The DTO does not expose `expiresAt`, `status`, `publishedAt`, or `deletedAt`. |
| Initial publication | `POST /listings/:id/publish`; `ListingsService.publish` | JWT; owner/manager; only `draft`; required fields checked | Changes status to `active`; sets `publishedAt` if absent; sets `expiresAt` to now + 90 days only if it is null; updates `lastRefreshedAt`; writes status history in `transition`; indexes listing. No package/subscription duration rule. |
| Refresh | `POST /listings/:id/refresh`; `ListingsService.refresh` | JWT; `assertCanManage` permits owner/manager and admin/moderator; status must be `active` | Updates `lastRefreshedAt`, then indexes listing. Does not extend expiry or change status. |
| Renewal | `POST /listings/:id/renew`; `ListingsService.renew` | JWT; owner or manager only (admin/moderator role alone is insufficient); active, non-deleted, non-null expiry; within 15 days or overdue; one successful renewal per rolling 90 days | Serializable transaction, server/database timestamp, conditional update and same-transaction `AuditLog` entry `listing.renewed`. Extends by 90 days from `max(expiry, renewal time)`. Does not change status, `updatedAt`, search index, promotion, or payment state. See `GHARAZI-003E-02C-RENEWAL-ACCEPTANCE.md`. |
| Sold / rented | `POST /listings/:id/mark-sold`, `POST /listings/:id/mark-rented`; `ListingsService.markStatus` | JWT; existing owner/manager and admin/moderator management rules; active-only transition | `transition` writes `ListingStatusHistory`; listing is reindexed with new status. No expiry-based trigger. |
| Archive | `POST /listings/:id/archive`; `ListingsService.archive` | JWT; manager policy; draft or active allowed; archived/expired is idempotently returned; other statuses conflict | `transition` writes status history; existing search document is deleted. No automatic archive on date. |
| Moderation | Admin operations review and `ModerationService.applyAction` | Admin/moderator guard conventions; rejection/hide sets `rejected` | Index deleted on rejection; admin review also creates notification and audit. These are explicit moderation actions, not expiry enforcement. |
| Expired status | Status value is represented as free-form string and is handled by some guards, but no listing-expiry transition route or scheduled processor was found | Not automatically assigned | An `expiresAt` in the past and status `expired` are distinct facts. Existing ACTIVE overdue listings remain status ACTIVE. |
| Hard delete / restore | No listing delete/restore API or service method found in the inspected listing module | N/A | `deletedAt` is modeled and read filters use it, but its listing write path was not found in these routes/services. |

Seller lifecycle transitions use `ListingStatusHistory`; they do not generally create a corresponding general `AuditLog` row in `ListingsService.transition`. Renewal is an exception and writes `AuditLog`. Admin audit metadata is allowlisted in `AdminOperationsService.safeAuditMetadata`; `listing.renewed` is not on that allowlist, so administrators can see its action/entity/time row but not its renewal metadata in the current Audit Logs UI.

## 3. Exact feature-flag and related configuration inventory

The environment schema is `packages/shared-config/src/index.ts`, consumed by API and worker `ConfigModule.forRoot({ validate: validateEnv })`. `.env.example` was read; the local `.env` contents were not read.

| Name | Consumer / behavior | Absent / false / true | Schedule and queued-job behavior | `.env.example` / restart |
|---|---|---|---|---|
| `PROMOTION_ACTIVATION_ENABLED` | Worker `PromotionLifecycleService.activateDuePromotions()` and `PromotionActivationDeliveryService.enabled()` | Shared config defaults false. Missing, empty, or any string other than case-insensitive `true` parses false. False prevents scheduled paid promotion activation and promotion activation outbox side effects. True allows due promotion validation/activation and outbox dispatch/consumption. | `SchedulerModule.onModuleInit()` in the API registers `activate-due` every 10 minutes regardless of this flag. The schedule does not bypass the worker service gate. With false, queued activation jobs are consumed as no-ops; recurring entries remain. An already queued promotion outbox notification may be consumed without acknowledgment while disabled; its persisted outbox state can be reconsidered by the dispatcher after re-enable. The flag does not undo already completed activations or stop unrelated generic notifications. | **Not listed** in `.env.example`; default is explicit in shared config. Worker process must restart/redeploy to load changed environment. No runtime state was inspected. |
| `SEARCH_ENABLED` | API `SearchService.searchListings`, projects, and similar searches | Defaults true in shared config and `.env.example`. False routes supported listing/project searches to PostgreSQL fallback rather than Elasticsearch. True uses Elasticsearch, then existing fallback behavior on errors. | Not a lifecycle automation flag. Does not gate the search indexing worker or remove queued jobs/documents. | Listed as `true`. API process must restart/redeploy for environment changes. |
| `SEARCH_DB_FALLBACK_ENABLED` | API `SearchService.dbFallbackEnabled()` | Defaults true in shared config and `.env.example`. False makes fallback-dependent searches unavailable when Elasticsearch is disabled/unavailable; true permits PostgreSQL fallback. | Does not gate lifecycle schedules or queued indexing work. | Listed as `true`. API process must restart/redeploy for environment changes. |
| `RESEND_API_KEY` / `EMAIL_FROM` (provider configuration, not lifecycle flags) | API `EmailService.sendPasswordReset()` only | Missing key uses development logging behavior; configured key attempts Resend password-reset email. No listing reminder consumer uses it. | No expiry schedule or queued listing reminder exists. | Present in example. API reads configuration at process initialization/use; provider state is not a listing feature gate. |

No `LISTING_EXPIRY_*`, `LISTING_RENEWAL_*`, `LISTING_REFRESH_*`, `NOTIFICATIONS_ENABLED`, or generic notification delivery flag was found in the shared environment schema or searched API/worker source. Renewal and refresh are explicit authenticated requests, not scheduled features.

### Promotion activation operator checklist (proposal only; not executed)

**Before enabling**

1. Keep the worker flag false while verifying the approved promotion-outbox schema and migration history using the separately approved migration reconciliation process. Source review cannot establish current database migration state.
2. Review worker/API release versions, queue and outbox health through the approved operational process; this audit did not access Railway, Redis, or live systems.
3. Confirm the paid promotion, payment evidence, eligibility, transactional audit/outbox, retry, and side-effect behavior against isolated staging data. Do not use live records or payments.
4. Confirm who approves activation, the observation window, alert owner, and rollback contact.
5. Set `PROMOTION_ACTIVATION_ENABLED=true` only for the worker environment and restart that worker process so validated configuration is loaded. The API schedule is already registered by API startup; do not create another schedule.
6. Monitor activation counts, failed/terminal outbox effects, duplicate/audit anomalies, queue failures, and listing featured flags through approved operational tooling. Do not infer success from enqueue counts alone.

**To deactivate**

1. Set the worker flag to false and restart the worker process.
2. Verify the loaded configuration is false using an approved, non-secret operational indicator.
3. Expect existing repeatable scheduler entries to remain registered and future activation jobs to be consumed as no-ops. Do not remove or drain queue jobs as part of this flag change.
4. The gate does not roll back already activated promotions or completed notifications/indexing. Any outbox effects left pending/enqueued remain a recovery concern for a later approved enablement; review before re-enabling.
5. Record the change and obtain a separate approval before any later reactivation.

This is an operator proposal, not a production runbook validated against current deployment configuration.

## 4. Schedules and expiry automation

`apps/api/src/modules/scheduler/scheduler.module.ts` registers repeatable BullMQ jobs in `onModuleInit()`:

| Queue action | Cadence | Source processor behavior |
|---|---|---|
| Promotion `activate-due` | Every 10 minutes | `PromotionLifecycleProcessor` delegates to gated `PromotionLifecycleService`; false/missing flag returns without activation. |
| Promotion `end-expired` | Every 15 minutes | Processor logs that promotion expiration remains disabled; no expiry transition is called. |
| Subscription `expiry-reminder` | Daily at 09:00 | `SubscriptionAlertsProcessor` logs and contains a TODO; does not send reminders or expire subscriptions. |
| Analytics `daily-rollup` payload | Hourly at minute 15 | Not a listing-expiry workflow. |

No listing-expiry recurring job, queue action, worker processor, or `@Cron` path was found. Promotion expiration and subscription reminder schedules exist but their corresponding processors are placeholders. The recurring jobs are registered from the API app and jobs are consumed by worker processors; the API scheduler registration is not conditionally controlled by the promotion activation flag.

## 5. Notification architecture and readiness

| Capability | Status | Evidence / limitation |
|---|---|---|
| In-app notification creation and listing | IMPLEMENTED | `NotificationsService.create()` persists a `Notification`; `/notifications` lists up to 50 newest for the authenticated user; read/read-all routes mutate only the caller's records; dashboard `NotificationsClient` shows unread state and destinations. |
| Generic queue delivery | PLACEHOLDER | `NotificationsService.create({queueDelivery:true})` enqueues `deliver-notification`; generic `NotificationsProcessor` only logs and has a TODO to connect SMS/email/push and update delivery rows. It does not prove delivery. The generic create path creates an `in_app` delivery row marked `sent` immediately, so that status represents persisted inbox insertion, not external provider delivery. |
| Promotion activation in-app notification | IMPLEMENTED (specific flow) | Promotion activation outbox delivery creates a stable-ID `Notification` and delivery record transactionally and acknowledges the effect. It is protected by `PROMOTION_ACTIVATION_ENABLED`. This promotion-specific outbox is not a general listing reminder system. |
| Email provider | PARTIAL / NOT FOR LISTING REMINDERS | `EmailService` sends password reset through Resend when configured. No expiry-reminder email template or worker path was found. |
| Notification preference / opt-out model | MISSING | No notification preference model/lookup was found in Prisma or notification service. Do not introduce email reminders until consent, frequency, and preference policy is decided. |
| Generic notification deduplication | MISSING | `Notification` has a UUID primary key and payload but no source/deduplication key or event uniqueness. Generic queue delivery has no durable consumer acknowledgment/retry state in this processor. |
| Admin notification failure visibility | PARTIAL | Existing System Events and System Health pages are reusable for operational errors, but no listing-reminder delivery state or expiry reporting is exposed. |

Relevant sources: `apps/api/src/modules/notifications/notifications.service.ts`, `notifications.controller.ts`, `apps/worker/src/jobs/notifications/notifications.processor.ts`, `apps/worker/src/jobs/promotions/promotion-activation-delivery.service.ts`, `apps/web/components/notifications/notifications-client.tsx`, and `apps/web/app/(dashboard)/dashboard/notifications/page.tsx`.

### Reminder workflow proposal (not implemented)

Candidate offsets are 15, 7, and 1 day before the current expiry, plus a one-time after-expiry reminder only while the listing remains ACTIVE. The 15-day message aligns with renewal eligibility. A bounded daily selector should query `status='active'`, `deletedAt IS NULL`, non-null `expiresAt`, and a specific due window; recipient, channel, and local-time policy need owner decisions. Each reminder event must be keyed to both the listing and the exact expiry snapshot, so a successful renewal produces a new cycle without duplicating reminders for the old expiry. At delivery time, recheck current status and expiry; archived/sold/rented/rejected/deleted listings and listings whose expiry changed should be skipped/cancelled.

Do not replay a reminder for every historical overdue listing on first enablement. Start with future dates after an explicit cutoff, preview counts first, and separately decide whether/how to notify overdue cohorts. Prefer in-app only for the first batch. Email remains deferred until preference/consent, templates, delivery state, retries, and failure visibility are approved and implemented.

For in-app deduplication, the existing `Notification` primary key could support a stable event ID with an upsert, but `NotificationsService` currently accepts no idempotency identity. A focused extension and isolated tests are required. If durable retry state or external delivery is required, use an additive reminder/outbox or deduplication structure with a unique `(listing, expiry snapshot, reminder type)` identity; do not reuse the promotion-specific table as if it were generic. Add `LISTING_EXPIRY_REMINDERS_ENABLED` as a new proposed flag, explicit false by default, and check it in both the selector/dispatcher and consumer. Existing schedules must be safe no-ops while disabled; already queued events must also check the gate and preserve retryable intent. No such variable exists today.

## 6. Admin expiry preview

Reuse the existing integrated `/admin/listings` page (`apps/web/app/admin/listings/page.tsx` → `AdminResourceClient`) and existing admin authentication/role guard. Do not create another dashboard.

Current data path: `GET /admin/listings?status=...` → `AdminOperationsService.listings()`. It filters optionally by status, orders by `updatedAt DESC`, includes owner/city/area/property type, and returns at most 200 rows. It does not constrain `deletedAt`; its UI columns show title, owner, city, verification, and status, not expiry. The full record response contains `expiresAt`, but the page cannot provide complete counts or complete expiry cohorts from a capped arbitrary subset. The existing overview counts all listings, without expiry breakdown.

Proposed read-only preview fields:

- Total eligible ACTIVE/non-deleted listings.
- Counts approaching expiry, overdue, and missing expiry.
- Recently renewed count/list from `AuditLog.action='listing.renewed'` within an owner-approved period.
- Simulated impact by proposed cutoff/grace/grandfathering cohorts, clearly labeled as estimates and no mutations.
- A bounded, stable paginated listing of affected IDs/public IDs, expiry date, status, and safe location/owner labels.

Use server-side `COUNT`/aggregate queries and cursor or keyset pagination (`expiresAt`, then unique `id` tie-breaker); do not download all listings into the browser. Require admin authorization on every endpoint. Current `Listing` indexes include owner/status, status/publishedAt, location/status, and purpose/type; there is no listing `expiresAt` index. The table is not large enough in the historical snapshot to estimate current query cost, and this audit did not run `EXPLAIN` or database queries. Benchmark on isolated/staging data and review plans before rollout; a composite/partial index may be needed, but should be justified and proposed separately. Renewal audit queries also have no dedicated `(action, entity_id, created_at)` index.

## 7. Historical listing safeguards

The figures 16,157 total listings, 15,191 ACTIVE, and 3,632 ACTIVE overdue are historical snapshots only. No current counts were verified. No source change or data operation here expires, hides, archives, or changes overdue listings.

Grandfathering options for owner decision (none selected):

1. **Publication cutoff:** enforce only for listings first published after a declared cutoff; existing inventory remains visible until seller action or a separately approved transition.
2. **Grace cohort:** notify all current overdue sellers, provide a defined grace period and free renewal path, then preview the remaining impact before enforcement approval.
3. **Age bands:** preview and phase old overdue cohorts with an explicit opt-out/renewal period, approved per cohort.

Each option requires a decision about historical ACTIVE listings, future overdue listings, missing expiry dates, timezone/grace boundary, exceptions, manual admin overrides, and whether expiry changes status, search visibility, or both. Do not infer these rules from the renewal policy.

## 8. Search and indexing safeguards

- Elasticsearch listing filter in `SearchService.listingFilters()` filters `status='active'` and search criteria; it has no `expiresAt` range.
- PostgreSQL fallback in `searchListingsWithDbFallback()` filters `status='active'` and `deletedAt IS NULL`; it has no `expiresAt` predicate.
- Elasticsearch similar-listing query and PostgreSQL fallback also use active status without expiry filtering.
- Public listing detail and batch reads filter `deletedAt` and a public-status set, not expiry. Thus a past expiry alone does not make an ACTIVE listing invisible. Search limits to active status; detail can also return sold/rented statuses.
- `SearchDocumentBuilder.buildListingDocument()` does not index expiry. Renewal intentionally does not enqueue indexing. Existing publish, refresh, archive, sold/rented, moderation and normal edit paths use the existing indexing service as applicable.
- A future transition to a non-active status would require deleting/updating the existing Elasticsearch document through the established indexing queue/service and a safe retry/reconciliation plan. PostgreSQL fallback must apply equivalent status and deletion eligibility. This audit changes no Buy/Rent purpose, classification, ranking, or index behavior.

## 9. Reuse and implementation status matrix

| Area | Status | Reuse path / confirmed gap |
|---|---|---|
| Publication and expiry date | IMPLEMENTED | Reuse `ListingsService.publish`; fixed 90-day initial date when null. No package-specific duration. |
| Manual refresh | IMPLEMENTED | Keep `ListingsService.refresh` and existing dashboard action distinct from renewal. |
| Seller renewal | IMPLEMENTED | Reuse listing lifecycle endpoint/service, audit log and My Listings; approved policy is enforced. |
| Automatic listing expiry | MISSING (intentionally absent) | No status/filter/worker/scheduler; do not introduce before explicit policy approval. |
| Promotion activation flag | IMPLEMENTED | Worker service and outbox delivery use explicit false default. Scheduler registration itself is unconditional. |
| Promotion expiry schedule | PLACEHOLDER | API registers repeatable `end-expired`; processor only warns and performs no transition. |
| Subscription reminder schedule | PLACEHOLDER | Daily schedule exists; processor TODO; no notification/expiry behavior. |
| Generic in-app notification | IMPLEMENTED | Existing Notification API/UI works for stored rows. Generic sender pipeline is not a reliable external delivery system. |
| Generic external notification | PLACEHOLDER | Worker processor logs only; no email/SMS/push delivery or delivery-state updates. |
| Expiry reminders | MISSING | No event selector, reminder policy, dedupe identity, listing reminder schedule, or preference mechanism. |
| Admin expiry preview | MISSING | Extend `/admin/listings`; current capped list/columns cannot calculate complete preview. |
| Search expiry filtering | NOT REQUIRED / ABSENT BY POLICY | Neither ES nor PostgreSQL fallback filters on `expiresAt`; preserve until enforcement is separately approved. |
| Renewal audit detail in Admin | PARTIAL | Audit row exists, but metadata allowlist strips renewal metadata. Add safe expiry-specific fields if admin needs complete review. |

## 10. Minimal implementation roadmap (recommendations only)

### GHARAZI-003E-03B — Seller Expiry Reminders

- **Scope:** One-time idempotent in-app reminders at owner-approved offsets; do not send email initially. Recheck listing status and expiry at delivery. Do not auto-expire or change public visibility.
- **Reuse:** Existing `Notification` table/API/UI, notification destination conventions, queue patterns only where a real consumer exists, and existing observability. Do not reuse the promotion-specific outbox as a general reminder queue.
- **Schema:** Stable Notification primary ID/upsert may suffice for in-app-only dedupe if its derivation and upsert are implemented carefully. Durable retry/external delivery likely requires an additive event/dedupe key or reminder ledger. Decide after delivery-channel scope; do not apply migration without approval.
- **Flag:** Proposed new `LISTING_EXPIRY_REMINDERS_ENABLED=false`; must gate schedule/producer and consumer. No flag exists today.
- **Tests:** Due-window boundaries/timezone; exact expiry-snapshot dedupe; renewal changes cycle; status/deletion/expiry recheck; repeated/concurrent scan; queue failure/retry; disabled gate; no email; no listing mutation.
- **Acceptance:** Preview/log-only dry run first; disabled default; no production sends until separately approved; in-app effect acknowledged only once; failures visible/recoverable.
- **Dependencies / risk:** Owner chooses offsets, recipient(s), timezone, behavior for overdue inventory, notification read/retention policy, and whether managers also receive alerts. Medium risk because reminders can create noisy or duplicate seller contact if keying is wrong.

### GHARAZI-003E-03C — Admin Expiry Preview

- **Scope:** Read-only summary counts and paginated affected listings in the existing Admin Listings page; simulate policy/grandfathering scenarios without writes.
- **Reuse:** Existing `apps/web/app/admin/listings`, `AdminResourceClient`/admin UI components, `AdminOperationsController` role guards, Prisma Listing and renewal AuditLog.
- **Schema:** No status/data change. Validate query plans; consider a focused `expiresAt`/status/deleted index and renewal-audit index only if measured plans justify it. Any index migration is a separate review/approval.
- **Flag:** No processing flag needed for read-only preview; keep preview visibly separate from any future action.
- **Tests:** Counts against fixtures, null/overdue/window boundaries, deleted/non-active exclusion, cursor stability/no duplicates, admin authorization, query bounds, no mutation.
- **Acceptance:** Counts reconcile with the returned cohort using deterministic filters; every result can be paged; no truncated 200-row interpretation; endpoint remains read-only.
- **Dependencies / risk:** Owner approves metric windows and preview visibility for moderators. Low-to-medium risk; main concern is expensive scans or misleading stale counts.

### GHARAZI-003E-03D — Controlled Expiry Enforcement

- **Scope:** Separate future design and implementation only after 03C evidence and explicit owner approval. Define status versus visibility effect, reversible/reactivation flow, notification/grace stages, and controlled cohorts. No policy is selected here.
- **Reuse:** Listing lifecycle transition and status history, SearchIndexingService with durable retry/reconciliation, admin preview, seller renewal, and the audited feature-gate pattern from promotions (adapted; do not reuse promotion flag).
- **Schema:** Unknown until policy. May need an expiry transition audit/idempotency ledger, not merely a date comparison. Prepare additive migration only if the selected safeguards need it.
- **Flag:** Proposed `LISTING_EXPIRY_ENFORCEMENT_ENABLED=false`, fail-closed and checked inside worker/service; no recurring schedule until separately approved. Gate must protect already queued jobs too.
- **Tests:** Cutoff/grandfather cohorts; eligible status and missing date; concurrency/idempotency; rollback; no unauthorized action; indexing and PostgreSQL parity; disabled-default and queued-job no-op; reversibility; no payment/promotion mutation.
- **Acceptance:** Admin preview approved; dry-run cohort signed off; canary/rollback and monitoring documented; separate activation approval. No bulk transition or production enablement under this audit.
- **Dependencies / risk:** Owner must decide grandfather cutoff/grace, missing expiry, statuses, public detail vs search visibility, manual overrides, renewal relationship, promotion interaction, and rollback. High risk because existing inventory includes historically overdue ACTIVE listings.

## 11. Owner decisions required

1. Reminder offsets and whether the after-expiry reminder is sent once or repeated.
2. Recipient: owner only or owner plus authorized manager; local delivery time and notification preferences/opt-out.
3. First rollout cohort and explicit cutoff for historically overdue listings; avoid a first-run notification burst.
4. In-app-only 03B scope versus email; recommendation is in-app-only and defer Resend until preferences and worker delivery are real.
5. Admin preview scope: which roles can view owner identifiers and which date ranges define “approaching” and “recently renewed.”
6. 03D grandfathering, grace period, status/visibility behavior, missing expiry treatment, exceptions, and manual override policy.
7. Separate owner approval before any flag is enabled, schedule is registered for expiry work, or production records are changed.

## 12. Risks and limitations

- Source review cannot confirm currently deployed environment values, scheduler repeatable-job state, Redis contents, worker uptime, database row counts, or Elasticsearch document parity. No such access was attempted.
- `.env.example` omits `PROMOTION_ACTIVATION_ENABLED` even though shared config defaults it false. Operators should not mistake omission for no gate; the checked-in environment example should be updated only in a future approved implementation task.
- The API scheduler registers promotion/subscription/analytics recurring jobs unconditionally. A false worker flag protects promotion activation mutations but does not unregister repeatable jobs.
- Generic notification worker jobs can be acknowledged by BullMQ after only logging; they do not establish external delivery. `NotificationDelivery` updates and provider integrations are not implemented for this generic path.
- Expiry counts from past snapshots are not current. Existing active overdue listings must remain unchanged until explicit policy and rollout approval.
- Listing `expiresAt` has no listing index in Prisma schema; large-scale preview/enforcement query cost must be measured before deployment.
- Renewal action metadata is not currently displayed by Admin Audit Logs because the safe metadata allowlist does not include `listing.renewed`.

## 13. Files inspected

- `apps/api/src/modules/listings/listings.controller.ts`
- `apps/api/src/modules/listings/listings.service.ts`
- `apps/api/src/modules/listings/dto/create-listing.dto.ts`
- `apps/api/src/modules/listings/dto/update-listing.dto.ts`
- `apps/api/src/modules/search/search.service.ts`
- `apps/api/src/modules/scheduler/scheduler.module.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/modules/email/email.service.ts`
- `apps/api/src/modules/admin-operations/admin-operations.controller.ts`
- `apps/api/src/modules/admin-operations/admin-operations.service.ts`
- `apps/api/src/modules/moderation/moderation.service.ts`
- `apps/worker/src/worker.module.ts`
- `apps/worker/src/jobs/notifications/notifications.processor.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.processor.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.service.ts`
- `apps/worker/src/jobs/promotions/promotion-activation-delivery.service.ts`
- `apps/worker/src/jobs/subscriptions/subscription-alerts.processor.ts`
- `apps/worker/src/jobs/saved-search-alerts/saved-search-alerts.processor.ts`
- `apps/worker/src/jobs/search-indexing/search-document.builder.ts`
- `apps/web/app/admin/listings/page.tsx`
- `apps/web/app/admin/system-events/page.tsx`
- `apps/web/app/admin/system-health/page.tsx`
- `apps/web/components/admin/admin-resource-client.tsx`
- `apps/web/components/notifications/notifications-client.tsx`
- `apps/web/app/(dashboard)/dashboard/notifications/page.tsx`
- `packages/shared-config/src/index.ts`
- `packages/shared-events/src/queue-options.ts`
- `.env.example` (example values only; local `.env` contents were not read)
- `prisma/schema.prisma`
- Existing renewal, lifecycle, search, notification, and promotion-worker tests (source inspected; not run)
- Related GHARAZI-003E lifecycle, worker, outbox, migration-reconciliation, and renewal review documents under `docs/project-review/`

No tests, builds, database connections, or production service calls were run in this audit.
