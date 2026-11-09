# GHARAZI-FIX-003B — Search Runtime Acceptance

Date: 2026-11-09  
Implementation status: COMPLETE  
Runtime API status: UNVERIFIED — no safe staging API was available and no production connection was opened.

## Root cause

The frontend sends lowercase URL values such as `house`, while the owner-confirmed production taxonomy stores canonical codes such as `HOUSE`.

Before this correction:

- PostgreSQL fallback exact-code searches used a case-sensitive property-type `code` predicate.
- Elasticsearch exact-code searches applied the lowercase input directly to the case-sensitive `propertyTypeCode` keyword field.

Consequently, lowercase URLs could miss valid uppercase taxonomy records. Residential, Commercial, and Plot were already resolved through category/name classification and were not affected by this exact-code mismatch.

## Corrected implementation

The listing property-type resolver now:

1. trims and lowercases incoming `propertyTypeCode` values;
2. preserves the special rules for Residential, Commercial, and Plot;
3. resolves every other code using case-insensitive canonical-code equality in PostgreSQL;
4. uses the resolved property-type IDs in the Elasticsearch `propertyTypeId` filter.

The search DTO also normalizes uppercase query input, so `HOUSE`, `House`, and `house` behave consistently.

No unrestricted name matching was added. Exact aliases remain exact canonical-code lookups.

## Matching rules

| Input | PostgreSQL taxonomy rule | Elasticsearch rule |
|---|---|---|
| `house` / `HOUSE` | `code = 'house'`, case-insensitive | resolved canonical property-type IDs |
| `apartment` / `APARTMENT` | `code = 'apartment'`, case-insensitive | resolved canonical property-type IDs |
| `office` / `OFFICE` | `code = 'office'`, case-insensitive | resolved canonical property-type IDs |
| `shop` / `SHOP` | `code = 'shop'`, case-insensitive | resolved canonical property-type IDs |
| `warehouse` / `WAREHOUSE` | `code = 'warehouse'`, case-insensitive; zero matches when absent | impossible filter when no canonical ID exists |
| `residential` | category equals residential, case-insensitive | IDs resolved from the same category rule |
| `commercial` | category equals commercial, case-insensitive | IDs resolved from the same category rule |
| `plot` | name contains plot, case-insensitive | IDs resolved from the same name rule |
| unknown code | exact case-insensitive code lookup; zero matches | impossible filter when no canonical ID exists |

## Owner-confirmed database evidence

| Canonical code | Name | Category | Total | Active | Eligible sale count | Result |
|---|---|---|---:|---:|---:|---|
| `HOUSE` | House | residential | 5,991 | 5,587 | Not supplied | DATABASE CONFIRMED |
| `APARTMENT` | Apartment | residential | 2,047 | 1,938 | Not supplied | DATABASE CONFIRMED |
| `OFFICE` | Office | commercial | 532 | 500 | Not supplied | DATABASE CONFIRMED |
| `SHOP` | Shop | commercial | 855 | 809 | Not supplied | DATABASE CONFIRMED |
| — | Warehouse | — | 0 confirmed | 0 confirmed | Not supplied | TAXONOMY NOT FOUND |

Active totals are not equivalent to eligible `/buy` totals. `/buy` additionally requires the existing sale-purpose filter and all other visibility/location/attribute filters supplied by the request.

## Warehouse findings

- The owner’s production query returned no Warehouse taxonomy record.
- Repository seed data defines a `warehouse`/Warehouse type, but seed intent is not evidence that the production record exists.
- Repository searches found no alternate canonical `godown`, storage, or equivalent property-type definition.
- No Warehouse record or alias was created. Current production acceptance result: **TAXONOMY NOT FOUND**.

## Preserved search behavior

- `/buy` continues to map to purpose `sale`; rent remains separate.
- Elasticsearch retains `status = active`.
- PostgreSQL fallback retains `status = active` and `deletedAt = null`.
- Location, price, area, verification, sorting, pagination, response structure, and ranking remain unchanged.
- Residential, Commercial, and Plot classification behavior remains unchanged.
- Missing and unknown taxonomy codes return zero eligible results rather than fabricated listings.

## Files modified

- `apps/api/src/modules/search/search.service.ts`
- `apps/api/src/modules/search/dto/search-listings-query.dto.ts`
- `apps/api/src/modules/search/search.service.spec.ts`
- `apps/api/src/modules/search/search-query.dto.spec.ts`
- `docs/project-review/GHARAZI-FIX-003B-SEARCH-RUNTIME-ACCEPTANCE.md`

## Tests and verification

- Focused SearchService and DTO tests: PASS, 34/34.
- API TypeScript: PASS.
- ESLint: PASS, zero warnings.
- Test coverage confirms lowercase/uppercase House, Apartment, Office, Shop, canonical codes, absent Warehouse, unknown codes, Residential, Commercial, Plot, buy/rent separation, visibility constraints, counts, sorting, pagination, and Elasticsearch/PostgreSQL consistency.

## Runtime limitations

No safe staging API endpoint was provided. The local environment may reference hosted infrastructure, so it was not used for record-level runtime requests. Actual API result counts for House, Apartment, Office, and Shop therefore remain **UNVERIFIED**, rather than being inferred from mocked tests or active database totals.
