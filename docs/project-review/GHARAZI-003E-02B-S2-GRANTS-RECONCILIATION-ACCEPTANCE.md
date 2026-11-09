# GHARAZI-003E-02B-S2 — Grants & Payment Reconciliation Acceptance

## 1. Status

**COMPLETE.** Admin promotion grants and payment reconciliation are implemented and locally verified with mocks. No migration is required or prepared. No live data or infrastructure was accessed or modified.

## 2. Administrative promotion grants

Added `POST /admin/promotions/grants`, protected by the existing JWT and roles guards and an endpoint-level `@RequireRoles('admin')`. Moderators and sellers cannot call it. The seller-facing `/promotions` creation endpoint remains blocked.

The request requires:

- A UUID `idempotencyKey`.
- A listing UUID.
- One of the existing supported listing package types: `listing_hot` (14 days) or `listing_super_hot` (30 days).
- A non-whitespace reason of 10–1000 characters.
- A duration exactly matching the selected package duration; arbitrary durations are rejected.

The listing must be published, active, and not deleted. Expiry is intentionally not checked. The listing owner is recorded as the grant recipient. The service creates an active grant using package entitlements and writes the promotion, listing flags, and audit row in the same Prisma transaction. The promotion has `paymentTransactionId = null` and `packageCode = null`; no Stripe transaction or paid evidence is fabricated. The audit row captures the admin actor, promotion/target, recipient, reason, package type, duration, and timestamp.

### Idempotency guarantee

The supplied key is used as the promotion row’s existing UUID primary key. PostgreSQL’s primary key constraint is the durable uniqueness boundary. The promotion and audit record are written transactionally; the listing flags are only changed after the promotion insert succeeds. Sequential replay with the same request returns the existing grant; reusing a key for different parameters conflicts. Concurrent inserts race on the same primary key, so one transaction wins and the other verifies and returns that exact prior grant. No new table, constraint, or migration is needed.

Using a new key represents a separate administrator action. Administrators can intentionally issue another grant; every such action is separately audited.

## 3. Payment reconciliation

Added an admin review list at `GET /admin/payments/reconciliation-required`, under the existing admin-controller guard (`admin` or `moderator`). It returns a bounded set of paid transactions whose fulfillment marker is `required`.

The existing `POST /admin/payments/:id/reconcile` now:

1. Requires an existing Stripe transaction with `status = paid`, a `paidAt` timestamp, and a Stripe checkout-session or payment-intent reference.
2. Requires a supported one-time package.
3. Returns `already_fulfilled` if the unique payment-linked promotion already exists.
4. Otherwise retries the existing one-time activation path, which rechecks current listing/project eligibility and ownership.
5. Keeps the original payment status, Stripe references, amount, and paid timestamp. It does not refund or substitute another product.
6. Marks the payment metadata reconciliation state `required` on failure and `resolved` on successful fulfillment. Existing Stripe metadata is merged and retained.
7. Records administrator reconciliation outcomes in `AuditLog`, including failed attempts. A failed target check leaves the payment paid and the promotion absent for review.

Webhook fulfillment failures also persist a reconciliation marker and best-effort audit event. If metadata marking fails, the failure is logged and audit recording is still attempted. Stripe payment-event fulfillment continues to use the unique `Promotion.paymentTransactionId` and its existing transaction-level duplicate guard.

## 4. Persistence and migration assessment

No schema change is necessary for the implemented scope:

- Promotion idempotency uses existing `Promotion.id` primary-key uniqueness.
- The grant’s target, recipient, dates, type, non-payment representation, and reason fit existing promotion fields; actor/reason/duration/time evidence fit `AuditLog`.
- Payment reconciliation state is stored in existing `PaymentTransaction.metadataJson`; attempts and outcomes use existing audit rows.

No migration was created or applied. The JSON reconciliation filter has no dedicated index; if reconciliation volume grows, a dedicated indexed field/model may be appropriate in a later phase. The list is capped at 200 rows and is restricted to the admin API.

## 5. Tests and verification

All tests used isolated fixtures and mocked Prisma/service dependencies. No shared database, Stripe API, refund, notification, queue, or Elasticsearch operation was used.

| Verification | Result |
|---|---|
| Focused Jest suites: lifecycle, promotion, payment, admin authorization/reconciliation | PASS — 6 suites, 65 tests |
| API TypeScript | PASS — `npx.cmd tsc --noEmit --incremental false -p apps/api/tsconfig.app.json` |
| Focused ESLint | PASS — modified/added API files, zero warnings |
| Isolated Nest API build | PASS — `npx.cmd nest build api --path apps/api/tsconfig.build-verification.json` |
| Live DB, Stripe, refund, queue, notification, Elasticsearch | Not accessed |

The Nest build used a temporary config targeting a fresh `.tmp` output directory with incremental output disabled. That config/output were removed afterward. The existing locked `dist/apps/api/tsconfig.app.tsbuildinfo` was not deleted or overwritten. No persistent build script or production configuration changed.

## 6. Expiry and worker boundaries

Automatic listing expiry remains prohibited. No expiry-based eligibility, search exclusion, status transition, historical expiry update, archive, worker schedule, or Elasticsearch visibility change was introduced. The approved overdue-inventory snapshot was not queried or changed.

Scheduled promotion activation remains disabled. No worker processor was modified or activated.

## 7. Files changed

- `apps/api/src/modules/admin-operations/admin-operations.controller.ts` — admin-only grant route and reconciliation review list route.
- `apps/api/src/modules/admin-operations/admin-operations.service.ts` — grant delegation and success/failure reconciliation audit outcomes.
- `apps/api/src/modules/admin-operations/admin-promotions-authorization.spec.ts` — role-guard coverage.
- `apps/api/src/modules/admin-operations/admin-payment-reconciliation.spec.ts` — audit outcome coverage.
- `apps/api/src/modules/promotions/dto/admin-promotion-grant.dto.ts` — grant validation.
- `apps/api/src/modules/promotions/promotions.service.ts` — transactional grant, replay verification, unique-conflict handling.
- `apps/api/src/modules/promotions/promotions.service.spec.ts` — valid/invalid, idempotency, and concurrent grant cases.
- `apps/api/src/modules/payments/payments.service.ts` — verified reconciliation, eligibility revalidation, metadata marker, admin review list, preserved metadata merge.
- `apps/api/src/modules/payments/payments-promotion-security.spec.ts` — verified/unverified, ineligible, repeat, no-refund, and expiry-boundary tests.
- `docs/project-review/GHARAZI-003E-02B-S2-GRANTS-RECONCILIATION-ACCEPTANCE.md` — this report.

No Prisma schema or migration file was changed. Pre-existing unrelated working-tree changes were preserved.

## 8. Remaining risks

- Grant replay requires callers to reuse the same idempotency UUID. A new UUID is treated as a new, separately audited grant.
- The reconciliation review query filters PostgreSQL JSON metadata without a dedicated index; its result limit is 200.
- If both payment metadata update and audit persistence fail during webhook fulfillment failure, automatic reconciliation discovery may be incomplete; webhook processing still fails rather than activating an ineligible target.
- The existing Stripe webhook controller’s error response behavior was not changed. It currently maps handler exceptions to a generic webhook error response.
- No live or staging runtime verification was performed.

## 9. Recommended next phase

Add an operational admin view for reconciliation-required transactions and audit history if the existing admin payments screen does not expose the marker clearly. Consider a JSON-path index or dedicated reconciliation model only if volume warrants it. Separately harden scheduled promotion activation with an atomic status claim and notification deduplication before any worker activation. Keep automatic listing expiry excluded unless separately authorized.
