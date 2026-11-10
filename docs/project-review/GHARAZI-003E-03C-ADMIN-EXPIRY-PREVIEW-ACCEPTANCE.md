# GHARAZI-003E-03C — Admin Listing Expiry Preview Acceptance

## Status

**COMPLETE (source implementation and isolated verification).** The preview is read-only and is integrated into the existing `/admin/listings` page. No live API/database runtime was exercised, and no listing data was changed.

## Existing components reused

- `apps/web/app/admin/listings/page.tsx` remains the page entry point and still renders the existing `AdminResourceClient` moderation/review workflow.
- New `AdminListingExpiryPanel` uses existing UI primitives (`Card`, `Input`, `Select`, `Button`, and admin empty/loading/error states), existing `apiRequest` API client, and the application's React Query setup.
- New endpoints are methods on the existing `AdminOperationsController` and service; they inherit the controller's `JwtAuthGuard`, `RolesGuard`, and `@RequireRoles('admin', 'moderator')` requirements.
- Renewal history reuses `audit_logs` entries with `action = 'listing.renewed'`; no renewal or listing lifecycle service was changed.

## Metrics implementation

`GET /admin/listings/expiry/metrics` returns total non-deleted listing records, active non-deleted listings, active listings expiring within 15/7/1 days, overdue active listings, active listings with null expiry, and distinct listing IDs with renewal audit activity in the last 90 days. One bounded aggregate SQL query scans the listings table and reads the renewal audit aggregate. Date windows use PostgreSQL `CURRENT_TIMESTAMP`; upcoming windows exclude already-overdue dates and include the upper boundary.

Soft-deleted rows are excluded from the total and lifecycle metrics. “Overdue” means an ACTIVE listing whose expiry timestamp is in the past; it does not indicate an `EXPIRED` status.

## Preview API and UI

`GET /admin/listings/expiry/preview` supports `bucket`, `page`, `limit`, and `q` (title/public ID). Page size defaults to 20 and is capped at 50. Results are restricted to ACTIVE and non-deleted listings. Sorting is stable by expiry ascending then listing ID, with null expiry dates naturally last. A count query supplies total pages.

The preview shows title/public ID, a shortened owner ID reference, status, expiry date, days overdue, last renewal, and renewal eligibility. Days overdue is the number of calendar-day units rounded up, so any past expiry is shown as at least one day overdue. Renewal eligibility is informational and reflects the existing seller policy: ACTIVE, non-deleted, non-null expiry, within 15 days of expiry or overdue, and no successful renewal within the prior 90 days. The earliest availability date is shown in the API response; no action is offered from this panel.

Search, filters, pagination, loading/error/empty states, and mobile cards are part of the new panel. The pre-existing moderation listing and its actions remain below it unchanged. No public API was added.

## Performance and schema

- Preview rows are bounded to 50 and retrieved server-side; renewal history is fetched in one grouped query for only the current page's listing IDs (no N+1 reads).
- Metrics use one aggregate statement instead of deriving global figures from the existing 200-row listing response.
- Existing Prisma indexes cover status/published date and owner/status, but no expiry-oriented index exists in the inspected schema. The aggregate and filtered counts can therefore require table scans as the inventory grows. No index or migration was created. A partial index on `(expires_at, id)` for active, non-deleted listings is a possible future optimization, subject to query-plan review and separate approval.
- Offset pagination is deterministic but may become slower at deep pages. Cursor pagination can be considered if operational measurements justify it.
- No Prisma schema, migration, listing, search, reminder, promotion, or payment code was changed.

## Authorization

Both endpoints are on the existing guarded Admin Operations controller. Admin and moderator roles inherit the same access convention as the existing Admin Listings endpoints. No owner contact data is returned; the owner reference is a shortened user ID. Existing server-side guards remain the security boundary.

## Verification

- Focused Jest: `admin-listing-expiry.spec.ts` — **6 passed**. Covered aggregate metric mapping, 1/7-day window boundaries, overdue and null-expiry buckets, stable pagination, renewal aggregation/eligibility, and active/non-deleted filtering.
- API TypeScript: **passed** with `tsc --noEmit --incremental false`.
- Web TypeScript: **passed** with `tsc --noEmit --incremental false`.
- Focused ESLint across changed API and web files: **passed**.
- Existing `listing-contact-update.spec.ts` regression test was attempted but failed before test execution because Jest reported `TypeError: Reflect.getMetadata is not a function` while loading the existing DTO decorators. This is an environment/test-setup limitation, not an assertion failure.
- Initial TypeScript checks without `--incremental false` could not write the pre-existing locked `dist/tsconfig.tsbuildinfo` artifacts (EPERM). No artifacts were deleted or overwritten; checks passed with incremental output disabled.
- No production build or browser/runtime test was run. No database, Redis, Elasticsearch, notification, or production API was accessed.

## Files changed

- `apps/api/src/modules/admin-operations/admin-operations.controller.ts`
- `apps/api/src/modules/admin-operations/admin-operations.service.ts`
- `apps/api/src/modules/admin-operations/dto/admin-listing-expiry-query.dto.ts` (new)
- `apps/api/src/modules/admin-operations/admin-listing-expiry.spec.ts` (new)
- `apps/web/app/admin/listings/page.tsx`
- `apps/web/components/admin/admin-listing-expiry-panel.tsx` (new)
- `apps/web/lib/api/admin.ts`
- This acceptance report.

## Remaining risks and next phase

The expiry filter may need an index after production-scale query-plan review. Metrics are snapshots at request time and can change between requests. Renewal eligibility is informational and may change immediately after display; the existing renewal endpoint remains authoritative. The current implementation does not enforce expiry, change public visibility, generate reminders, or mutate any listing.

Recommended next step: have an authorized administrator verify the page against the approved API in a safe staging environment and review query plans before considering any index proposal. Any future expiry enforcement remains a separate owner-approved phase with explicit historical-listing policy.
