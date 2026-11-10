# GHARAZI-003E-03D2 — Expiry Enforcement Dry-Run Acceptance

## 1. Status

**COMPLETE — isolated implementation and verification.** This is a read-only simulation. No live database, API, Redis, Elasticsearch, notification provider, or production job was accessed. No listing, status, expiry, notification, or search data was changed.

## 2. Existing components reused

- The existing `/admin/listings` page and `AdminListingExpiryPanel` from 03C were extended; existing lifecycle metrics and ordinary expiry preview remain intact.
- Simulation uses the existing `AdminOperationsController` and `AdminOperationsService`, `PrismaService`, API client, React Query, and established admin `Card`, `Input`, `Select`, `Button`, and empty/error UI components.
- The route inherits the Admin Operations controller's JWT and `admin`/`moderator` role guards.
- Current listing expiry values reflect publication/renewal state; the simulation does not duplicate or call renewal logic.

## 3. Scenario definitions and boundary rules

All counts use the current database snapshot of listings that are `status='active'` and `deleted_at IS NULL`. The operator explicitly supplies a cutoff and evaluation timestamp; both are parsed to UTC instants. The cutoff is never inferred from deployment or process time. Evaluation may be before or after cutoff, allowing a future activation date to be simulated.

The historical cohort is defined consistently as `expires_at < cutoffAt` (strict). A listing expiring exactly at cutoff is post-cutoff. A listing is due at evaluation when `expires_at <= evaluatedAt` (inclusive). Only the current expiry value is considered: a renewal that moved expiry beyond evaluation removes the listing from the due cohort. Null expiry is excluded from candidates and reported separately.

| Scenario | Candidate rule at evaluation | Protected count | Additional projection |
|---|---|---|---|
| **A — Historical grandfathering** | Due by evaluation and expiry is on or after cutoff. | Current ACTIVE rows with expiry before cutoff remain protected. | None. |
| **B — 30-day historical grace** | Before `cutoffAt + 30 days`, only post-cutoff expiries due by evaluation are candidates. At or after the grace end, every ACTIVE expiry due by evaluation is a candidate. | Historical cohort remains protected until, but not including, grace end; it becomes eligible at the exact grace-end boundary. | Reports active rows due by the grace-end timestamp and projected ACTIVE inventory then. |
| **C — No grandfathering** | Every ACTIVE expiry due by evaluation is a candidate, including the historical cohort. | Zero grandfathered rows. | None. |

Scenarios are explicitly marked hypothetical and unapproved. The simulation uses the current ACTIVE/status and expiry snapshot; it does not forecast future listings, renewals, status changes, or seller actions. Scenario B's grace-end projection is likewise based on current records.

## 4. API implementation

Added guarded read-only endpoint:

`GET /admin/listings/expiry/simulation?scenario=A|B|C&cutoffAt=<ISO timestamp with zone>&evaluatedAt=<ISO timestamp with zone>&page=1&limit=20&q=<optional>`

Both timestamps are required and must include `Z` or an explicit UTC offset. Unsupported scenarios, malformed timestamps, or invalid page sizes are rejected by DTO validation. Page size is bounded to 50. Search is limited to title/public ID and affects the visible candidate page/count, not global impact metrics.

One parameterized aggregate query against `sch_gharazi.listings` calculates total ACTIVE, ACTIVE with expiry, due at evaluation, historical cohort, scenario candidates, grace-end candidates, and null-expiry exclusions. A separate bounded `findMany` and count provide stable pagination ordered by `(expires_at, id)`. No N+1 queries or writes are used.

Response includes candidate and protected counts, not-yet-due count, null-expiry excluded count, projected ACTIVE inventory after hypothetical candidates, evaluation/cutoff timestamps, scenario B grace-end projection, and the paginated candidate rows. `candidates` and projected inventory are global for the scenario; `matchingCandidates`/`total` represent the optional search-filtered preview.

## 5. Admin UI

The existing Admin Listings lifecycle panel now includes scenario selection and required local-time cutoff/evaluation inputs. The browser converts entered times to ISO UTC before the API request; response dates are displayed in the administrator's local timezone. No default timestamp is inserted.

The panel displays the warning **“DRY RUN — NO LISTINGS WILL BE CHANGED”**, scenario definition, selected timestamps, candidate/protected counts, projected impact, and a bounded candidate preview. It has responsive cards/table presentation and paginated controls. There are no expiry, bulk, notification, or status mutation actions.

## 6. Authorization, safeguards, and dependencies

- Simulation is only reachable through existing admin/moderator controller authorization; the frontend does not define the security boundary.
- Candidate selection excludes deleted, non-ACTIVE, and null-expiry listings.
- No notification, worker, queue, search-indexing, lifecycle transition, or mutation service is called.
- No environment variable or feature gate was added or changed. The existing promotion and reminder gates are untouched and independent of this simulation.
- Existing public Elasticsearch and PostgreSQL search code was not modified. The simulation has no effect on listing visibility or ranking.
- No migration or index was created.

## 7. Performance

Counts are server-side aggregates; result records are bounded to at most 50, and ordering has a unique listing-ID tie-breaker. No expiry index exists in the inspected schema. The aggregate and preview count may scan active rows; future query-plan review may justify a partial `(expires_at, id)` index for ACTIVE, non-deleted, non-null expiry rows. No index should be added without measured plans and separate approval. Offset pagination may slow at deep pages, though response size remains bounded.

## 8. Verification

- API TypeScript: passed (`tsc --noEmit --incremental false -p apps/api/tsconfig.app.json`).
- Web TypeScript: passed (`tsc --noEmit --incremental false -p apps/web/tsconfig.json`).
- Focused ESLint on changed API and web files: passed.
- Focused Jest: **15 tests passed across 2 suites** (`admin-expiry-simulation.spec.ts` and existing `admin-listing-expiry.spec.ts`). Coverage includes A/B/C, cutoff/grace boundaries, future cutoff evaluated earlier, role authorization, date validation, pagination, active/deleted/null rules, count mapping, and no listing mutation calls.
- No database integration, browser rendering, API runtime, worker, notification, queue, or search tests were run; no live services were used.

## 9. Files changed

- `apps/api/src/modules/admin-operations/admin-operations.controller.ts`
- `apps/api/src/modules/admin-operations/admin-operations.service.ts`
- `apps/api/src/modules/admin-operations/dto/admin-expiry-simulation-query.dto.ts` (new)
- `apps/api/src/modules/admin-operations/admin-expiry-simulation.spec.ts` (new)
- `apps/web/components/admin/admin-listing-expiry-panel.tsx`
- `apps/web/lib/api/admin.ts`
- This acceptance report.

## 10. Risks, limitations, and owner decisions

- Owner-supplied impact figures (ACTIVE 15,191; overdue 3,632; overdue over 30 days 993; due within 7/15/30 days 814/1,592/3,686; null expiry 0) are treated as a dated snapshot only. Simulation does not fetch or bake in these values.
- The preview shows current rows projected against the operator's evaluation timestamp. It cannot predict renewals, moderation/status changes, new listings, or changed expiry records between now and a future timestamp.
- Scenario A's grandfathering is indefinite by design; scenario B is based on 30 days after the selected cutoff; scenario C is comparison-only. None is approved for enforcement by this implementation.
- The owner must select a policy, confirm the activation cutoff/time zone, grace for future expiries, seller notice obligations, dry-run acceptance criteria, batch controls, and recovery/rollback approach before any enforcement implementation.
- `listingStatusHistory` and audit/outbox reliability for future system transitions still require a dedicated implementation review. Search-index side-effect recovery and seller restoration after EXPIRED status must be resolved before activation.

## 11. Recommended next phase

Review scenario counts using a freshly authorized read-only API/SQL snapshot. Then implement a separate dry-run processor and durable cohort/run evidence behind a new default-off enforcement gate, with no writes. Only a later explicitly approved phase may implement status transitions or enable enforcement.
