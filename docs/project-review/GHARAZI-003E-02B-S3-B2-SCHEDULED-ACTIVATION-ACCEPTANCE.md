# GHARAZI-003E-02B-S3-B2 — Scheduled Promotion Activation Acceptance

## Status

**PARTIAL — source implementation and isolated verification are complete; production activation is not ready.** The new outbox migration has not been applied, and `PROMOTION_ACTIVATION_ENABLED` defaults to `false`. No worker, schedule, live database, queue, payment provider, or search service was activated for this work.

## Existing architecture reused

- `apps/api/src/modules/scheduler/scheduler.module.ts` already registers `activate-due` every ten minutes on the existing `promotion-lifecycle` queue. This registration was not changed. It is not newly activated by this change.
- `apps/worker/src/jobs/promotions/promotion-lifecycle.processor.ts` was a logging placeholder. It now routes only the existing `activate-due` action to a gated lifecycle service. `end-expired` remains intentionally inactive.
- Stripe checkout fulfillment in `apps/api/src/modules/payments/payments.service.ts` currently creates paid promotions as active. Admin grants in `apps/api/src/modules/promotions/promotions.service.ts` also create active promotions directly, without payment evidence. There is no supported scheduled subscription-entitlement or scheduled admin-grant flow; the scheduled processor rejects rows without a matching paid transaction.
- The existing notification and search-indexing queues are reused. Notifications remain in-app; the current notification processor is still a placeholder. Search indexing uses the existing idempotent document ID (listing/project ID).

## Eligibility and atomic transition

The worker reads a bounded set of due `scheduled` promotions, ordered by `startsAt` and ID. It skips promotions that have not started or whose promotion window has ended. Inside a Serializable Prisma transaction it verifies the persisted payment and catalog package, rechecks the target, and conditionally changes the promotion from `scheduled` to `active` with `updateMany`. A count other than one is a no-op, so concurrent consumers cannot both win the state transition.

For payment provenance, the implementation requires a paid Stripe transaction with `paidAt` not in the future, a Stripe session or payment-intent reference, matching purchaser, package, target type, and target ID. It also checks the active one-time package, catalog amount/currency, exact duration, promotion type, and entitlement flags. It does not trust client-controlled status or fabricate payment evidence for grants.

Listings must still be active, published, undeleted, owned or managed by the purchaser, and not past `expiresAt` for **promotion eligibility only**. Projects must be active, published, undeleted, and owned through the purchaser's developer account. No listing status, expiry value, or public search eligibility is changed by expiry logic.

The transaction updates the existing listing/project promotion flags, creates one activation audit record, and creates an outbox row. Failure rolls the transaction back before any queue or indexing side effect is emitted.

## Durable side-effect handling

The additive `PromotionActivationOutbox` model provides a unique row per promotion and unique stable event key. It records the notification identifier and stage timestamps, search-index enqueue completion, retry count, lease, completion, and last error. A conditional five-minute lease prevents concurrent dispatch. Retries use stable event-derived BullMQ job IDs; notification rows use the stable event ID as their ID. Elasticsearch indexing remains an idempotent document update keyed by the entity ID.

These mechanisms provide durable intent, retry progress, and idempotent in-app notification persistence/index updates. They do **not** claim exactly-once external delivery. The notification processor currently logs jobs without sending them; email, SMS, and push delivery are not part of this change.

## Worker gate and schedule behavior

`PROMOTION_ACTIVATION_ENABLED` is parsed by shared configuration and defaults to `false`. The service requires the parsed value to be exactly `true`; otherwise it returns before querying promotions or writing data. Before any activation query it performs a read-only outbox-table probe. If the migration is absent, the service fails closed before mutation.

No schedule was added or altered. Existing queued `activate-due` jobs will be acknowledged as no-ops while the gate is false. The existing expiration action remains inactive. No automatic listing expiry was added.

## Schema and migration dependency

- Updated `prisma/schema.prisma` with `PromotionActivationOutbox` and its relations.
- Prepared `prisma/migrations/20261109090000_promotion_activation_outbox/migration.sql` with additive table, foreign keys, uniqueness, and indexes.
- **Migration not applied.** Enabling the worker before an approved migration is applied will fail closed at the outbox probe.
- Prisma Client was regenerated locally from the schema. This did not connect to or modify the database.

## Verification

- Prisma schema validation: **passed**.
- Prisma Client generation: **passed**.
- API TypeScript check: **passed**.
- Worker TypeScript check: **passed**.
- Isolated TypeScript emit builds for API and worker: **passed** to temporary directories. A Nest CLI production build was not run because the repository's Nest configuration deletes its output directory; no existing build artifacts were touched.
- Focused ESLint on changed TypeScript files: **passed**.
- Focused Jest suites: worker lifecycle and processor, API promotion security, and Stripe payment/webhook security. **4 suites passed; 52 tests passed.**
- Tests use mocks and isolated fixtures only. No live DB, Redis, Stripe, notification, or Elasticsearch operation was performed.

## Files changed for this batch

- `apps/worker/src/jobs/promotions/promotion-lifecycle.service.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.service.spec.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.processor.ts`
- `apps/worker/src/jobs/promotions/promotion-lifecycle.processor.spec.ts`
- `apps/worker/src/worker.module.ts`
- `apps/api/src/modules/promotions/promotions.service.ts` — removed the unsafe API-side scheduled activation implementation so there is one gated activation path; expiry processing was not changed.
- `apps/api/src/modules/promotions/promotions.service.spec.ts` — removed the old test for the removed unsafe path.
- `packages/shared-config/src/index.ts`
- `packages/shared-events/src/index.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20261109090000_promotion_activation_outbox/migration.sql`
- `docs/project-review/GHARAZI-003E-02B-S3-B2-SCHEDULED-ACTIVATION-ACCEPTANCE.md`

The working tree already contained unrelated changes before this batch; they were preserved and are not included in the list above.

## Remaining risks and prerequisites

1. Owner approval and application of the additive outbox migration are required before activation can be considered operationally ready.
2. The owner must separately approve enabling `PROMOTION_ACTIVATION_ENABLED=true`; this task did not change any environment configuration.
3. There is no scheduled subscription entitlement or administrative-grant provenance. Those workflows remain outside scheduled activation until an explicit trusted source and policy exist.
4. Existing paid webhook fulfillment remains an immediate activation path and was covered by its existing mocked regression tests; it was not rewritten.
5. Notification delivery beyond the existing in-app record is not implemented. Exactly-once external delivery is not claimed.
6. This is source and mock verification only; no production runtime or live record behavior was verified.

## Recommended next phase

Review and approve the additive migration, then separately authorize a controlled pre-activation readiness check. Keep the feature gate disabled until migration state, payment provenance assumptions, notification behavior, and a rollback/monitoring plan are confirmed. Do not introduce listing expiry enforcement as part of that approval.
