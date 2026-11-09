# GHARAZI-003E-02B-S3-A — Admin Integration & Scheduled Promotion Readiness Audit

**Scope:** Read-only source audit. No source, database, queue, payment, deployment, or runtime changes were made. Findings below describe the checked-out code, not live service behavior.

## 1. Executive summary

Gharazi already has a primary Admin Dashboard at `apps/web/app/admin/`, backed by shared React Query hooks, API clients, and a reusable resource/table component. Promotion and payment data are visible there, and payment rows already have a reconciliation action. S2 backend capabilities are only partly integrated: the secure administrative grant and reconciliation-required listing endpoints have no consumer in the primary web dashboard. The existing promotion page is read-only, and the payment page does not distinguish failed fulfillment from ordinary paid transactions.

`apps/admin/` is a separate static HTML/JavaScript console. Its deployment and current operational use cannot be established from source. It contains a payment reconciliation control, basic audit listing, and a promotions placeholder; it does not share the Next.js API client or components. It should not be presumed redundant or removed.

Scheduled promotion activation is **not safe to enable** based on the current source. API scheduler registration creates repeat jobs, but the worker processor inspected is a logging/TODO placeholder. Separately, the service activation routine has no atomic claim or transaction spanning status change and side effects. Concurrent invocations can repeat activation effects. This report does not activate or modify any schedule.

## 2. Existing admin application architecture

### Primary dashboard: `apps/web/app/admin/`

The route pages for promotions, payments, audit logs, listings, subscriptions, and system events are thin wrappers around `AdminResourceClient` (`apps/web/components/admin/admin-resource-client.tsx`). Data access is in `apps/web/lib/api/admin.ts` and `apps/web/lib/query/hooks.ts`. Shared presentation is in `admin-shell.tsx` and `admin-primitives.tsx`.

The API controller applies JWT and role guards to `/admin`; class-level roles allow `admin` and `moderator`, with narrower `@RequireRoles('admin')` on the S2 grant endpoint. The web shell also performs a client-side admin check, but backend guards remain the security boundary. Pages share loading and error states. `AdminTable` supports responsive mobile cards and desktop horizontal overflow; the inspected resource client does not provide general pagination or search/filter controls. Promotions and payments have no specific filters in this UI; other API/page filters vary by resource.

### Separate app: `apps/admin/`

This is a static HTML/JS application with hash-route navigation (`index.html`, `main.js`, `styles.css`). It manually accepts an API base URL and bearer token; `main.js` stores those values in browser local storage and calls API paths directly. It does not reuse the Next.js hooks, API client, or React components. Its promotions view explicitly says management is deferred; payments show basic transaction fields and a reconcile button; audit logs show action/entity/entity ID/date. The subscriptions page requests `/subscriptions/plans`, not the admin subscription list. No source evidence establishes how or whether this app is currently deployed or used; classify its operational role **UNKNOWN**, with legacy/supplementary use plausible but unverified.

## 3. `apps/web/app/admin` feature inventory

| Area | Source-backed behavior | Sufficiency for S2 |
|---|---|---|
| Promotions | `/admin/promotions` query; columns for package/type, target, status, start/end. No grant/create action in `AdminResourceClient`. | Existing listing is reusable, but S2 grant workflow is absent. |
| Payments | `/admin/payments` query; displays package, user, target, amount/currency, status, Stripe reference, paid/created date. A “Reconcile” button calls the existing POST route for every row. | Generic retry exists; no reconciliation-required queue/view, eligibility indication, fulfillment outcome, or guarded row-specific workflow. |
| Audit logs | `/admin/audit-logs` query. Generic columns resolve `id`, `name` (including `action`), `status`, and updated/created date. | Events can be retrieved, but actor, entity ID, target, and metadata/reason are not meaningfully exposed. |
| Listings | `/admin/listings` query and approve/reject actions; list includes owner, city, verification, status. | Could support target discovery/reference, but no grant integration or eligibility detail. Do not add a second listing workflow. |
| Subscriptions | `/admin/subscriptions` query; package, user, status, Stripe subscription, period end. | Read-only subscription overview; no direct S2 grant or reconciliation capability. |
| System events | `/admin/system-events` query; severity, source, message, request ID, status, created; open events can be resolved. | Operational event view, separate from audit evidence; no specific grant/reconciliation context. |

The shared client shows loading, request error, empty-table behavior and mutation errors. Mutations invalidate the admin queries and query cache. It does not show confirmation for payment reconciliation in the inspected implementation. The `Reconcile` action is rendered for every payment row rather than only reconciliation-required entries; backend validation still rejects unsupported transactions, but the UI invites invalid attempts.

## 4. S2 backend endpoint inventory

All routes below are defined by `AdminOperationsController` (`apps/api/src/modules/admin-operations/admin-operations.controller.ts`). Controller guards are `JwtAuthGuard` and `RolesGuard`; class roles are `admin` and `moderator`, except the grant route, which explicitly narrows to `admin`.

| Method and path | Role | Request | Source-level response/behavior | Web consumer |
|---|---|---|---|---|
| `GET /admin/promotions?status=` | admin, moderator | Optional status query | Admin promotions list (service result) | Yes: `listAdminPromotions` / `useAdminPromotions` |
| `POST /admin/promotions/grants` | admin only | `AdminPromotionGrantDto`: UUID `idempotencyKey`, UUID `listingId`, `promotionType` (`listing_hot` or `listing_super_hot`), integer `durationDays`, reason (10–1000 chars) | `grantPromotion` delegates to `PromotionsService.grantAdminPromotion`; returns created/replayed promotion result | **No** |
| `GET /admin/payments` | admin, moderator | None | Admin payment list | Yes: `listAdminPayments` / `useAdminPayments` |
| `GET /admin/payments/reconciliation-required` | admin, moderator | None | Paid transactions marked `fulfillmentReconciliation.status=required`; maximum 200 oldest-updated records | **No** |
| `POST /admin/payments/:id/reconcile` | admin, moderator | UUID path ID; no body | Revalidates verified paid Stripe transaction and package; returns `{ok,status,outcome,promotionId?}` or API error. Admin wrapper audits outcome/failure. | Yes, generic `reconcileAdminPayment` for `/admin/payments/:id/reconcile` |
| `GET /admin/audit-logs?limit=` | admin, moderator | Optional limit | Recent audit rows, service cap 200 | Yes: `listAdminAuditLogs` / `useAdminAuditLogs` |

DTO validation is explicit for grant fields in `apps/api/src/modules/promotions/dto/admin-promotion-grant.dto.ts`. The S2 admin grant path validates supported one-time listing packages and exact package duration, and requires a currently active, published, non-deleted listing. It stores reason and actor/target context in the existing audit log; it does not set a Stripe transaction reference. The existing Promotion primary key uses the supplied idempotency UUID; conflict/replay handling is in the service. No database migration was required by S2.

The payment reconciliation service accepts only Stripe transactions that are marked paid, have `paidAt` and a Stripe checkout-session or payment-intent reference, and map to a one-time package. It checks existing fulfillment, retries the existing one-time activation path, and writes reconciliation metadata. It does not issue a refund or substitute a product. The exact success result has `outcome` of `already_fulfilled` or `fulfilled`; errors are surfaced as API errors and logged to `AuditLog` by the admin wrapper.

Existing seller-facing promotion routes remain separate (`apps/api/src/modules/promotions/promotions.controller.ts`); the S2 grant endpoint is not exposed through them.

## 5. Promotion grant integration findings

**Classification: CONFIRMED GAP.** The primary Promotions page can host this action without a new interface: it already loads the promotion resource and shares AdminTable, API module, query hooks, error display, and mutation invalidation. But it is currently read-only and there is no frontend client for `POST /admin/promotions/grants`.

Minimum integration should extend the existing Promotions page with an admin-only grant form/confirmation using the existing route and DTO, a listing ID selector/search backed by the existing admin listing API (or an approved existing target lookup), supported type/duration choices, required reason, and clear eligibility/response state. Keep seller promotion endpoints and payment checkout paths untouched. Retry must reuse the same idempotency key for the same submitted grant; a new deliberate grant should get a new key. Backend admin authorization and service validation must remain authoritative.

The promotion list endpoint currently offers a status query, but the inspected UI does not expose it. That is an optional usability enhancement, not a prerequisite for secure grant handling.

## 6. Payment reconciliation integration findings

**Classification: PARTIALLY IMPLEMENTED / CONFIRMED GAP.** The existing Payments page already uses the current admin payment API and can be extended in place. The S2 backend provides a dedicated reconciliation-required endpoint, but there is no frontend client/hook for it. The normal payments list is a recent list (source service caps it at 200); the reconciliation-required query also uses `take: 200`, ordered by `updatedAt` ascending, without cursor/page parameters or a dedicated index for the JSON metadata path.

Consequences: administrators can miss required records beyond the first 200; the unfiltered generic list’s “Reconcile” button does not reveal whether fulfillment is actually required, and may offer reconciliation for unrelated rows. A payment becoming ineligible after successful charge remains a human review case; UI must preserve payment evidence and must not show a refund or substitution action that the API does not implement.

Minimum safe integration: add a reconciliation-required view/tab to the existing Payments page, using the dedicated endpoint and displaying transaction ID, target, package, paid status/time, amount/currency, and safe reconciliation marker/outcome. Restrict retry controls to returned required records; show pending/error/fulfilled results and refresh both payment queries. Do not render raw payment metadata or sensitive provider payloads. For complete operational coverage, a subsequent backend change needs stable pagination (cursor or page/limit with deterministic ordering) and a query/index strategy. Until then, explicitly label the 200-record cap and do not represent the view as complete.

## 7. Audit Logs and System Events

S2 grant writes a `promotion.admin_grant` AuditLog with actor, promotion entity, and metadata including idempotency key, listing/recipient, promotion type, duration, reason and time. Reconciliation writes `payment.reconcile` audit rows with actor and payment transaction entity; success records outcome, failure records outcome plus error type. Existing `AuditLog` fields and indexes (`actorUserId/createdAt`, entity type/id, action) support retrieval without schema changes. The admin endpoint returns a bounded recent list (maximum 200) and has no filters or pagination.

The primary Audit Logs page does not currently render the actor, affected entity, target, or reason/outcome metadata in a useful way. **Events are persisted and retrievable; administrative audit visibility is insufficient for practical review.** Extend the existing audit page and API response projection to show actor, action, entity type/ID, timestamp, and carefully allowlisted metadata; add action/entity/actor filters and pagination in a later scoped implementation as needed. Do not expose Stripe secrets, full payment payloads, contact data, or unrestricted JSON.

System Events are a distinct operational stream with severity/source/message/request ID/status and resolve behavior. They are not a substitute for the durable S2 AuditLog records. The current system-event page omits event-associated user/entity/details beyond its listed columns.

## 8. Scheduled promotion activation concurrency assessment

`apps/api/src/modules/scheduler/scheduler.module.ts` registers repeat jobs `activate-due` every 10 minutes and `end-expired` every 15 minutes during module initialization, with stable job IDs. This is producer/schedule registration in API source. `apps/worker/src/jobs/promotions/promotion-lifecycle.processor.ts` is registered in `apps/worker/src/worker.module.ts`, but the inspected processor only logs and contains a TODO; it does not call the promotion lifecycle service. Thus source establishes scheduled job definitions, not successful consumption.

The service method `PromotionsService.activateDuePromotions()` verifies the associated paid transaction, purchaser, package, entity, and target eligibility before activation. However, it reads due scheduled rows and then unconditionally updates each row to active. The status update, target featured flags, search indexing enqueue, and notification creation/delivery enqueue are not protected by one atomic claim. Two callers can both read the same scheduled row, pass checks, activate it, update target flags, enqueue duplicate indexing, and create duplicate activation notifications. There is no activation-specific audit row in this path.

The existing unique constraint on `Promotion.paymentTransactionId` prevents multiple promotion rows tied to one transaction; it does **not** make repeated processing of the same row’s activation side effects idempotent. `Notification` has no unique deduplication key or compound uniqueness for an activation event; `NotificationsService.create()` always inserts a new notification, then may enqueue delivery. Existing notification persistence therefore does not prevent duplicate activation notices.

**Readiness: NOT READY.** Do not enable scheduled activation. The minimum future correction is an atomic compare-and-set claim of the promotion from `scheduled` to `active` (e.g. conditional `updateMany` and proceed only when exactly one row is claimed), with target mutation and durable side-effect intent coordinated transactionally. To guarantee notification/indexing exactly-once intent across failures, use an existing transactional outbox/dedup mechanism if one is confirmed; otherwise a schema-level event key/outbox or equivalent atomic unique record is needed. Queue enqueue itself cannot be atomically committed with PostgreSQL. Verify retry semantics and idempotent consumers before activation. No worker code was changed or run in this audit.

The scheduled `end-expired` path also has repeated side effects on concurrent processing (status update, recompute flags, notification), but schedule/worker recovery is outside this audit’s authorization. Do not interpret this as permission to enable it.

## 9. Duplication and regression risks

- **Duplicate admin UI:** A new grant or reconciliation dashboard would duplicate the existing `/admin/promotions` or `/admin/payments` pages. Extend those pages.
- **Duplicate API clients/services:** `apps/web/lib/api/admin.ts` and `useAdmin*` hooks are established patterns; add consumers there rather than direct fetches or a second client.
- **Legacy app divergence:** `apps/admin/` uses independent local-storage token/API configuration; implementing workflows there as well would create parallel control surfaces and inconsistent authorization UX. First establish whether it is operationally used; S3-B should target the confirmed primary web dashboard unless owner specifies otherwise.
- **Payment/webhook regression:** Reconciliation should call the existing S2 endpoint only. Do not bypass verified Stripe fulfillment or mutate payment status from the UI.
- **Permission mismatch:** Backend grant is admin-only while read/reconcile routes allow admin/moderator. Frontend must reflect, but never replace, backend authorization.
- **Listing lifecycle/search:** Grant target selection must not alter publication, status, expiry, Buy/Rent filters, ranking, or search rules. No expiry filtering is part of this work.
- **Sensitive audit/payment data:** Rendering full metadata or provider payloads risks disclosure; expose an explicit safe projection only.

## 10. Implementation matrix

| Area | Existing implementation | Confirmed gap | Minimum correction | Risk |
|---|---|---|---|---|
| Admin applications | Next dashboard and separate static app exist | Static app deployment/use unknown; potential duplicate workflows | Confirm operational ownership; use established Next admin pages for S3-B | Medium |
| Promotion grants | Admin-only S2 endpoint, DTO, package/target checks, audit record and UUID idempotency exist | No UI consumer | Extend existing Promotions page and API/hooks; preserve admin-only guard and retry key | Medium |
| Payment reconciliation | S2 endpoint validates paid Stripe fulfillment and audits attempts; web generic retry exists | No required-only view; action appears on every row; cap 200/no pagination | Extend existing Payments page to consume required endpoint; add transparent bounded/paginated coverage before claiming completeness | High until coverage and eligibility UI are clear |
| Audit visibility | Durable AuditLog rows and endpoint exist | UI hides useful actor/entity/context; list bounded and unfiltered | Extend existing Audit Logs presentation and safe filters/pagination | Medium |
| System events | Existing list and resolve action | Not linked to S2 audit; event detail columns limited | Keep distinct; improve only if useful to operational review | Low/optional |
| Scheduled activation | Schedule definitions and service validation exist | Worker processor placeholder; service activation has race/duplicate side-effect risk; no notification dedupe | Keep disabled; implement atomic claim and durable dedup/outbox semantics, then isolated tests and explicit activation approval | High |

## 11. Minimum recommended S3-B scope

1. Integrate the grant form into the existing `/admin/promotions` resource page using the existing admin API client/hooks and backend DTO. Provide listing target identification, supported package/duration, reason, confirmation, and idempotency-key reuse on retry.
2. Integrate `GET /admin/payments/reconciliation-required` and the existing reconcile POST into the existing `/admin/payments` page. Do not expose reconciliation as a generic action on all transactions. Clearly show the 200-row limit until safe pagination is implemented.
3. Improve the existing Audit Logs page to show actor/action/entity/time and allowlisted grant/reconciliation metadata. Add filters/pagination only with a defined API contract and bounded query behavior.
4. Reuse `AdminResourceClient`/`AdminTable`, `AdminError`, `AdminLoading`, `StatusBadge`, `apps/web/lib/api/admin.ts`, and existing query hooks where suitable; avoid a parallel admin module or payment workflow.
5. Keep promotion schedules disabled. A separate readiness change must implement and test atomic activation ownership, notification/indexing deduplication, and failure recovery before owner approval to activate.

## 12. Deferred items and owner decisions

- Confirm whether `apps/admin/` remains used, who owns it, and whether it should be maintained; no consolidation/removal is recommended without that answer.
- Decide if moderator role should be allowed to reconcile payments; source currently permits it, while grant is admin-only.
- Decide the required pagination/coverage contract for reconciliation-required transactions beyond 200 and whether a schema index is approved if needed.
- Decide the notification/outbox persistence strategy required for duplicate-safe scheduled activation.
- Confirm acceptable admin audit retention and filtering policy; no schema change is established as necessary for current grant evidence, but complete scalable list pagination may need backend work.
- Automatic listing expiry remains prohibited. This audit makes no recommendation to change that policy and identifies no expiry-based visibility behavior as part of S3-B.

## Evidence and verification limits

This audit inspected source and Prisma model definitions only. It did not query the live database, call APIs, inspect deployment dashboards/logs, inspect or mutate queues, run tests, or verify deployed UI behavior. Current source review is not proof that any endpoint or dashboard is operational in production. No application code or configuration was modified; this requested Markdown audit is the only intended deliverable.
