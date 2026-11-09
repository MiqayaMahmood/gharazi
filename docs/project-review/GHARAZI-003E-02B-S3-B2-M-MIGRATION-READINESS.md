# GHARAZI-003E-02B-S3-B2-M — Migration & Activation Readiness Review

## Status

**PARTIAL — migration is additive and structurally valid, but activation side-effect delivery is not end-to-end complete.** This review inspected repository source only. It did not connect to Supabase, inspect migration history, apply DDL, or interact with queues or services.

## 1. Migration inventory

Prepared migration: `prisma/migrations/20261109090000_promotion_activation_outbox/migration.sql`.

It creates only `sch_gharazi.promotion_activation_outbox`:

| Column | Type / nullability | Default / purpose |
|---|---|---|
| `id` | UUID, primary key | `gen_random_uuid()` |
| `promotion_id` | UUID, not null, unique | One outbox event per promotion |
| `event_key` | varchar(128), not null, unique | Stable event identity |
| `notification_id` | UUID, nullable, unique | Optional link to the in-app notification |
| `notification_created_at` | timestamptz, nullable | Notification persistence checkpoint |
| `notification_enqueued_at` | timestamptz, nullable | Notification queue enqueue checkpoint |
| `search_index_handled_at` | timestamptz, nullable | Search queue enqueue checkpoint; not consumer completion |
| `attempt_count` | integer, not null | Defaults to 0 |
| `claimed_at`, `completed_at` | timestamptz, nullable | Dispatch lease and dispatcher completion |
| `last_error` | varchar(1000), nullable | Last dispatch error class/message field |
| `created_at`, `updated_at` | timestamptz, not null | Default to current timestamp |

The migration adds foreign keys from `promotion_id` to `sch_gharazi.promotions(id)` with `ON DELETE CASCADE`, and from `notification_id` to `sch_gharazi.notifications(id)` with `ON DELETE SET NULL`. It creates unique indexes for promotion, event key, and non-null notification ID, plus indexes on `(completed_at, created_at)` and `claimed_at`. Primary/unique constraints also create their supporting indexes.

It contains no `ALTER`, `UPDATE`, `DELETE`, backfill, or operation on existing listing, promotion, or payment rows. The only table is explicitly schema-qualified. It assumes `sch_gharazi`, both referenced tables, UUID primary keys, and `gen_random_uuid()` already exist; the Prisma schema and migration source are consistent with those assumptions. `gen_random_uuid()` is also already used in the existing Prisma schema.

### Locking and compatibility

Creating this table and its indexes is additive and does not scan or rebuild existing business tables. PostgreSQL requires a `SHARE ROW EXCLUSIVE` lock on each referenced table when adding a foreign key, which can briefly conflict with concurrent writes while the DDL transaction runs. The actual wait/duration depends on database load and lock queues; this was not measured. See [PostgreSQL CREATE TABLE documentation](https://www.postgresql.org/docs/current/sql-createtable.html) and [explicit locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html).

Existing application versions that do not reference the new table should continue to operate after the table is created. The new worker code uses the new Prisma model only after the strict feature-gate check; with the gate false it returns before querying the table. If activation is manually enabled before migration, the read-only outbox probe fails before activation writes. The new application requires the migration to exist before the gate is enabled.

The migration is not manually idempotent (`CREATE TABLE` without `IF NOT EXISTS`); it should be applied once through the project's migration tracking process, never manually replayed. Rolling it back after activation has begun would delete outbox progress and weaken duplicate/recovery protections. A rollback plan must first disable activation and account for pending events. `ON DELETE CASCADE` also means a hard deletion of a promotion deletes its outbox evidence; this should be understood before any future hard-delete policy. The inspected API promotion service has no physical promotion-delete operation, but future administrative or direct database deletion would still cascade.

No live migration-history query was run, so the current database application state is **not independently verified** in this review. The previous phase reported it unapplied.

## 2. Outbox lifecycle matrix

| Workflow step | Status | Source evidence / finding |
|---|---|---|
| Promotion becomes eligible | IMPLEMENTED (source rules) | `PromotionLifecycleService.activateDuePromotions` selects due scheduled records, bounded to 100 and ordered by start time/ID; `activateOne` validates promotion window, payment/package provenance, and target eligibility. No runtime records were queried. |
| Atomic activation succeeds | IMPLEMENTED (source) | `activateOne` uses Serializable transaction isolation and conditional `updateMany` from `scheduled`; target flags, audit, and outbox insertion are in that transaction. |
| Outbox event is committed | IMPLEMENTED (source; migration prerequisite) | Unique `promotionId` and `eventKey` are inserted in the same transaction. Without the table, the activation service's probe fails before transition work. |
| Event becomes available for dispatch | IMPLEMENTED (source) | `dispatchPendingEvents` selects incomplete, unclaimed/stale events with stable ordering and a bounded batch. |
| Dispatcher claims event | IMPLEMENTED (source) | Conditional `updateMany` on incomplete event and lease state; increments attempts and claims for five minutes. |
| BullMQ jobs are created | IMPLEMENTED (enqueue only) | `dispatchEvent` adds notification and search jobs with event-derived stable IDs; enqueue timestamps are then stored. |
| Notification consumer processes event | PLACEHOLDER | `apps/worker/src/jobs/notifications/notifications.processor.ts` only logs the job. It does not send, update delivery state, or report a result to the outbox. |
| Search consumer processes event | IMPLEMENTED (index operation) | `apps/worker/src/jobs/search-indexing/search-indexing.processor.ts` builds and writes listing/project documents using the entity ID as Elasticsearch document ID. |
| Delivery result is recorded | PARTIAL | The outbox timestamps mean “created/enqueued/dispatch complete,” not consumer success. `completedAt` is set immediately after queue enqueue operations. Notification in-app `Notification`/`NotificationDelivery` rows are created before enqueue, but the queue consumer does not update the delivery row. Search success/failure is not written back to the outbox. |
| Failed queue job is retried | PARTIAL | `DEFAULT_JOB_OPTIONS` provides five attempts with exponential backoff. Exhausted jobs are retained as failed for up to seven days/count limit, but no outbox callback or reconciler reopens/replays them. |
| Repeated delivery is deduplicated | PARTIAL | Stable event-derived job IDs and notification IDs help; notification row upsert is keyed by event ID. The actual notification consumer has no delivery idempotency behavior because it is a placeholder. Search document update is naturally keyed by stable entity ID. No exactly-once external delivery guarantee exists. |

## 3. Notification readiness

The outbox dispatcher creates one in-app `Notification` using the outbox event ID as its ID and creates a `NotificationDelivery` row with `channel=in_app`, `deliveryStatus=sent`, and `sentAt` set. This follows the existing `NotificationsService.create` convention, and the dashboard can read the persisted notification.

It then enqueues `deliver-notification`; the `NotificationsProcessor` only logs and completes the job. No email/SMS/push provider is invoked, no delivery result is updated, and no notification consumer deduplication is implemented. Since the in-app row is already created, it is available independently of that queue job; the queue currently adds no confirmed delivery capability.

If a future consumer sends an external notification and crashes after sending but before recording success, retry could send again unless provider idempotency or durable delivery claims are added. Current code does not send such external messages, so this is a readiness gap rather than evidence of duplicate live sends.

**Decision: not ready to enable notification delivery.** The in-app database record can be materialized, but queue completion is not actual notification delivery evidence.

## 4. Indexing readiness

After activation, the dispatcher checks the listing/project remains active and not deleted, then enqueues the existing search-indexing job with a stable event-derived BullMQ ID. `SearchIndexingProcessor` writes to Elasticsearch using the stable listing/project ID, making repeated document writes idempotent at the document key level. Indexing failures throw and receive the existing five-attempt exponential retry policy.

However, the outbox marks `searchIndexHandledAt` after enqueue, and marks the event complete without waiting for the indexing processor. After retries exhaust, the outbox remains completed and contains no indexing failure state or reconciliation signal. The failed BullMQ job may remain inspectable for its configured retention period, but the outbox will not automatically recover it. There is no source-level end-to-end index acknowledgment.

**Decision: indexing side effects are conditionally usable but not fully recoverable.** The index operation itself is idempotent and queue retry exists; automated recovery after exhausted retries is missing. Do not interpret `searchIndexHandledAt` as index success.

## 5. Feature-gate assessment and bypasses

- **Default:** `packages/shared-config/src/index.ts` parses `PROMOTION_ACTIVATION_ENABLED` as false when missing/empty. The worker service requires the value to be exactly boolean `true`; a missing value cannot enable activation.
- **Existing recurring job:** `apps/api/src/modules/scheduler/scheduler.module.ts` already registers the recurring `activate-due` job. The worker processor routes it to the service, whose first operation is the strict gate. No new schedule is added here.
- **Mutation protection:** With gate false, the service returns before the outbox probe, promotion query, transaction, or queue side effects. If the migration is missing while the gate is true, the probe fails before activation writes.
- **Other routes:** The verified Stripe webhook fulfillment path in `apps/api/src/modules/payments/payments.service.ts` and the privileged immediate admin grant path in `apps/api/src/modules/promotions/promotions.service.ts` activate promotions directly. They are not scheduled activation and do not consult this worker gate or create this scheduled-activation outbox event. They remain existing independent paths and were not altered by this review. The seller promotion create path is rejected by the inspected service implementation.
- **Shared side-effect gate:** There is no separate notification/indexing gate. Turning on scheduled activation also enables the activation outbox dispatcher to enqueue both queue jobs. The immediate webhook and grant paths have their own existing behavior and do not use this outbox.
- **Other lifecycle route:** The admin `POST promotions/expire` endpoint is a separate manual promotion-expiration operation. It does not activate scheduled promotions and is outside this review's activation gate.
- **Expiry:** No automatic listing expiry is present in this path. Listing expiry is checked only as promotion-target eligibility; it does not update listing status, expiry, or search visibility.

## 6. Migration and deployment prerequisites

1. Review the additive DDL and schedule its application in a controlled migration window, accounting for foreign-key lock conflicts on `promotions` and `notifications`.
2. Confirm migration history through the owner's normal deployment process; this review did not query the database.
3. Deploy schema-compatible code with `PROMOTION_ACTIVATION_ENABLED=false` first. Existing workers can process recurring jobs as safe no-ops while disabled.
4. Before activation, review any scheduled promotion inventory and provenance through approved read-only checks; invalid/unverifiable rows are intentionally skipped and remain scheduled.
5. Add consumer completion/failure feedback and outbox recovery before treating notification/index side effects as end-to-end complete.
6. Separately approve enabling the activation gate. No environment changes or deployment were performed here.

## 7. Separate readiness recommendations

| Decision | Recommendation | Reason |
|---|---|---|
| A. Apply additive migration | **APPROVE WITH NORMAL MIGRATION CONTROLS** | Source is additive, schema-qualified, and has no business-row DML. Plan for brief FK lock conflicts, verify referenced objects and migration history, and retain a rollback plan. |
| B. Deploy code with activation disabled | **READY, subject to normal release checks** | Gate defaults false and is checked before database work. Old API behavior is not coupled to the table. The current notification and indexing queues may still run for other existing work. |
| C. Enable scheduled activation | **NOT READY** | Outbox completion currently means dispatched, not consumer-completed; failed consumer jobs do not reopen events. Verify existing scheduled rows and payment provenance first. |
| D. Enable notification delivery | **NOT READY** | The notification processor is a logging placeholder and has no delivery-state update or durable deduplication. Existing in-app notification persistence is separate and already occurs during dispatch. |
| E. Enable indexing side effects | **CONDITIONAL / PARTIAL** | Index writes and retries exist and use stable IDs, but exhausted failures have no outbox recovery/acknowledgment. Operational monitoring or a reconciliation path is needed before relying on completed outbox rows as indexed. |

## 8. Outstanding gaps and minimal next implementation batch

1. Define per-side-effect states (`pending`, `enqueued`, `succeeded`, `failed` or equivalent) and record consumer acknowledgments, rather than treating enqueue as delivery completion.
2. Add a safe retry/reconciliation path for exhausted notification and indexing jobs that uses stable event IDs and does not duplicate in-app records or external sends.
3. Implement the notification consumer only for explicitly approved channels, with persisted delivery idempotency and actual status updates. Keep email/SMS/push disabled unless separately configured and approved.
4. Add tests for consumer failure after side effect, recovery after exhausted attempts, and acknowledgment idempotency using isolated fixtures.
5. Only after those gaps and migration approval, perform a separate activation-readiness review. Keep automatic listing expiry prohibited.

## Scope and evidence limits

This was source-only and read-only. No Prisma validation was needed to answer the operational questions; no DB connection, migration, live queue operation, notification send, Elasticsearch write, Railway investigation, or production activation was performed. Existing dirty worktree changes were preserved. The only file created by this review is this report.
