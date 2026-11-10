# GHARAZI-003E-03B — Seller Listing Expiry Reminders

## 1. Status: PARTIAL — source implementation complete; activation blocked

The disabled-by-default in-app workflow, reminder processor, explicit historical cutoff, and durable deduplication implementation are in source. An additive migration is prepared but not applied. `LISTING_EXPIRY_REMINDERS_ENABLED` remains false by default, no live schedule was exercised, and no reminder was sent. Enabling requires separate owner approval and migration/release prerequisites below.

No listing status, expiry date, publication field, search document, promotion, payment, or subscription was changed. No live database, Redis, Elasticsearch, or external notification service was used. Existing unrelated working-tree changes were preserved.

## 2. Existing components reused

- `NotificationsService` and the existing `Notification` / `NotificationDelivery` records.
- Existing authenticated `/notifications` list/read/read-all API and seller dashboard notification card.
- Existing notification destination helper; expiry notices link to `/dashboard/listings`, where renewal is available.
- Existing BullMQ queues, repeat-job registration pattern, shared retry defaults, WorkerModule, and worker process lifecycle.
- Existing listing `ownerUserId`, `managedByUserId`, `status`, `deletedAt`, and `expiresAt` fields.
- Existing approved renewal action; reminder generation itself does not call renewal.

No generic external notification channel or second notification table was added.

## 3. Reminder policy and generation

The worker scans non-deleted ACTIVE listings with non-null expiry, in deterministic `(expiresAt, id)` order and bounded pages of 100. It takes a single PostgreSQL timestamp for the scan. A daily UTC job is registered at 09:00. A delayed scan selects only the current stage, avoiding late duplicates for earlier stages:

| Stage | Current-expiry window |
|---|---|
| 15 days | More than 7 and up to 15 days remaining |
| 7 days | More than 1 and up to 7 days remaining |
| 1 day | More than 0 and up to 1 day remaining |
| Overdue | Expiry is at/before scan time and at/after the explicit baseline |

Boundaries are UTC elapsed-day intervals. A listing more than 15 days away is not selected. Only one stage is selected per expiry cycle at each scan; a listing may receive the later stages if it remains ACTIVE and unrenewed. An overdue listing receives one overdue stage for its expiry cycle. A renewal changes the expiry snapshot and therefore the deduplication identity; existing notifications remain in history.

## 4. Recipient eligibility

The only recipients are the listing’s current `ownerUserId` and non-null `managedByUserId`, deduplicated if equal. No administrator or moderator recipients are added based on role. Before persistence, the notification service locks the listing row and revalidates ACTIVE status, non-deleted state, exact expiry cycle, and owner/manager relationship in a serializable transaction. If renewal or ownership/status change has already won the row lock, the old-cycle notification is skipped.

## 5. Durable deduplication and notification link

The dedupe identity is `listing + recipient + exact expiry-cycle timestamp + stage`, stored as a deterministic `deduplicationKey`. The service uses an atomic database upsert against a unique nullable column. Existing notifications have `NULL` keys and are unaffected. The reminder row contains `notificationType=listing_expiry_reminder`, `listingId`, `expiryCycle`, `reminderStage`, and `action=renew_listing`; the existing inbox UI resolves that action to `/dashboard/listings`. The in-app delivery record is persisted as sent with the notification; no generic delivery job is queued.

Concurrent generators converge on the same unique key. The serializable row-lock check prevents a stale expiry-cycle notice from being created after a completed renewal. Existing read/unread behavior is unchanged. No email, SMS, push, or automatic renewal is involved.

## 6. Historical overdue protection and feature gate

`LISTING_EXPIRY_REMINDERS_ENABLED` is parsed by shared configuration and defaults false when missing or empty. Only explicit case-insensitive `true` enables work. The worker checks this before reading listings and checks it for every queued generation job, so queued jobs cannot bypass the gate.

`LISTING_EXPIRY_REMINDERS_BASELINE_AT` is a separately configured, optional ISO timestamp. It is never synthesized from deployment or process-start time. Overdue reminders are skipped entirely when the baseline is absent; when configured, only expiry cycles at or after the cutoff are eligible. Upcoming reminders may still be generated without a baseline. The owner must set and record the intended cutoff at a separately approved activation; a stale cutoff on a later reactivation could permit overdue backlog, so reactivation requires preview and cutoff review.

The schedule registration is present in the API scheduler, but its worker path is a strict no-op while disabled. It registers a daily `listing-expiry-reminders` repeatable job at 09:00 UTC; it does not send or create notifications while the gate is off. No worker or scheduler was started in this work. The new flag and cutoff are documented in `.env.example`.

## 7. Schema changes

Prisma adds nullable unique `Notification.deduplicationKey` mapped to `notifications.deduplication_key`. Prepared migration:

`prisma/migrations/20261110100000_listing_expiry_reminder_deduplication/migration.sql`

It adds a nullable `VARCHAR(255)` column and a unique index on `sch_gharazi.notifications`. It has no default, backfill, or existing-row update; PostgreSQL unique indexes allow multiple `NULL` values. It is additive and not applied. The ordinary unique-index build can block writes to the notifications table while it runs; assess the table/maintenance window with the DBA before approval. No listing-table schema or data changes are included.

The generated Prisma client was not regenerated because CLI regeneration can load the local `.env`; source contains a narrow, explicitly typed adapter for the additive field until the approved schema/client release step. Deployment must regenerate Prisma Client after applying the migration and before enabling the feature. Do not enable against a database missing the column/index.

## 8. Files changed

- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications-idempotent.spec.ts` (new)
- `apps/api/src/modules/scheduler/scheduler.module.ts`
- `apps/worker/src/worker.module.ts`
- `apps/worker/src/jobs/listing-expiry-reminders/listing-expiry-reminders.service.ts` (new)
- `apps/worker/src/jobs/listing-expiry-reminders/listing-expiry-reminders.processor.ts` (new)
- `apps/worker/src/jobs/listing-expiry-reminders/listing-expiry-reminders.service.spec.ts` (new)
- `packages/shared-config/src/index.ts`
- `packages/shared-events/src/index.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20261110100000_listing_expiry_reminder_deduplication/migration.sql` (prepared; unapplied)
- `.env.example`
- `apps/web/lib/notifications/notification-destination.ts`
- `apps/web/lib/notifications/notification-destination.spec.ts`
- This acceptance report.

## 9. Verification

- Prisma schema validation: passed. A local, non-routable placeholder `DATABASE_URL` was supplied; no database connection or migration command was run.
- API TypeScript: passed (`tsc --noEmit --incremental false -p apps/api/tsconfig.app.json`).
- Worker TypeScript: passed (`tsc --noEmit --incremental false -p apps/worker/tsconfig.app.json`).
- Web TypeScript: passed (`tsc --noEmit --incremental false -p apps/web/tsconfig.json`).
- Focused ESLint over changed API, worker, shared, and notification destination files: passed.
- Focused Jest: 28 tests passed across 4 suites: expiry reminder generation, idempotent notification persistence, existing promotion notification processor, and notification destination mapping. Tests use mocks/fixtures; they do not connect to live services.
- The final notification row-lock check was followed by a focused rerun: 4 notification idempotency tests passed.
- No production build or browser test was run; no worker was started and no scheduled job was triggered.
- `git diff --check` is included in the final workspace review.

Prisma CLI emitted its standard notice that `.env` was loaded automatically; the process-level dummy local `DATABASE_URL` was supplied, no environment values were printed, and validation made no connection. Prisma Client generation was not run.

## 10. Limitations and remaining risks

- PostgreSQL `FOR UPDATE`, serializable conflicts, and unique-index behavior are established by implementation and schema but were not integration-tested against a database. Mock tests cannot prove live concurrency behavior.
- The migration is required before enabling; generated Prisma Client must also be refreshed. Both remain pending.
- The baseline is environment configuration, not a database singleton/audit record. Deployment/change history must preserve its chosen value; owner should review it on every reactivation.
- Reminder scan pages are bounded, but a single daily run continues through all due pages. Measure query plans and volume on isolated/staging data before activation. The listing table has no expiry-specific index in the current schema.
- Notification preferences are not present in the existing model; this batch sends in-app notices to owner and assigned manager only. The owner should confirm that no additional opt-out policy is required before enablement.
- No current count of overdue listings was queried. The 3,632 historical snapshot is not used as a current number or as the cutoff.

## 11. Deployment prerequisites and next phase

1. Owner reviews and approves the additive notification-key migration; apply it only through the authorized database process, not this phase.
2. Regenerate Prisma Client and deploy API/worker code with `LISTING_EXPIRY_REMINDERS_ENABLED=false`.
3. Verify the daily schedule reaches the disabled worker path without database reads or notification creation, using isolated staging/mocks.
4. Produce a read-only cohort preview (recommended GHARAZI-003E-03C) and choose/record `LISTING_EXPIRY_REMINDERS_BASELINE_AT` explicitly. Do not infer it from deployment time.
5. Obtain separate owner approval before setting the gate true and restarting the worker. Review recipients, cutoff, time zone, and monitoring. This phase has not enabled delivery.

Recommended next phase: GHARAZI-003E-03C — read-only Admin expiry preview and rollout cohort simulation, before any reminder activation or expiry enforcement.
