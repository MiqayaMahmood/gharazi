# GHARAZI-003E-02B-S3-B3 — Promotion Outbox Delivery Reliability

## 1. Status

**PARTIAL — source implementation and isolated verification are complete; production readiness is intentionally blocked pending unapplied migrations and owner approval to enable processing.** No production services, database records, queues, notifications, or Elasticsearch documents were touched.

## 2. Existing components reused

- Existing `PromotionActivationOutbox` and activation transaction from `apps/worker/src/jobs/promotions/promotion-lifecycle.service.ts`.
- Existing BullMQ `notifications` and `searchIndexing` queues and their registered processors.
- Existing notification and notification-delivery records for the in-app promotion notice.
- Existing stable Elasticsearch document IDs and `SearchDocumentBuilder`.
- Existing `SystemEvent` persistence, consumed by the Admin System Events feature, for terminal delivery failures.
- Existing promotion activation gate and queue retry conventions. No new schedule, queue, dashboard, or notification framework was added.

## 3. Outbox state and completion semantics

Each event now tracks notification and search-index effects independently using `pending`, `enqueued`, `processing`, `retryable`, `succeeded`, and `terminal` states. New activation events explicitly initialize both effects as `pending`. Existing rows with null per-effect status are not automatically replayed. The aggregate `completedAt` is set only after both effects have reached `succeeded`; enqueueing alone does not complete an event.

Consumer claims are conditional on event ID, effect generation, and current state. A random claim token is required for acknowledgment or failure updates, so stale workers cannot overwrite a newer generation. Duplicate acknowledgments are no-ops. Per-effect attempts, claim timestamps, retry timestamps, completion timestamps, and sanitized error class are persisted.

## 4. Notification delivery

`NotificationsProcessor` handles promotion activation event jobs through `PromotionActivationDeliveryService`. It creates the existing in-app notification using the outbox event UUID as the stable notification ID, checks the existing record matches the expected user/type/promotion, records the in-app delivery, and acknowledges the effect in one Prisma transaction. Replays therefore do not create duplicate notification rows. No email, SMS, push, or other external channel was added. Other generic notification jobs retain their prior behavior.

## 5. Search indexing delivery

The existing `SearchIndexingProcessor` still builds and indexes the listing/project document with the stable entity ID. For activation events it claims the exact generation, acknowledges only after Elasticsearch indexing succeeds, and records/rethrows failures so BullMQ retry behavior remains available. A database acknowledgment failure after indexing is recoverable through an idempotent repeat index operation. Existing PostgreSQL search fallback and search behavior are unchanged.

## 6. Retry and recovery

`PromotionActivationDeliveryService` dispatches bounded batches from the already gated promotion activation run. It recovers due `pending`/`retryable` effects and stale `enqueued`/`processing` claims. Delivery uses a five-attempt maximum with exponential delays of 1, 2, 4, and 8 minutes (capped at 60 minutes). Exhausted effects become `terminal` and produce an error `SystemEvent`; no automatic infinite retry occurs. A stale queue generation cannot claim a newer delivery. Recovery remains driven by the existing activation invocation; no new recurring schedule was registered.

The terminal event includes the event/promotion references, effect, attempt count, and error class only. It does not store raw error messages or sensitive payment data.

## 7. Feature gate and business boundaries

`PROMOTION_ACTIVATION_ENABLED` remains strictly opt-in (`=== true`) in the lifecycle dispatcher and promotion-specific consumers. The existing default remains disabled. No environment configuration was changed. When disabled, activation and promotion-effect processing perform no database mutation or external side effect. Existing direct verified-payment fulfillment and authorized grant flows were not modified. Automatic listing expiry, listing status changes due to expiry, expiry-date edits, Buy/Rent filters, and search ranking were not added or changed.

## 8. Migration changes

Because repository evidence does not establish whether the earlier prepared outbox migration has been applied, the earlier migration was left untouched and a follow-on additive migration was created at `prisma/migrations/20261109091500_promotion_activation_effect_delivery/migration.sql`.

It adds nullable effect status/timestamp/token/error fields, attempt and generation counters with constant zero defaults, and six bounded lookup indexes on `sch_gharazi.promotion_activation_outbox`. It does not update existing rows, add tables, or change listing, promotion, or payment data. Nullable statuses intentionally keep historical events out of automatic dispatch.

The migration has **not** been applied. It depends on the earlier outbox table migration being applied first. `ALTER TABLE` requires a strong table lock; ordinary `CREATE INDEX` can block writes to the affected table while building. PostgreSQL documents that constant defaults can avoid a table rewrite on supported versions, but the production server version and table size were not inspected. Review the expected lock window and consider an approved concurrent-index migration procedure if the outbox table is sufficiently active. References: [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html) and [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html).

## 9. Verification

- Prisma client generation: passed locally; no database connection or migration was used.
- Prisma schema validation: passed.
- Worker TypeScript: passed (`tsc --noEmit --incremental false`).
- API TypeScript: passed (`tsc --noEmit --incremental false`).
- Focused Jest suites: 6 suites, 68 tests passed, using isolated mocks/fixtures.
- Focused ESLint on changed worker/shared-event files: passed with `--max-warnings=0`.
- Isolated emitted builds: not run. Nest CLI builds were avoided because existing output cleanup/locking could affect unrelated artifacts. TypeScript compilation verified both projects without writing build output.
- No live database, Redis, Elasticsearch, payment, or notification integrations were exercised.

## 10. Files modified for this batch

- `prisma/schema.prisma`
- `prisma/migrations/20261109091500_promotion_activation_effect_delivery/migration.sql`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.constants.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.service.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.processor.ts`
- `apps/worker/src/jobs/promotions/promotion-activation-delivery.service.ts`
- `apps/worker/src/jobs/promotions/promotion-activation-delivery.service.spec.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.service.spec.ts`
- `apps/worker/src/jobs/notifications/notifications.processor.ts`
- `apps/worker/src/jobs/notifications/notifications.processor.spec.ts`
- `apps/worker/src/jobs/search-indexing/search-indexing.processor.ts`
- `apps/worker/src/jobs/search-indexing/search-indexing.processor.spec.ts`
- `apps/worker/src/worker.module.ts`
- `packages/shared-events/src/index.ts`
- This acceptance report.

The working tree contained unrelated prior changes; they were preserved and are not attributed to this batch.

## 11. Remaining risks and limitations

- Production schema state is unverified. Apply the earlier outbox migration and this follow-on migration only through the approved database change process.
- Historical outbox rows with null effect status are deliberately not replayed. Review them read-only and decide separately whether any require controlled reconciliation.
- No runtime/staging service verification was performed, and scheduled activation remains disabled.
- The notification effect is specifically the in-app record/delivery persistence; no external notification delivery is claimed.
- External exactly-once delivery is not claimed. Elasticsearch replay is safe through stable document IDs; notification creation is transactionally deduplicated by stable notification ID.
- Admin visibility reuses System Events for terminal failures. Per-attempt state remains in the outbox and no new detailed admin view was added.
- The migration's lock duration and production PostgreSQL version require DBA/owner review.

## 12. Production readiness prerequisites

1. Confirm the existing outbox migration state without applying anything implicitly.
2. Review and approve the migration sequence and lock impact; apply both migrations through the controlled release process.
3. Deploy code with `PROMOTION_ACTIVATION_ENABLED=false` and verify schema compatibility in an approved non-production environment.
4. Review any legacy outbox records with null effect states before any replay policy is approved.
5. Separately approve activation and monitor outbox effect states/System Events before enabling the gate.

## 13. Recommended next phase

Run non-production end-to-end acceptance against an isolated PostgreSQL, Redis, and Elasticsearch environment, including retry exhaustion and worker interruption. After the owner separately approves the migrations and activation policy, perform a gated production-readiness review. Do not combine migration approval with enabling scheduled processing.
