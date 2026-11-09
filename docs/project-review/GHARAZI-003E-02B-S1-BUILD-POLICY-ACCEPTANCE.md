# GHARAZI-003E-02B-S1 — API Build Verification & Promotion Policy

## 1. API build findings

The original `npx nest build api` failed during Nest's cleanup of the configured output directory, with `EPERM` unlinking `dist/apps/api/tsconfig.app.tsbuildinfo`. The artifact was present, had a normal Archive attribute, and the inspecting user had delete/modify permissions. Its timestamp and size remained unchanged during this phase.

Process inspection found no Gharazi API, Nest build, or TypeScript compiler process. Two Node processes were present; the inspected process command-line classification did not match the Gharazi workspace, Nest API, or compiler. No process was terminated. The precise OS cause of the unlink denial is therefore **not confirmed**; source compilation was not implicated.

### Isolated build verification

Created a temporary API tsconfig extending the existing `apps/api/tsconfig.app.json`, disabling incremental output and directing compiled output to a new, isolated `.tmp/gharazi-api-build-verification` directory. Then ran:

```text
npx nest build api --path apps/api/tsconfig.build-verification.json
```

Result: **PASS (exit code 0)**. Temporary config and output were removed after verification. The original `dist/apps/api/tsconfig.app.tsbuildinfo` was not deleted or changed. No build scripts, persistent configuration, or application behavior were modified. This verifies the API Nest/TypeScript build with isolated output; the regular output-cleanup path remains environment-blocked.

## 2. Security regression results

Re-reviewed the GHARAZI-003E-02B-S changes in `ListingsService`, `PromotionsService`, `PaymentsService`, their DTOs/controllers, `AuditService`, and the Prisma model definitions.

- Direct authenticated seller promotion creation rejects without persistence.
- Checkout restricts listing/project targets to the authorized owner/manager or developer, published, active, and non-deleted.
- Verified payment fulfillment checks package/entity consistency and rechecks target eligibility/ownership before promotion and listing-flag writes.
- Promotion update service accepts notes only; any other supplied key is rejected.
- Stripe signature verification remains in the webhook path. The payment-transaction lookup/unique promotion association and transaction retain duplicate fulfillment protection.
- Admin/moderator operations remain under the existing admin controller role guard. The new promotion grant policy below is stricter: recommend admin only.
- No expiry comparison was added to checkout or fulfillment.

Verification executed with mocks/fixtures only:

| Check | Result |
|---|---|
| Focused Jest listing, promotion, and payment suites | PASS — 4 suites, 47 tests |
| API TypeScript (`tsc --noEmit --incremental false`) | PASS |
| Focused ESLint, zero warnings | PASS |
| Isolated Nest API build | PASS |
| Live DB, Stripe, Redis, notification, Elasticsearch calls | Not performed |

The webhook unit test exercises event dispatch/activation with mocked persistence; it does not contact Stripe or independently validate a live webhook signature. Signature verification is verified by source inspection.

## 3. Administrative promotion grant policy

### Adopted design

An administrative promotional grant must be a distinct server-side operation, available to an explicitly privileged administrator (recommend `admin` role only), and must:

1. Identify the grant actor and recipient/target.
2. Require a non-empty reason and bounded duration.
3. Apply current ownership and eligibility checks to listing/project targets.
4. Create a promotion that is explicitly not a paid transaction (`paymentTransactionId = null`; no fabricated Stripe/payment record).
5. Record an audit event with actor, target, reason, duration, grant/promotion ID, and timestamp.
6. Have durable idempotency protection against duplicate requests.
7. Keep sellers unable to use their existing `/promotions` creation route to grant or activate promotions.

### Current capability and dependencies

`AuditService.record()` accepts actor, action, entity type/ID, metadata JSON, and IP address. `AuditLog` stores actor, action, entity ID, JSON metadata, IP, and creation timestamp. These fields can record the requested grant evidence without schema changes. `Promotion` already has target, recipient (`purchasedByUserId`), start/end, notes, and nullable `paymentTransactionId`; a grant could remain clearly outside the paid-payment model.

However, there is no dedicated grant endpoint or grant discriminator, and the audit table has no unique request/idempotency key. Audit metadata can describe a grant but cannot by itself guarantee duplicate suppression under concurrent requests. A durable implementation needs a unique grant/idempotency identifier. This likely requires a small schema addition (or a dedicated grant record with a unique idempotency key); a non-atomic “check existing, then create” is insufficient. No grant mechanism was implemented in this phase.

The scheduled promotion activation guard currently requires a paid matching transaction. If grants need delayed activation, that path needs an explicit audited grant entitlement design; do not weaken the payment check or overload a fake transaction.

## 4. Payment succeeds after target becomes ineligible

### Adopted policy

- Do not activate the promotion.
- Preserve the verified Stripe/payment transaction as paid.
- Record a reconciliation requirement and expose it for authorized admin review.
- Do not automatically refund or silently convert the payment to a different promotion.
- Make fulfillment retry idempotent.

### Current support and gaps

`PaymentTransaction` stores provider references, package, target, status, paid timestamp, and JSON metadata. Its status is a string rather than a database enum, and `metadataJson` can represent a reconciliation marker without a migration. `SystemEvent` also has status/severity/details and can carry transaction context, but its helper swallows persistence errors and has no deduplication constraint, so it is not sufficient by itself as the authoritative reconciliation record.

The current payment webhook writes `status: paid` before one-time activation. If target revalidation then rejects activation, the paid record remains and webhook retry can attempt fulfillment again. An admin-only `/admin/payments/:id/reconcile` route exists under the admin controller guard; it retries activation for a paid transaction and audits successful calls. There is no dedicated `reconciliation_required` marker or queue/list workflow, and failed reconcile calls are not audited by the wrapper because it records only after the service returns.

Conclusion: a basic reconciliation marker can be added to `PaymentTransaction.metadataJson` without schema changes, preserving Stripe data by a careful JSON merge. A discoverable, indexed, operational reconciliation queue would need a later implementation and may benefit from a dedicated field/index or a durable reconciliation model. No payment state, record, refund, or endpoint was changed here.

## 5. Scheduled activation idempotency assessment

The paid webhook path is protected by:

- A unique `Promotion.paymentTransactionId` constraint.
- Existing promotion lookup inside a Prisma transaction before promotion creation and target flag updates.
- Revalidation of the paid transaction and target before writes.

Repeated webhook processing therefore does not create a second promotion or repeat the transactional listing flag update. The duplicate path still emits a generic “promotion activated” log after the transaction callback returns; this is a logging accuracy issue, not a duplicate promotion write.

Scheduled activation is weaker. It checks payment and target, then updates status and runs indexing/notification side effects without a conditional atomic claim of the scheduled status. Concurrent invocations could both read the same due row and duplicate notification/indexing effects. The scheduler/worker is not activated by this phase. Before enabling it, use an atomic `WHERE status = scheduled` claim (and only run side effects for the winning update), then add notification idempotency/deduplication appropriate to the delivery path.

## 6. Expiry enforcement prohibition

Automatic listing expiry remains prohibited. The confirmed owner snapshot is 16,157 total listings, including 15,191 active: 3,632 active and overdue, and 11,559 active and not overdue.

This phase did not and must not:

- Filter overdue listings from public search or detail.
- Change listing status based on expiry.
- Rewrite historical `expires_at` values.
- Add expiry schedules or worker jobs.
- Auto-archive overdue listings.
- Add expiry eligibility to promotion checkout or fulfillment.
- Change Elasticsearch visibility/index eligibility based on expiry.

Any grandfathering, expiry rollout, or enforcement policy requires separate owner approval and a data-impact plan.

## 7. Remaining implementation dependencies

1. Admin grant API/service with admin-only guard, explicit reason/duration, target checks, non-payment representation, and audit event.
2. Durable grant idempotency key or grant record; existing audit metadata has no unique constraint.
3. Payment reconciliation marker and admin workflow, including auditing failed attempts and preserving verified payment metadata.
4. An explicit owner decision on treatment of paid-but-ineligible fulfillment (manual review first; refund/credit only after separate approval).
5. Atomic scheduled promotion activation and notification deduplication before activating the processor.
6. Continue to defer all expiry enforcement and overdue listing changes.

## 8. Recommended GHARAZI-003E-02C scope

Prioritize a separate design/implementation for durable payment reconciliation and an audited admin promotion grant, including schema need for unique grant idempotency. Add mock tests for authorization, duplicate retries, audit evidence, ineligible target handling, and no fake payment linkage. Separately harden scheduled activation with an atomic claim and notification deduplication before considering worker activation. Keep listing-expiry work explicitly excluded until policy approval.

## 9. Files changed in this phase

- `docs/project-review/GHARAZI-003E-02B-S1-BUILD-POLICY-ACCEPTANCE.md` — this report.

No source, database, build configuration, persistent artifact, worker, or deployment file was changed. Temporary build configuration/output were removed. No live data or infrastructure was accessed or modified.
