# GHARAZI-003E-02B-S — Lifecycle Authorization & Promotion Security

## 1. Baseline findings

Reviewed the prior lifecycle investigation, owner decisions, worker audit, listing lifecycle service, promotion API/service, payment checkout and Stripe event handling, package catalog, Prisma models, and existing tests.

Confirmed baseline risks:

- `publish()` accepted any listing status; `sold`/`rented` could be applied from any status; `refresh()` accepted any status; `archive()` accepted most statuses.
- Seller `POST /promotions` created active/scheduled promotion records directly from client-supplied dates and applied Featured state without payment evidence.
- Promotion `PATCH` accepted target/type/date properties and spread them into persistence after checking only promotion purchaser ownership.
- Stripe one-time activation used a unique payment transaction and a database transaction, but did not revalidate target ownership or eligibility at fulfillment.
- Scheduled promotion activation also trusted any due row without checking payment. The worker audit says the scheduled processor is currently a placeholder; this change does not enable it.
- Existing owner policy decisions remain pending. In particular, expiry policy is unresolved and overdue active inventory must not be newly excluded.

There is no explicit administrative promotion-grant endpoint or entitlement-to-promotion creation flow in the inspected API. Therefore direct creation is closed until such a trusted flow is approved and implemented.

## 2. Listing transition matrix

Supported status strings are application data values (not a Prisma enum): `draft`, `pending`, `active`, `sold`, `rented`, `archived`, `expired`, and `rejected`.

| Current status | Requested action | Result | Required access | Behavior/evidence |
|---|---|---|---|---|
| draft | Publish | Allowed | Owner or manager | Existing `POST /listings/:id/publish`; validates required fields, transitions to active, writes history, indexes. |
| active / pending / sold / rented / archived / expired / rejected | Publish | Rejected (409) | Owner or manager first | Server check precedes transition/history/indexing. Prevents accidental republish and expiry bypass. |
| active | Mark sold | Allowed | Owner, manager, admin, or moderator | Existing route; transitions to sold, history and indexing preserved. |
| active | Mark rented | Allowed | Owner, manager, admin, or moderator | Existing route; transitions to rented, history and indexing preserved. |
| Any non-active state | Mark sold/rented | Rejected (409) | Owner, manager, admin, or moderator first | No update, status history, or indexing. |
| active | Refresh | Allowed | Owner, manager, admin, or moderator | Updates `lastRefreshedAt` only; does not alter status or `expiresAt`. |
| Any non-active state | Refresh | Rejected (409) | Owner, manager, admin, or moderator first | No mutation or indexing. |
| draft / active | Archive | Allowed | Owner, manager, admin, or moderator | Existing history and index removal retained. |
| archived / expired | Archive | Idempotent no-op | Owner, manager, admin, or moderator | Existing no-op behavior retained. |
| pending / sold / rented / rejected | Archive | Rejected (409) | Owner, manager, admin, or moderator first | No history or index removal. |

Publish remains owner/manager-only as before; the patch does not add administrator or moderator publish bypasses. Existing management authorization remains in `assertCanManage`. Transition writes now include the expected prior status in the Prisma update, and refresh writes require `status: active`, preventing stale reads from overwriting a concurrent status change. A Prisma record-not-found race is translated to 409; the transaction prevents a history entry from being committed without the status update.

## 3. Promotion trust boundaries

### Seller-facing creation

`POST /promotions` remains authenticated but now fails closed with 403. It has no trusted payment reference, entitlement proof, or explicit admin-grant context, so it cannot create or activate a promotion. Search of current frontend/API call sites found no supported caller of this direct creation route; paid checkout is the established listing/project promotion path.

### Promotion updates

The purchaser may update `notes` only. Target entity, target ID, type, dates, and any other client-supplied fields are rejected before persistence. This prevents target swapping, duration changes, and attempts to manipulate status, featured flags, payment linkage, or purchaser identity. Existing ownership check on the promotion remains.

### Scheduled promotion activation

`activateDuePromotions()` now requires a matching paid transaction, package code, purchaser, entity type, and entity ID. It then rechecks that listing/project target is published, active, not deleted, and still owned/managed by the purchaser. Unpaid, mismatched, missing, or ineligible rows are skipped. No scheduler or worker was started or activated.

## 4. Ownership and eligibility

Paid listing checkout now requires an active, published, non-deleted listing owned or managed by the checkout user. Paid project checkout requires an active, published, non-deleted project under that user’s developer account. The same checks run inside Stripe one-time promotion activation before a promotion or listing flag is written.

The fulfillment path also verifies that `PaymentTransaction.entityType` matches the selected package’s required entity type. Existing package catalog, duration, entitlement flags, checkout creation, verified Stripe event routing, and unique `paymentTransactionId` idempotency are retained.

No expiry restriction was added: `expiresAt` is deliberately not part of promotion eligibility because the owner has not decided expiry policy and prior review identified overdue active listings. No existing promotion or listing record was changed.

## 5. Payment and promotion behavior retained

- Stripe signature verification remains in `PaymentsService.constructEvent()` and the webhook controller continues to require the raw body and signature.
- Successful one-time payment events still create the promotion and apply the selected package entitlements within the existing Prisma transaction.
- Duplicate payment event activation remains guarded by the unique payment-transaction promotion lookup.
- Scheduled promotion activation remains inactive operationally according to the worker audit; this patch only hardens the service method if invoked later.
- No admin promotion grant path was present to preserve. Adding one requires an explicit role/policy decision and audited grant mechanism.
- Existing promotion cancellation/expiry behavior was not changed.

## 6. Files modified or added

- `apps/api/src/modules/listings/listings.service.ts` — server-side transition eligibility, active-only refresh, status-conditional writes.
- `apps/api/src/modules/promotions/promotions.service.ts` — fail-closed direct creation, notes-only updates, payment/target checks for scheduled activation.
- `apps/api/src/modules/payments/payments.service.ts` — checkout and payment fulfillment ownership/status checks.
- `apps/api/src/modules/listings/listings-lifecycle-security.spec.ts` — transition, role, mutation, and indexing tests.
- `apps/api/src/modules/promotions/promotions.service.spec.ts` — direct creation/update/activation guard tests.
- `apps/api/src/modules/payments/payments-promotion-security.spec.ts` — verified event flow, duplicate handling, eligibility tests.

`listings.service.ts` and its existing spec already contained unrelated GHARAZI-003B WhatsApp changes in the working tree; those changes were preserved. No search, GUI, database, migration, queue, or deployment files were changed.

## 7. Tests and verification

All tests use local mocked Prisma/service objects. No live database, Redis, Stripe request, notification sender, or Elasticsearch client was contacted.

- Focused Jest: **47 tests passed** across four suites (lifecycle, existing listing tests, promotions, payments). Runtime result from the final rerun is recorded below.
- API TypeScript: `npx.cmd tsc --noEmit --incremental false -p apps/api/tsconfig.app.json` — passed.
- Focused ESLint: the six changed/added API TypeScript files with `--max-warnings=0` — passed.
- API production build: `npx.cmd nest build api` — blocked because it attempted to unlink the existing `dist/apps/api/tsconfig.app.tsbuildinfo` and Windows returned `EPERM`. The existing artifact was left untouched. TypeScript check passed independently.
- No runtime API/staging test was performed; production records and infrastructure were not accessed.

## 8. Preserved functionality and regression boundaries

- Refresh still only changes `lastRefreshedAt`; it does not extend `expiresAt`, change listing status, add a cooldown, or change ranking.
- Valid publish, sold, rented, archive, and refresh operations keep their existing status history, indexing, and role enforcement for the allowed states above.
- Buy/Rent search implementation, query semantics, Elasticsearch filtering, PostgreSQL fallback, ranking, pagination, and response contracts were not touched.
- No expiry enforcement, renewal, reminder, payment pricing, subscription, webhook event semantics, schema changes, migrations, or production actions were introduced.

## 9. Remaining security risks and limitations

- Existing active promotions created before this change are not altered, even if unsupported or unpaid. No production inventory cleanup was authorized.
- A customer may complete payment after a target becomes ineligible between checkout and webhook fulfillment. Activation now fails closed; refund/credit handling for that paid-but-unfulfilled case is a policy gap.
- Scheduled promotion activation can still send duplicate notifications if independently invoked concurrently after passing its checks; scheduler implementation/activation and operational idempotency remain part of a later worker review.
- `reconcile()` trusts the already persisted `paid` transaction status and is not exposed by a seller controller in the inspected source; any future admin exposure should retain strict role checks and auditing.
- Promotion entitlement support for non-listing advertising entities has no explicit admin grant implementation; direct seller creation is intentionally blocked pending an approved workflow.
- There is no runtime confirmation that staging or production has the same source revision. No deployment was performed.

## 10. Deferred owner decisions

1. Whether an audited administrator promotion-grant operation is required, and the exact allowed roles/reason/audit requirements.
2. Refund, credit, or manual review when payment succeeds but the target becomes ineligible before fulfillment.
3. Expiry-related promotion policy. No expiry-based rejection was introduced.
4. Whether scheduled promotion lifecycle jobs should be enabled after worker and idempotency review; this batch did not activate them.

## 11. Recommended next phase

Resolve the four policy decisions above, then separately implement and test a deliberate administrator grant/refund workflow if needed. Before enabling scheduled promotion processors, add atomic activation claiming and notification deduplication tests, and review existing scheduled rows read-only. Continue to leave listing expiry enforcement out of scope until policy approval.
