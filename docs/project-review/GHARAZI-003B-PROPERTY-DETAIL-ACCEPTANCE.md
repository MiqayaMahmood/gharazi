# GHARAZI-003B — Property Detail Acceptance

Date: 2026-11-08  
Implementation status: COMPLETE for the approved frontend/API scope, with authenticated staging verification and external mock-image loading limitations documented below.

## 1. GHARAZI-003A regression checkpoint

The GHARAZI-003A implementation report and affected search, filter, listing-card, navigation, favorite, comparison, and project components were reviewed before this batch.

No critical GHARAZI-003A regression was found. The checkpoint covered:

- Mobile `/buy` search and filter sheet at 390px: the sheet opened, closed with Escape, reopened, and Clear returned the URL to `/buy`.
- Search-state routing exercised before this batch: listing-card navigation reached `/listing/HG-LHE-1001`; Buy/Rent/Projects navigation reached `/buy`, `/rent`, and `/projects` without changing route contracts.
- Listing favorite behavior while signed out still redirected to `/login?returnTo=%2Fbuy`.
- Listing comparison still populated the existing comparison state/tray.
- Project-card navigation still reached `/project/green-view-residences-lahore`.
- Current detail rendering and the GHARAZI-003B contact area were checked at 320, 375, 390, 430, 768, 1024, and 1440px. No horizontal overflow or contact/cookie-notice overlap was detected.
- The gallery dialog opened from its existing trigger and closed with Escape.
- Desktop public navigation and the desktop detail/contact column were preserved.

The normal local API could not supply representative detail data in the sandbox. Responsive rendering used the repository's existing mock-fallback mode against an intentionally unreachable local API URL. No production records were accessed. No staging URL, authenticated test account, or test credentials were available, so authenticated browser workflows were not claimed as verified.

## 2. Existing functionality reviewed

- Public listing detail route: `/listing/[publicId]`.
- Listing gallery and keyboard-controlled lightbox.
- Existing protected listing-contact query: `GET /listings/:id/contact`.
- Existing Send Inquiry form/mutation and chat-start behavior.
- Existing listing favorite and comparison actions.
- Existing similar-listing request: `/search/listings/:id/similar`.
- Existing listing cards, location links, breadcrumbs, legal disclaimers, nearby projects, and related guides.
- Existing sale, rent, project, favorites, inquiry, and comparison navigation used by the GHARAZI-003A flows.

SEO metadata generation, canonical routing, structured data, authentication, listing publication rules, search ranking, payments, subscriptions, schemas, migrations, and deployment configuration were not changed.

## 3. Enhancements implemented

### Property detail hierarchy

- Kept the gallery first, followed by verification/promotion state, title, prominent price, location, contact action, area/type summary, and favorite/compare actions.
- Reused `coverImageUrl` as the gallery image when the API supplies a cover but no `images` array. The existing image URL is used; no substitute data is invented.
- Added an image count to the gallery and changed mobile thumbnails to a horizontally scrollable snap row while retaining the desktop grid.
- Standardized area formatting across detail facts and listing cards.
- Rendered only property facts that exist instead of showing misleading dash placeholders. Supported facts include beds, baths, area, type, furnishing, possession, and floor.
- Improved description wrapping/readability and made the seller card resilient when a lister name is absent.
- Added mobile favorite access beside the existing compare action while preserving the desktop action panel.

### Mobile contact presentation

- Added a compact, non-sticky mobile contact area below price/location.
- Always exposes the existing Send Inquiry anchor.
- Shows Call and WhatsApp only after an authenticated user receives eligible contact data from the existing protected contact endpoint.
- Preserves the existing desktop inquiry/contact panel.
- Uses 44px-minimum accessible action targets and descriptive labels.

## 4. WhatsApp eligibility and privacy behavior

WhatsApp support already existed in the backend contact response and desktop inquiry panel. This batch hardened and completed that implementation rather than adding a duplicate contact system.

Eligibility rules now are:

1. The visitor must pass the existing authentication requirement for `GET /listings/:id/contact`.
2. The listing must contain an explicitly stored `contactWhatsapp` value. A general `contactPhone` is no longer treated as implied WhatsApp consent.
3. The number must normalize to a valid Pakistan number (`92` plus 9 or 10 national digits). Supported inputs include `+92`, `0092`, `03...`, and national digits without a prefix.
4. The frontend accepts only an HTTPS `wa.me` URL containing a valid normalized Pakistan number.
5. The link opens externally with `noopener noreferrer` and a property-specific, URL-encoded draft message. It never sends automatically.

Call remains based on the authorized contact phone, and Send Inquiry still uses the pre-existing mutation. Opening WhatsApp does not create an inquiry or contact record.

The data model has a distinct `contactWhatsapp` field but no separately discoverable consent timestamp/policy flag, and the current seller listing form does not expose a WhatsApp opt-in editor. Therefore explicit field population is treated as the narrowest available eligibility signal. Seller-facing consent management is deferred; no privacy rule was guessed or broadened.

## 5. Similar-property matching and visibility

Similar properties were already supported by the existing API/search layer. No endpoint, query contract, recommendation engine, database structure, or ranking rule was added.

The existing behavior is retained:

- Elasticsearch path: active listings, same purpose and city, comparable price/area bands, property-type/area relevance boosts, and current-listing exclusion.
- Database fallback: `status = active`, `deletedAt = null`, same purpose/city, comparable price, preferred type/area, then a controlled relaxation; promoted/hot and recent inventory retain the existing ordering.

The detail page now additionally deduplicates results, excludes the current listing by both internal ID and public ID, preserves API ordering/promotion entitlements, limits display to three cards, and shows the existing empty state when no eligible results are returned. It continues to make one similar-listing request and reuses the GHARAZI-003A listing card.

Search-index lifecycle correctness remains an operational dependency. The explicit database fallback enforces active/not-deleted visibility, but production index freshness was not verified in this task.

## 6. Files modified

### API

- `apps/api/src/modules/listings/listings.service.ts`
- `apps/api/src/modules/listings/listings.service.spec.ts`
- `apps/api/src/modules/listings/whatsapp.ts` (new)
- `apps/api/src/modules/listings/whatsapp.spec.ts` (new)

### Web

- `apps/web/app/(public)/listing/[publicId]/page.tsx`
- `apps/web/components/inquiries/inquiry-panel.tsx`
- `apps/web/components/listings/contact-action-link.tsx` (new)
- `apps/web/components/listings/mobile-listing-contact-actions.tsx` (new)
- `apps/web/components/listings/listing-action-panel.tsx`
- `apps/web/components/listings/listing-card.tsx`
- `apps/web/components/listings/listing-gallery.tsx`
- `apps/web/lib/contact/contact-links.ts` (new)
- `apps/web/lib/contact/contact-links.spec.ts` (new)
- `apps/web/lib/utils.ts`
- `apps/web/lib/utils.spec.ts` (new)

### Documentation/evidence

- `docs/project-review/GHARAZI-003B-PROPERTY-DETAIL-ACCEPTANCE.md`
- `docs/project-review/screenshots/gharazi-003b/`

No database, migration, environment, infrastructure, authentication, payment, subscription, or search-ranking files were changed.

## 7. Tests and verification evidence

| Check | Result |
|---|---|
| Frontend TypeScript (`tsc --noEmit --incremental false -p apps/web/tsconfig.json`) | PASS |
| API TypeScript (`tsc --noEmit --incremental false -p apps/api/tsconfig.app.json`) | PASS |
| Root ESLint (`npm run lint`) | PASS, zero warnings |
| Focused Jest tests | PASS, 4 suites / 38 tests |
| Next.js production build | PASS, 69/69 static pages generated; `/listing/[publicId]` built successfully |
| Responsive widths | PASS at 320, 375, 390, 430, 768, 1024, and 1440px; no horizontal overflow |
| Contact/cookie overlap | PASS at all seven widths |
| Gallery keyboard behavior | PASS: opened as a modal and closed with Escape |
| Filter sheet regression | PASS: open, Escape close, reopen, and Clear behavior |

The build logged expected sandbox `fetch failed / EACCES` messages while trying to reach unavailable external services, but completed successfully with exit code 0. The same network restriction prevented Next.js image optimization from fetching the external Unsplash mock image at some desktop/tablet sizes. Mobile cached captures and the DOM interaction checks verified the gallery component; external asset delivery itself was not treated as production evidence.

Focused tests cover valid Pakistan formats, missing/invalid/non-Pakistan numbers, `wa.me` construction, rejection of unsafe/unexpected WhatsApp URLs, property-specific draft text, area formatting, and the rule that a general phone alone must not enable WhatsApp.

## 8. Screenshots

Representative post-change captures:

- [320px listing](screenshots/gharazi-003b/listing-320.png)
- [390px listing](screenshots/gharazi-003b/listing-390.png)
- [430px listing](screenshots/gharazi-003b/listing-430.png)
- [768px listing](screenshots/gharazi-003b/listing-768.png)
- [1024px listing](screenshots/gharazi-003b/listing-1024.png)
- [1440px listing](screenshots/gharazi-003b/listing-1440.png)
- [390px property results](screenshots/gharazi-003b/buy-390.png)
- [1440px property results](screenshots/gharazi-003b/buy-1440.png)

These are local mock-fallback captures, not production screenshots. The 1440px listing capture includes the documented sandbox-blocked external mock image rather than a successful optimized image response.

## 9. Deferred work and limitations

- Authenticated browser verification of Call, WhatsApp, favorite, inquiry submission, and comparison persistence requires a non-production staging account and representative staging inventory.
- Seller-facing WhatsApp opt-in/withdrawal is not present in the reviewed listing form/API DTO. Adding it requires an owner-approved privacy/product decision and is not activated implicitly here.
- Staging API visibility and search-index freshness were not available for runtime verification.
- The local sandbox could not fetch the externally hosted mock image consistently at tablet/desktop optimizer sizes.
- No Playwright test package is installed. Browser acceptance used the installed Chromium headless shell through DevTools; no dependency was added.
- Back/forward query restoration was already part of the GHARAZI-003A implementation evidence and the underlying routing code was not changed in this batch; it was not re-exercised with authenticated data.

## 10. Remaining regression risks

- The authenticated contact actions depend on the existing `/listings/:id/contact` response and session availability; staging should verify real seller privacy combinations before release.
- Historical rows may contain `contactWhatsapp` without a documented consent provenance. Product/legal ownership should confirm whether explicit field presence is sufficient for legacy data.
- Similar-property correctness depends on Elasticsearch index eligibility matching database publication state. Operational monitoring/reconciliation remains recommended.
- Extremely long localized titles, lister names, and custom area-unit strings should be included in later visual regression fixtures.

Recommended next step for GHARAZI-003C: improve the Post Ad and seller-dashboard mobile workflows, including a product-approved WhatsApp consent control, without changing publication or payment behavior. Add authenticated staging fixtures and focused browser tests for contact privacy, inquiry submission, favorite/compare persistence, and seller listing management.
