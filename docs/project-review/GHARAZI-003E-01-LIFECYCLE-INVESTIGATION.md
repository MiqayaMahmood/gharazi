# GHARAZI-003E-01 — Listing Lifecycle Investigation

Date: 2026-11-09  
Status: INVESTIGATION COMPLETE for source and static configuration; live aggregate counts are BLOCKED by database connectivity.

## 1. Executive summary

Gharazi has a real but incomplete listing lifecycle foundation:

- Listings have `publishedAt`, nullable `expiresAt`, and nullable `lastRefreshedAt` fields.
- Publishing assigns a fixed 90-day expiry only when `expiresAt` is currently null.
- Seller/API actions exist for Publish, Refresh, Archive, Mark Sold, and Mark Rented.
- Ownership/management checks and status-history records exist for status transitions.
- Search indexing is event-driven through BullMQ.

Expiry is not operationally enforced:

- no listing-expiry queue, schedule, processor, or database trigger exists;
- public detail/contact/batch queries do not check `expiresAt`;
- PostgreSQL search and similar-listing fallback queries do not check `expiresAt`;
- Elasticsearch listing documents do not contain `expiresAt`, and listing search does not filter it;
- no code changes listing status to `expired`;
- no Renew endpoint, service operation, or seller action exists;
- no listing expiry/renewal/refresh notifications exist.

Refresh is not renewal. It updates `lastRefreshedAt` on any manageable, non-deleted listing, does not extend expiry, has no state eligibility or cooldown, does not add history/audit, and has inconsistent ranking effect between PostgreSQL and Elasticsearch.

The owner’s belief that significant lifecycle infrastructure exists is partly correct for promotions, generic queues, notifications, and listing timestamps. However, the scheduled promotion and subscription processors are explicit no-op TODOs, and no listing lifecycle job exists.

Do not enable mass expiry against the shared database until the owner executes the read-only inventory queries in section 9 and approves a grandfathering policy.

## 2. Existing architecture

| Concern | Existing implementation | Runtime conclusion |
|---|---|---|
| Listing persistence | Prisma `Listing` mapped to `sch_gharazi.listings` | Schema confirmed; live distribution unverified |
| Status history | `ListingStatusHistory` mapped to `listing_status_history` | Used by Publish/Archive/Sold/Rented |
| Listing API | `ListingsController` and `ListingsService` | Endpoints and authorization confirmed statically |
| Public discovery | Elasticsearch with PostgreSQL fallback | Both use status, neither uses expiry |
| Indexing | `SearchIndexingService` → BullMQ → `SearchIndexingProcessor` | Implemented; deployment/runtime unverified |
| Recurring scheduling | `SchedulerModule.onModuleInit()` in API | Registered on API startup when Redis is available |
| Promotion lifecycle | `PromotionsService`; repeat jobs; worker processor | Service works when invoked; repeat processor is inactive TODO |
| Notifications | Database notification + in-app delivery row + queue | In-app persistence implemented; provider worker is TODO |
| Email | `EmailService`/Resend | Password reset only; no lifecycle templates |
| Observability | Worker heartbeat, QueueEvents, queue health | Implemented; production dashboards not inspected |

The repository contains separate API and worker entry points. The API registers repeatable jobs; a separately deployed worker must consume them. Repository configuration contains commands for both, but no Railway dashboard configuration is available to prove that the worker is currently deployed or healthy.

## 3. Listing lifecycle state diagram

The following diagram represents current code, including overly broad transitions. Dashed paths are absent or ineffective.

```mermaid
stateDiagram-v2
    [*] --> draft: create
    draft --> active: publish
    active --> active: refresh (timestamp only)
    active --> archived: archive
    active --> sold: mark sold
    active --> rented: mark rented
    state "Any owned/managed non-deleted status" as Any
    Any --> active: publish currently allowed
    Any --> sold: mark sold currently allowed
    Any --> rented: mark rented currently allowed
    Any --> archived: archive except archived/expired
    Any --> rejected: moderation hide/reject
    active -.-> expired: no implementation
    expired -.-> active: no Renew operation
```

Important visibility behavior:

- Search returns only `active` status.
- Public detail, contact, and batch endpoints allow `active`, `sold`, and `rented`.
- `expired`, `archived`, `draft`, and `rejected` are not public through listing detail.
- Owner listing APIs return every non-deleted status.
- Because nothing creates `expired` from `expiresAt`, an overdue `active` listing remains searchable and publicly accessible.

## 4. Expiry implementation inventory

| Question | Confirmed behavior | Classification |
|---|---|---|
| Expiry field | `Listing.expiresAt` → `listings.expires_at`, nullable timestamp | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Initial calculation | Publish uses `now + 90 × 24 hours` only when expiry is null | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Package/type dependency | None; fixed duration for all listings | NOT IMPLEMENTED |
| Expiry extension | No API/DTO/service operation changes expiry after it is set | NOT IMPLEMENTED |
| Automatic hiding | No query-time expiry condition | NOT IMPLEMENTED |
| Automatic status change | No listing expiry scheduler, worker, trigger, or service | NOT IMPLEMENTED |
| Query-time enforcement | Status/deletion only | NOT IMPLEMENTED |
| Owner visibility | `listMine` includes all non-deleted statuses | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Elasticsearch expiry | Document omits expiry; searches cannot enforce it | NOT IMPLEMENTED |
| Dashboard expiry display | Frontend listing type/cards omit `expiresAt` | NOT IMPLEMENTED |
| Data consistency | Aggregate query could not reach Supabase from this environment | UNKNOWN / NOT VERIFIED |

### Exact publication behavior

`ListingsService.publish()`:

- authorizes through owner/manager-only `assertCanWrite`;
- checks only title, description, price, and area completeness;
- transitions to `active` from any current status;
- preserves any existing `publishedAt` and `expiresAt` values;
- otherwise sets first publication and 90-day expiry;
- updates `lastRefreshedAt`;
- writes status history and enqueues indexing.

Consequences:

- republishing an expired/overdue listing does not renew its expiry;
- archived, sold, rented, rejected, pending, or already active listings are not rejected by state policy;
- repeated Publish can create `active → active` history;
- the fixed 90-day interval is elapsed hours, not a calendar-day policy or configured value.

No migration contains a listing-expiry trigger or `pg_cron` job.

## 5. Refresh and renewal behavior

### Refresh

| Attribute | Current behavior |
|---|---|
| Endpoint | `POST /listings/:id/refresh` |
| Frontend | Seller dashboard and owner detail action panel |
| Authorization | Owner, manager, admin, or moderator; deleted rows excluded |
| Status eligibility | None; draft, archived, sold, rented, rejected, expired, and pending can be refreshed |
| Date change | Sets `lastRefreshedAt = now`; Prisma also updates `updatedAt` |
| Expiry change | None |
| Status change | None |
| Entitlement | None; `SubscriptionsService.hasEntitlement()` is unused |
| Cooldown/rate | Global API throttle only; no lifecycle cooldown |
| Audit/history | No audit log or status-history entry |
| Idempotency | None; every call changes timestamps |
| Indexing | Reindexes only if the pre-update status is `active` |
| Error atomicity | Database update and queue add are separate; queue failure can surface after the timestamp changed |

Ranking effect is inconsistent:

- normal Elasticsearch search sorts by relevance/published date and the indexed document omits `lastRefreshedAt`;
- Elasticsearch similar search requests a `lastRefreshedAt` sort even though the builder does not index that field;
- PostgreSQL default search uses `publishedAt`, then `updatedAt`, so refresh can affect tie ordering;
- PostgreSQL similar listings explicitly sort by `lastRefreshedAt`.

The paid `listing_boost_basic` package sets `lastRefreshedAt`, but the standard Elasticsearch ranking path does not consume it. The package also creates a promotion row whose flags are neither Hot nor Featured, so its stated “boost” effect is not consistently realized.

### Renew

Renew is NOT IMPLEMENTED:

- no controller endpoint;
- no service method;
- no frontend API function/action;
- no date/state policy;
- no entitlement check;
- no audit or notification event;
- no tests.

An owner cannot explicitly renew an expired listing. Current Publish may set it back to active, but preserves the old expiry and therefore is not a valid renewal operation.

### Other existing actions

| Action | Authorization | State rule | Persistence/index behavior | Safeguards/gaps |
|---|---|---|---|---|
| Archive | owner/manager/admin/moderator | Returns unchanged for archived or expired; otherwise any status | status history; delete index | Partially idempotent; no notification/audit |
| Mark sold | same | No server-side source-state restriction | status history; reindex with `sold` | Search hides; public detail remains; repeated transitions allowed |
| Mark rented | same | No server-side source-state restriction | status history; reindex with `rented` | Same gap as sold |
| Moderation reject/hide | moderation caller | Any listing | status `rejected`; delete index | Moderation record exists; no listing status-history entry |

`viewerContext` claims Sold/Rented is allowed only for `active` or `draft`, but the actual endpoints do not enforce that rule. Dashboard cards also display lifecycle actions independent of status.

## 6. Background jobs and schedules

### Registered repeat jobs

| Job | Queue | Trigger | Processor | Retry/backoff | Effective behavior |
|---|---|---|---|---|---|
| `activate-due` | `promotion-lifecycle` | `*/10 * * * *` | `PromotionLifecycleProcessor` | 5 attempts; exponential from 5s | PRESENT BUT INACTIVE: logs only |
| `end-expired` | `promotion-lifecycle` | `*/15 * * * *` | same | same | PRESENT BUT INACTIVE: logs only |
| `expiry-reminder` | `subscription-alerts` | `0 9 * * *` | `SubscriptionAlertsProcessor` | same | PRESENT BUT INACTIVE: logs only |
| `daily-rollup` | `analytics-rollups` | `15 * * * *` | analytics processor | same | Outside listing lifecycle |

There is no listing lifecycle queue/job.

### Event-driven jobs

| Job | Trigger | Effective behavior |
|---|---|---|
| Listing index/delete | Publish, archive, status changes, active edits, media, promotions | Worker writes/deletes Elasticsearch documents |
| Notification delivery | `NotificationsService.create(... queueDelivery: true)` | Worker logs only; no external provider or delivery-row update |

### Reliability and deployment

- Repeat jobs use stable `jobId` values and BullMQ repeat definitions, reducing duplicate schedule registration.
- Default retention keeps completed jobs for one day/up to 1,000 and failed jobs for seven days/up to 5,000.
- Worker QueueEvents log started/completed/failed events.
- Worker heartbeat is written every 30 seconds with a 180-second TTL; API health treats it stale after 120 seconds.
- Queue health exposes failed totals.
- No lifecycle job-level database idempotency or notification deduplication key exists.
- No timezone is specified for repeat patterns.
- Actual Railway API/worker process configuration and live Redis repeat-job state were not accessed.

## 7. Notifications and reminders

| Event | Trigger/channel | Status |
|---|---|---|
| Listing approaching expiry | None | NOT IMPLEMENTED |
| Listing expired | None | NOT IMPLEMENTED |
| Renewal successful | None; no renewal | NOT IMPLEMENTED |
| Refresh successful | Frontend local success message only | PARTIALLY IMPLEMENTED |
| Listing reactivated | None | NOT IMPLEMENTED |
| Promotion approaching expiry | None | NOT IMPLEMENTED |
| Promotion expired | `PromotionsService.endExpiredPromotions()` creates `promotion_ended` in-app record | PARTIALLY IMPLEMENTED; scheduled processor does not call service |
| Promotion activated | Direct service activation creates `promotion_activated`; paid checkout path does not | PARTIALLY IMPLEMENTED |

Generic notification mechanics:

- create a `notifications` row;
- immediately create an `in_app` delivery row marked `sent`;
- optionally enqueue an `in_app` delivery job;
- worker only logs and does not call Resend/SMS/push or update delivery records;
- no notification-preference model was found;
- no lifecycle deduplication mechanism was found.

Resend is configured in the local environment, but `EmailService` only implements password-reset email. No listing or promotion lifecycle email template exists. No message was sent during this investigation.

## 8. Promotions and subscriptions

- Listing expiry and promotion `endsAt` are independent.
- Refresh does not extend a promotion.
- Renewal does not exist and therefore cannot extend a promotion.
- Subscriptions do not alter listing duration or renewal eligibility.
- `hasEntitlement()` exists but is not called anywhere.
- New paid promotions validate owner/manager target ownership and use a unique payment transaction, providing webhook activation idempotency.
- Promotion creation/checkouts do not require the target listing to be active or unexpired.
- A paid promotion can therefore be created for a draft, archived, sold, rented, rejected, expired, or overdue listing.
- A promotion can remain active after the listing becomes non-active or passes `expiresAt`.
- Promotion flags are stored on the listing and only recomputed when cancel/end service logic runs.
- The scheduled promotion processor does not run that logic.

Additional confirmed commercial risks:

- Authenticated owners can call `POST /promotions` directly and create a Featured promotion with client-supplied dates without payment/entitlement validation.
- Promotion update checks ownership of the promotion but does not revalidate ownership when `entityType`/`entityId` are changed.
- Date ordering (`endsAt > startsAt`) is not explicitly validated.

These are existing confirmed behaviors; no billing or promotion code was changed.

## 9. Read-only database observations

The configured connection identifies `sch_gharazi`, but Prisma returned `P1001` because this execution environment could not reach the Supabase pooler. No alternate connection, pool change, API workaround, or production dashboard access was attempted. Therefore live counts are UNKNOWN / NOT VERIFIED.

The following aggregate-only SQL is recommended for owner execution. It returns no identifiers or personal information.

```sql
BEGIN TRANSACTION READ ONLY;

SELECT status,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE deleted_at IS NULL) AS not_deleted,
       COUNT(*) FILTER (WHERE expires_at IS NULL) AS missing_expiry,
       COUNT(*) FILTER (WHERE expires_at <= NOW()) AS past_expiry
FROM sch_gharazi.listings
GROUP BY status
ORDER BY status;

SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL) AS with_expiry,
  COUNT(*) FILTER (WHERE expires_at IS NULL) AS missing_expiry,
  COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) AS currently_search_eligible,
  COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL AND expires_at <= NOW()) AS active_past_expiry,
  COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL AND expires_at IS NULL) AS active_missing_expiry,
  COUNT(*) FILTER (
    WHERE status IN ('active', 'sold', 'rented')
      AND deleted_at IS NULL
      AND expires_at <= NOW()
  ) AS public_detail_eligible_past_expiry,
  COUNT(*) FILTER (WHERE status = 'expired' AND deleted_at IS NULL) AS expired_status
FROM sch_gharazi.listings;

SELECT
  COUNT(*) FILTER (WHERE published_at IS NOT NULL AND expires_at IS NOT NULL) AS comparable,
  COUNT(*) FILTER (
    WHERE published_at IS NOT NULL AND expires_at IS NOT NULL
      AND expires_at - published_at BETWEEN INTERVAL '89 days' AND INTERVAL '91 days'
  ) AS approximately_90_days,
  COUNT(*) FILTER (
    WHERE published_at IS NOT NULL AND expires_at IS NOT NULL
      AND expires_at <= published_at
  ) AS non_positive_duration,
  MIN(expires_at - published_at) FILTER (WHERE published_at IS NOT NULL AND expires_at IS NOT NULL) AS minimum_duration,
  MAX(expires_at - published_at) FILTER (WHERE published_at IS NOT NULL AND expires_at IS NOT NULL) AS maximum_duration
FROM sch_gharazi.listings;

SELECT
  COUNT(*) FILTER (WHERE last_refreshed_at IS NOT NULL) AS with_refresh,
  COUNT(*) FILTER (WHERE last_refreshed_at >= NOW() - INTERVAL '30 days') AS refreshed_last_30_days
FROM sch_gharazi.listings;

SELECT to_status, COUNT(*) AS total
FROM sch_gharazi.listing_status_history
WHERE to_status IN ('active', 'archived', 'expired', 'sold', 'rented', 'rejected', 'pending')
GROUP BY to_status
ORDER BY to_status;

SELECT status,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE ends_at <= NOW()) AS past_end
FROM sch_gharazi.promotions
GROUP BY status
ORDER BY status;

SELECT
  COUNT(*) FILTER (WHERE p.status = 'active') AS active_listing_promotions,
  COUNT(*) FILTER (WHERE p.status = 'active' AND l.expires_at <= NOW()) AS active_promotion_listing_past_expiry,
  COUNT(*) FILTER (
    WHERE p.status = 'active' AND (l.status <> 'active' OR l.deleted_at IS NOT NULL)
  ) AS active_promotion_listing_not_active,
  COUNT(*) FILTER (WHERE p.status = 'active' AND p.ends_at <= NOW()) AS active_promotion_past_own_end
FROM sch_gharazi.promotions p
JOIN sch_gharazi.listings l
  ON p.entity_type = 'listing' AND p.entity_id = l.id;

SELECT notification_type, COUNT(*) AS total
FROM sch_gharazi.notifications
WHERE notification_type IN (
  'listing_expiry_reminder', 'listing_expired', 'listing_renewed',
  'listing_refreshed', 'listing_reactivated',
  'promotion_expiry_reminder', 'promotion_ended', 'promotion_activated'
)
GROUP BY notification_type
ORDER BY notification_type;

SELECT channel, delivery_status, COUNT(*) AS total
FROM sch_gharazi.notification_deliveries
GROUP BY channel, delivery_status
ORDER BY channel, delivery_status;

ROLLBACK;
```

## 10. Implemented capability matrix

| Capability | Classification | Evidence summary |
|---|---|---|
| Persist expiry/refresh dates | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | Prisma/migration/listing publish |
| Fixed 90-day first publication expiry | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | `ListingsService.publish` |
| Owner can see non-public listing states | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | `listMine` |
| Public expiry enforcement | NOT IMPLEMENTED | All public/search paths omit expiry |
| Automatic listing expiration | NOT IMPLEMENTED | No trigger/job/processor/service |
| Refresh endpoint/UI | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | API and two frontend surfaces |
| Refresh state/cooldown/entitlement policy | NOT IMPLEMENTED | No checks beyond manage authorization |
| Renewal | NOT IMPLEMENTED | No code path |
| Archive | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | Transition/history/index delete |
| Sold/Rented | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | Transition/history/reindex |
| State-machine enforcement | PARTIALLY IMPLEMENTED | UI context differs from endpoint rules |
| Listing lifecycle audit trail | PARTIALLY IMPLEMENTED | Status history only; refresh absent; moderation bypasses it |
| Search index lifecycle | PARTIALLY IMPLEMENTED | Event-driven status indexing; expiry absent |
| Promotion lifecycle service | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | Service methods and admin repair endpoint |
| Scheduled promotion lifecycle | PRESENT BUT INACTIVE | Repeat schedule + no-op processor |
| Subscription expiry processing | PRESENT BUT INACTIVE | Schedule + no-op processor |
| In-app notification platform | IMPLEMENTED BUT NOT RUNTIME-VERIFIED | Rows/list/read APIs |
| External lifecycle notification delivery | NOT IMPLEMENTED | Worker TODO; Resend reset only |
| Listing lifecycle reminders | NOT IMPLEMENTED | No triggers/templates/types |
| Production worker deployment/health | UNKNOWN / NOT VERIFIED | Repository boundary only |

## 11. Confirmed defects and gaps

1. **HIGH — Expired inventory remains public.** `expiresAt` has no effect on detail, contact, batch, PostgreSQL search, Elasticsearch search, or similar results.
2. **HIGH — Enabling expiry without inventory policy could mass-hide live listings.** Existing counts could not be read.
3. **HIGH — Lifecycle state transitions are under-constrained.** Publish/Sold/Rented/Refresh accept statuses that the UI context does not claim to allow.
4. **HIGH — Paid promotion and listing eligibility are disconnected.** Promotions can outlive or target ineligible listings.
5. **HIGH — Direct promotion creation bypasses payment/entitlement validation.** Existing owner endpoint can apply Featured state.
6. **MEDIUM — Scheduled promotion/subscription jobs complete without doing work.** Operational dashboards may show successful jobs despite no domain mutation.
7. **MEDIUM — Refresh behavior is inconsistent across search paths.** It is not a dependable marketplace ranking feature.
8. **MEDIUM — Queue/index updates are not transactional with lifecycle changes.** Database and Elasticsearch can diverge after queue failure.
9. **MEDIUM — No notification deduplication.** A future recurring job could create duplicates unless explicitly guarded.
10. **MEDIUM — No lifecycle audit for Refresh and moderation-driven listing status.** Investigation and customer support evidence are incomplete.
11. **LOW — Fixed expiry uses elapsed milliseconds rather than a documented calendar/timezone rule.** Usually acceptable, but policy should be explicit.

## 12. Risk assessment and existing safeguards

| Risk | Severity | Existing safeguards | Remaining exposure |
|---|---|---|---|
| Unexpected mass expiration | HIGH | No job currently runs | Any new job could affect unknown live inventory immediately |
| Incorrect renewal dates | HIGH | Renewal absent | New implementation needs deterministic date rules and tests |
| Duplicate notifications | MEDIUM | BullMQ repeat job IDs | No database event/dedup key |
| Repeated queue execution | MEDIUM | Payment activation checks unique transaction; repeat definitions stable | Lifecycle processors need idempotency |
| ES/PostgreSQL mismatch | HIGH | Status filter exists in both | Expiry absent in both; queue failure creates drift |
| Paid entitlement loss | HIGH | Payment webhook idempotency | Listing/promotion dates are independent |
| Incorrect seller authorization | MEDIUM | Owner/manager/admin checks | State eligibility missing; direct promotion update target gap |
| Public visibility inconsistency | HIGH | Soft-delete/status checks | Detail allows sold/rented and ignores expiry |
| Worker deployment/schedule failure | MEDIUM | Heartbeat, QueueEvents, health cards | Railway runtime not verified; no-op processors can look healthy |

## 13. Proposed minimal policy

Policy proposals below are recommendations, not confirmed current behavior and not implementation approval.

| Policy | Current behavior | Proposed minimal behavior | Code change | Risk | Owner decision |
|---|---|---|---|---|---|
| A. Default duration | Fixed 90 elapsed days | Retain 90 days for all standard listings initially | Configuration + tests | LOW | Confirm 90 days |
| B. Expiry calculation | First publish only; never reset | First publish `now + 90d`; expired renewal `now + 90d`; never silently preserve overdue expiry on activation | Yes | HIGH | Confirm renewal anchor |
| C. Reminders | None | In-app at 7 days and 1 day; email only after consent/template approval | Yes | MEDIUM | Confirm timing/channels |
| D. Expired visibility | Still public while active | Query-time hide immediately; worker subsequently marks expired and removes index | Yes | HIGH | Confirm grandfathering date |
| E. Renewal eligibility | None | Owner/manager/admin; only `expired`; archived requires explicit republish, sold/rented/rejected/pending cannot renew | Yes | MEDIUM | Confirm eligible states |
| F. Refresh frequency | Unlimited, any status | Active only; maximum once per 7 days; does not extend expiry | Yes | MEDIUM | Confirm free/paid cooldown |
| G. Dashboard | Status only | Show expiry date, days remaining, Expiring soon/Expired indicator, eligible Renew action | Yes | LOW | Confirm wording |
| H. Promotion interaction | Independent/unrestricted | Do not extend promotions on renewal; block purchase if listing is not active or expires before promotion end | Yes | HIGH | Decide refund/credit policy |
| I. Admin override | Broad publish/moderation only | Explicit override/renew with required reason and audit; no silent date edit | Yes | MEDIUM | Define roles/max duration |
| J. Job reliability | No listing job | Small batches, deterministic job IDs, DB idempotency, query-time safety, history/audit, metrics and failed-job alerts | Yes | HIGH | Approve rollout gates |

Recommended grandfathering: do not expire historical active listings solely because an old/missing `expiresAt` is discovered. First classify data, assign an owner-approved grace deadline where necessary, show sellers the deadline, then enable enforcement.

## 14. Owner decisions required

1. Confirm 90-day standard duration or choose another duration.
2. Decide whether renewal starts from `now` or extends a still-active expiry.
3. Decide eligible states: recommended `expired` only.
4. Decide free renewal versus package/subscription entitlement.
5. Confirm Refresh cooldown and whether Refresh affects ranking.
6. Approve reminder timing and in-app/email consent rules.
7. Decide treatment of existing active listings with missing/past expiry.
8. Decide behavior when paid promotion outlasts listing eligibility: block purchase, auto-renew listing, pause, credit, or refund.
9. Confirm whether sold/rented detail pages remain public as historical pages.
10. Define admin override roles and mandatory audit reason.
11. Decide whether the direct `/promotions` creation endpoint is internal/admin-only or must require payment/entitlement.

A concise decision worksheet is provided in `GHARAZI-003E-01-OWNER-DECISIONS.md`.

## 15. Recommended GHARAZI-003E-02 scope

Proceed only after database aggregates and owner decisions are available.

1. Add regression tests for the current state machine before modifying behavior.
2. Add expiry guards consistently to public detail/contact/batch, PostgreSQL search/similar, Elasticsearch documents/filters, and indexing eligibility.
3. Implement a centralized lifecycle service with explicit transition rules and an idempotent Renew operation.
4. Add an idempotent listing-lifecycle queue/processor with bounded batches, history/audit, index deletion, deduplicated reminders, metrics, and a dry-run/report mode.
5. Expose expiry/renewal state in seller APIs and dashboard.
6. Enforce promotion target status/date eligibility and decide existing paid-promotion remediation.
7. Correct promotion scheduler processors so they invoke domain logic rather than return success after logging.
8. Stage rollout: report-only → grandfather/backfill approval → query-time guard → worker transitions → reminders.

Explicitly exclude database migration unless a deduplication/audit requirement cannot be met with existing fields and the owner separately approves it.

## 16. Verification performed

- Full source and existing project-review inspection.
- Prisma schema/migration inspection; no expiry trigger/cron found.
- Static API, frontend, BullMQ, worker, notification, promotion, subscription, payment, and indexing trace.
- API TypeScript: PASS.
- Worker TypeScript: PASS.
- Existing listing Jest suite could not start because the installed dependency tree is locally incomplete (`semver/functions/rsort` and `exit` modules missing). Dependencies were not installed or changed.
- Safe read-only Prisma transaction attempted; blocked with `P1001` before any query ran.
- No API endpoint, worker, queue, email, payment, Elasticsearch write, migration, or data mutation was invoked.

## 17. Files created or modified

- `docs/project-review/GHARAZI-003E-01-LIFECYCLE-INVESTIGATION.md`
- `docs/project-review/GHARAZI-003E-01-OWNER-DECISIONS.md`

No application source file was modified for this investigation.
