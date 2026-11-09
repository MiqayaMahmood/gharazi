# GHARAZI-FIX-004 — Buy/Rent Search Acceptance

Date: 2026-11-09  
Implementation status: COMPLETE  
Runtime API status: UNVERIFIED — no safe staging endpoint or isolated test database was available.

## Confirmed database mapping

The Prisma schema correctly represents the owner-confirmed database structure:

- `Listing` maps to `listings` through `@@map("listings")`.
- `ListingPurpose` maps to the plural table `listing_purposes` through `@@map("listing_purposes")`.
- `Listing.purposeId` maps to `purpose_id` and relates to `ListingPurpose.id`.
- `Listing.propertyTypeId` maps to `property_type_id` and relates to `PropertyType.id`.
- The configured Prisma connection selects PostgreSQL schema `sch_gharazi` through the `DATABASE_URL` schema parameter. No credential value was recorded in this report.

Therefore the effective tables are `sch_gharazi.listings`, `sch_gharazi.listing_purposes`, and `sch_gharazi.property_types`.

## Request flow

1. The Next.js search client receives route purpose `buy` or `rent`.
2. It sends `purposeSlug=sale` for `/buy` and `purposeSlug=rent` for `/rent`.
3. `SearchController` validates the request with `SearchListingsQueryDto` and passes it to `SearchService`.
4. `SearchService.listingPurposeSlug()` also normalizes accepted buy/sale variants to `sale` and rent variants to `rent`.
5. Elasticsearch filters the indexed `purposeSlug` keyword.
6. PostgreSQL fallback now filters the related `ListingPurpose.slug` using the same normalized value.

The worker builds each Elasticsearch listing document from `listing.purpose.slug`, so index production and query filtering use the same purpose field.

## Confirmed defect and correction

Before this correction, Elasticsearch used `purposeSlug`, but the PostgreSQL fallback filtered `purpose.code`. The authoritative route contract is based on `listing_purposes.slug`, so the two search paths were not enforcing the same database attribute. Even if a deployment happened to store identical code and slug values, that equality was not guaranteed by the schema or route contract.

The fallback predicate was changed only from:

```text
purpose.code = normalized purpose
```

to:

```text
purpose.slug = normalized purpose
```

No search ranking, response contract, database data, migration, or GUI behavior changed.

## Purpose and property-type behavior

| Route/query | Elasticsearch | PostgreSQL fallback | Result |
|---|---|---|---|
| `/buy` | `purposeSlug = sale` | related purpose `slug = sale` | PASS |
| `/rent` | `purposeSlug = rent` | related purpose `slug = rent` | PASS |
| `house`, `apartment`, `office`, `shop` | IDs resolved by case-insensitive canonical-code equality | case-insensitive canonical-code equality | PASS |
| `residential` | IDs resolved by category `residential` | category `residential` | PASS |
| `commercial` | IDs resolved by category `commercial` | category `commercial` | PASS |
| `plot` | IDs resolved by case-insensitive name containing `plot` | same name classification | PASS |
| unknown/absent code | impossible ID filter | exact code predicate returning no matches | PASS |

Uppercase production codes such as `HOUSE`, `APARTMENT`, `OFFICE`, and `SHOP` remain supported through case-insensitive exact-code resolution. No fuzzy code/name search was introduced.

## Eligibility and preserved behavior

Both paths continue to combine purpose and property classification with the existing restrictions rather than replacing them:

- Elasticsearch retains `status = active`.
- PostgreSQL fallback retains `status = active` and `deletedAt = null`.
- Purpose and property type remain independent conjunctive filters.
- City, area, price, size, bedrooms, bathrooms, furnishing, verification, sorting, pagination, promotion behavior, and response shape are unchanged.
- Existing result counts are calculated from the same PostgreSQL `where` predicate used to fetch the page.

The owner-confirmed SQL proves that Sale and Rent records exist across multiple property types. It does not establish API-eligible counts after all visibility and request filters, so no runtime counts are claimed here.

## Files modified for GHARAZI-FIX-004

- `apps/api/src/modules/search/search.service.ts`
- `apps/api/src/modules/search/search.service.spec.ts`
- `docs/project-review/GHARAZI-FIX-004-BUY-RENT-SEARCH.md`

Other working-tree changes predated this correction and were preserved.

## Verification results

| Check | Result |
|---|---|
| Focused SearchService Jest suite | PASS — 31/31 |
| SearchService plus query DTO Jest suites | PASS — 36/36 |
| Buy → Sale Elasticsearch assertion | PASS |
| Rent → Rent Elasticsearch assertion | PASS |
| Buy → Sale PostgreSQL fallback assertion | PASS |
| Rent → Rent PostgreSQL fallback assertion | PASS |
| Purpose plus property-type conjunction | PASS |
| Visibility, count, sorting, and pagination assertions | PASS |
| API TypeScript (`tsc --noEmit --incremental false`) | PASS |
| Worker TypeScript (`tsc --noEmit --incremental false`) | PASS |
| Focused ESLint | PASS — zero warnings |
| Nest API and worker production build | PASS |
| Live/staging API result verification | UNVERIFIED — no safe endpoint supplied |

The initial TypeScript commands attempted to write incremental metadata and were blocked by generated-directory permissions; rerunning with incremental output disabled passed. The production build then passed with permission to refresh generated `dist` output.

## Remaining limitation

Actual `/buy` and `/rent` eligible result counts remain unverified at runtime. A future acceptance check should use a safe staging API and compare representative Sale/Rent searches against read-only database queries that include the same active, deletion, and other visibility rules. Production records were not accessed or modified during this task.
