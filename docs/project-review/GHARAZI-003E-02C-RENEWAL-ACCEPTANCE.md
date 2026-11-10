# GHARAZI-003E-02C — Seller-Initiated Renewal Acceptance

## Status: COMPLETE (source implementation and isolated verification)

Implemented the owner-approved free renewal policy in the existing listing lifecycle API and My Listings interface. No live database/service was accessed, no migration was applied, and no deployment or production operation was performed.

## Approved policy enforced

- Only ACTIVE, non-deleted listings with a valid non-null expiry qualify.
- The requester must be the listing owner or the assigned manager. Admin/moderator role alone grants no access.
- Renewal is available when expiry is within 15 days or overdue.
- One successful renewal per listing per rolling 90 days; renewal is free.
- New expiry is `max(existingExpiresAt, database renewal timestamp) + 90 days`.
- No automatic renewal or expiry enforcement is introduced.

## Implementation

`POST /listings/:id/renew` is protected by the existing JWT controller guard and validates an UUID idempotency key. `ListingsService.renew()` rechecks identity, status, deletion, expiry window, and cooldown inside a serializable Prisma transaction. PostgreSQL `CURRENT_TIMESTAMP` supplies the transaction timestamp. A conditional `updateMany` compare-and-set on the previously observed expiry and current eligibility ensures only one concurrent transaction can extend a listing. The listing expiry update and `listing.renewed` audit record commit together; the audit metadata records actor, listing, previous/new expiry, renewal timestamp, source, duration, and idempotency key. Same-key retries return the persisted result. Concurrent conflict handling checks for the committed audit and replays it if present.

No new schema object is required: `audit_logs` already stores actor/action/entity/JSON metadata and timestamp, while listing expiry is already present. The compare-and-set plus same-transaction audit is the durable cooldown/idempotency evidence. Database uniqueness on the idempotency key is not added; correctness relies on the listing CAS and transaction isolation, and keys are scoped to actor + listing + action.

The existing My Listings cards display expiry and server-derived eligibility/next-available time. An eligible ACTIVE listing shows a confirmation-protected free renewal action. The UI suppresses duplicate in-flight requests, retains the same UUID across retry after failure, and clears it on success. Success/error states are accessible. Existing Refresh behavior remains distinct and unchanged: it updates `lastRefreshedAt` only. Renewal does not update `updatedAt`, enqueue indexing, change status, alter visibility, or touch promotions/payments/subscriptions.

## Files changed

- `apps/api/src/modules/listings/listings.controller.ts`
- `apps/api/src/modules/listings/listings.service.ts`
- `apps/api/src/modules/listings/dto/renew-listing.dto.ts` (new)
- `apps/api/src/modules/listings/listings-renewal.spec.ts` (new)
- `apps/web/components/dashboard/supply-list-client.tsx`
- `apps/web/lib/api/supply.ts`
- `apps/web/types/marketplace.ts`
- `docs/project-review/GHARAZI-003E-02C-RENEWAL-ACCEPTANCE.md`

## Verification

- API TypeScript: passed (`tsc --noEmit --incremental false -p apps/api/tsconfig.app.json`).
- Web TypeScript: passed (`tsc --noEmit --incremental false -p apps/web/tsconfig.json`).
- Focused ESLint on changed API and web files: passed.
- Focused Jest: passed, 2 suites / 25 tests (`listings-renewal.spec.ts` and existing `listings.service.spec.ts`), using mocks/fixtures only.
- Controller validation: existing global Nest `ValidationPipe` validates the renewal DTO.
- No browser or authenticated staging verification was available; responsive behavior was reviewed in source, not claimed as rendered/browser-tested.
- No production API, database, Redis, Elasticsearch, payment, or notification service was used.
- Production builds were not run: prior API build output had a Windows locked artifact, and type checks plus focused Jest were used without touching build artifacts.

## Limitations and risks

- Tests validate transaction logic through isolated mocks; they do not prove PostgreSQL serializable/CAS behavior against the live database. No integration connection was made by design.
- Dashboard eligibility is a presentation hint based on current listing fields; the API remains authoritative and may reject stale state.
- The listing's expiry update and audit write are transactional. Same-key replay is durably recorded in audit JSON, but there is no standalone unique idempotency-key constraint. Concurrent safety depends on the atomic expiry compare-and-set and transaction isolation.
- Browser interaction and visual verification remain for a safe staging environment.

## Next step

Run authenticated create-free renewal acceptance against an isolated staging database after approval and ensure no production endpoints are used. Keep automatic expiry enforcement separately prohibited unless explicitly approved.
