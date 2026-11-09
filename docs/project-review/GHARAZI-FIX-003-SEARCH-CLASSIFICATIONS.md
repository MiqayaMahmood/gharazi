# GHARAZI-FIX-003 — Search Classifications

Date: 2026-11-08  
Status: COMPLETE

## 1. Actual property type taxonomy

Prisma maps `PropertyType` to `property_types`, with canonical `code`, `name`, `category`, `slug`, and `isActive` fields. `Listing.propertyTypeId` maps to `listings.property_type_id` and relates to `PropertyType.id`. The configured PostgreSQL connection selects `sch_gharazi`.

Repository seed taxonomy:

| Code | Name | Category |
|---|---|---|
| `house` | House | residential |
| `apartment` | Apartment | residential |
| `upper_portion` | Upper Portion | residential |
| `lower_portion` | Lower Portion | residential |
| `residential_plot` | Residential Plot | plot |
| `commercial_plot` | Commercial Plot | plot |
| `office` | Office | commercial |
| `shop` | Shop | commercial |
| `warehouse` | Warehouse | commercial |

No production taxonomy or listing records were queried in this task. The table above is repository evidence; owner-confirmed production structure remains authoritative.

## 2. URL-to-database mappings

| URL parameter | Matching rule |
|---|---|
| `house` | exact `property_types.code = 'house'` |
| `apartment` | exact `property_types.code = 'apartment'` |
| `office` | exact `property_types.code = 'office'` |
| `shop` | exact `property_types.code = 'shop'` |
| `warehouse` | exact `property_types.code = 'warehouse'` |
| `residential` | case-insensitive `property_types.category = 'residential'` |
| `commercial` | case-insensitive `property_types.category = 'commercial'` |
| `plot` | case-insensitive `property_types.name contains 'plot'` |
| any other valid code | exact `property_types.code = value` |

## 3. Confirmed defects

- GHARAZI-FIX-001 corrected `commercial` and `plot`, which had been interpreted as exact codes.
- GHARAZI-FIX-003 confirmed the same mismatch for `residential`: it was treated as an exact code even though the requested URL represents a category.
- House, apartment, office, shop, and warehouse already correspond to canonical stored codes and required no mapping change.

## 4. Correction implemented

`propertyTypeCode=residential` now resolves property types using the case-insensitive residential category. Commercial and Plot behavior from FIX-001 is preserved. All other values retain exact-code matching; no fuzzy global matching was introduced.

## 5. Prisma and Elasticsearch behavior

Frontend flow:

1. `/buy` reads `propertyTypeCode` into the existing filter value.
2. The API request sends it as `propertyTypeCode` unless the value is a UUID.
3. `GET /search/listings` validates it as a code-shaped query value.

PostgreSQL fallback uses the relation predicates in the table above. It retains `status = active`, `deletedAt = null`, `/buy` purpose code `sale`, location, price, area, verification, sorting, skip/take pagination, and the existing response contract.

For Residential, Commercial, and Plot, Elasticsearch first resolves matching property-type IDs through Prisma, then filters the existing `propertyTypeId` keyword field with those IDs. This makes Elasticsearch classification equivalent to PostgreSQL without changing mappings or requiring a production reindex. Other codes continue to use the existing exact `propertyTypeCode` term filter.

Elasticsearch retains `status = active` and purpose/location/attribute filters. PostgreSQL additionally enforces `deletedAt = null`; Elasticsearch deletion visibility continues to rely on the existing index lifecycle. No ranking or promotion behavior changed.

## 6. Files modified

- `apps/api/src/modules/search/search.service.ts`
- `apps/api/src/modules/search/search.service.spec.ts`
- `docs/project-review/GHARAZI-FIX-003-SEARCH-CLASSIFICATIONS.md`

No GUI, schema, migration, data, deployment, or index mapping file was changed.

## 7. Tests and results

- Focused SearchService and DTO Jest: PASS, 32/32.
- API TypeScript: PASS.
- ESLint: PASS, zero warnings.
- NestJS API and worker build: PASS.
- Tests cover all eight requested aliases; canonical portion/plot codes; an unknown code; buy/rent separation; active/deleted visibility; city plus classification; result count; PostgreSQL skip/take; Elasticsearch from/size; requested sorting; and PostgreSQL/Elasticsearch equivalence.

## 8. Remaining limitations

- Eligible production listing counts were not queried and remain unverified. Zero results remain valid when no active, visible listing satisfies all filters.
- The supplied owner SQL established classification matches but did not include sale-purpose, active-status, or deleted visibility predicates.
- Elasticsearch does not store property category, so special category/name aliases require one small taxonomy lookup before the Elasticsearch request. Existing exact-code searches do not incur that lookup.
