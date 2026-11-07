# GHARAZI-003A — Mobile UX Implementation

## 1. Initial mobile issues identified

The responsive review confirmed that the shared `GlobalSearchBar` rendered city, location, type, area, minimum price, maximum price, Search, and More filters controls at all viewport sizes. On small screens this pushed the result heading and listing grid below a large permanent form. At 1024px the controls also wrapped into several desktop-style rows because the outer desktop layout did not become horizontal until the `xl` breakpoint.

Additional issues found during code and rendered review:

- The mobile filter sheet exposed only the dynamic/advanced subset, so city, location, type, minimum price, and minimum area were not all editable from the sheet.
- The generic sheet was hidden at the `md` breakpoint even though mobile and admin menu triggers remained visible until `lg`.
- The sheet lacked Escape handling, focus containment/restoration, background-scroll locking, and safe-area padding.
- Search filter state was initialized from the URL only once. Browser back/forward could therefore change the URL without restoring the visible controls.
- Introductory search landing content appeared before results on mobile and tablet.
- Property cards used vertical space for several separate actions and showed an area chip even when the value was zero or absent.
- Project cards used a synthetic `Status pending` fallback and placed the starting price among secondary chips.
- The dashboard displayed its complete navigation as a tall vertical list before content on mobile.
- Mobile header users had to open the menu before reaching the Post Ad action.
- Listing lightbox and generic sheets did not provide complete modal keyboard/scroll behavior.
- Detail page typography, spacing, property fact layout, and contact navigation could be tightened for mobile.

## 2. Routes and components reviewed

### Public discovery and detail routes

- `/` — homepage search through `HeroSearch` and `GlobalSearchBar`
- `/buy`, `/rent` — `ListingSearchClient`
- `/buy/[propertyType]`, `/buy/[propertyType]/[city]`, `/rent/[city]`, `/area/[slug]` — category/location landing architecture and shared cards/search content
- `/projects`, `/projects/[city]` — `ProjectResultsClient`
- `/listing/[publicId]` — listing detail, gallery, facts, seller/contact action panel, similar content
- `/project/[slug]` — project detail, investment facts, developer/contact action panel, similar content
- `/favorites`, `/compare/listings`, `/compare/projects` — shared listing/project card and action behavior

### Account, supply, dashboard, and administration

- `/login`, `/register`, `/forgot-password`, `/reset-password` — authentication form layouts inspected; no authentication behavior changed
- `/dashboard` and dashboard children — `DashboardShell`, favorites, chats, notifications, inquiries, saved searches, listings, and projects
- `/dashboard/listings/new`, `/dashboard/listings/[id]/edit` — `ListingFormClient`
- `/dashboard/projects/new`, `/dashboard/projects/[id]/edit` — `ProjectFormClient`
- `/admin` and admin resource routes — `AdminShell`, mobile navigation sheet, and horizontally scrollable admin tables

## 3. Changes implemented

### Compact search and complete mobile filters

- Replaced the permanent multi-field search form below 1280px with:
  - buy/rent/projects tabs;
  - one compact keyword field;
  - Search action;
  - Filters action with active-filter count.
- Preserved the existing multi-field desktop search and inline advanced filters at `xl` and above.
- Added a reusable `MobileFilterPanel` containing the existing keyword, city, location, property/project type, price, area, bedroom, bathroom, furnishing, possession, legal, verified, corner, parking, and sort criteria as applicable.
- Added Apply and Clear actions in a sticky, safe-area-aware sheet footer.
- Reused the existing query serialization and API request construction; search semantics and backend contracts were not changed.
- Changed applied search navigation from `router.replace` to `router.push` and synchronized local/applied filters from `useSearchParams`, enabling back/forward restoration.
- Moved explanatory landing content below results on viewports below `xl`, while retaining the existing desktop content position and SEO content.
- Converted active-filter chips to a horizontally scrollable row on narrow screens.

### Accessible sheet and gallery interactions

- Removed the sheet breakpoint that made it invisible between 768px and 1023px.
- Added Escape-to-close, focus trapping, initial focus, focus restoration, body scroll locking, labelled dialog semantics, overscroll containment, and safe-area padding.
- Raised modal stacking so the filter sheet is not obscured by the cookie banner.
- Applied equivalent scroll locking, focus restoration, focus containment, Escape handling, and safe-area placement to the listing image lightbox.

### Property and project cards

- Reduced listing image height from 4:3 to 16:10 and tightened mobile card padding.
- Made listing and project prices the primary visual element.
- Added sale/rent and existing featured/hot indicators without changing promotion entitlements.
- Moved favorite actions to a 44px image-overlay control while preserving authentication and mutation behavior.
- Added property type and verified information only when supplied.
- Suppressed missing/zero area values instead of rendering misleading values such as `0 Marla`.
- Removed the synthetic project `Status pending` and payment-plan fallback from cards.
- Consolidated listing View/Inquire actions and reduced action-row height while retaining Compare, Favorite, detail navigation, and authenticated inquiry behavior.

### Navigation, detail pages, forms, and dashboards

- Reduced mobile header height and logo size and exposed a direct Post Ad action beside Menu.
- Reduced mobile footer padding and used a denser two-column link layout.
- Converted dashboard navigation to a horizontally scrollable, 44px-target tab row below `lg`; retained the sticky desktop sidebar.
- Corrected nested dashboard active-link matching.
- Improved mobile detail page spacing, responsive title size, two-column property fact layout, description wrapping, and missing-value rendering.
- Added mobile Contact seller / Request details actions that navigate to the existing inquiry panel; no new contact integration was introduced.
- Made the project starting price prominent near the title when supplied.
- Reduced mobile padding in listing/project forms and added visible focus treatment to primary description textareas.
- Increased admin navigation targets to at least 44px and added visible focus treatment. The fixed generic sheet also repairs admin menu behavior at tablet widths.

## 4. Files modified

Application source changes are limited to the frontend:

- `apps/web/app/(public)/listing/[publicId]/page.tsx`
- `apps/web/app/(public)/project/[slug]/page.tsx`
- `apps/web/components/admin/admin-shell.tsx`
- `apps/web/components/compare/compare-button.tsx`
- `apps/web/components/dashboard/dashboard-shell.tsx`
- `apps/web/components/favorites/favorite-button.tsx`
- `apps/web/components/forms/listing-form-client.tsx`
- `apps/web/components/forms/project-form-client.tsx`
- `apps/web/components/layout/public-footer.tsx`
- `apps/web/components/layout/public-header.tsx`
- `apps/web/components/listings/listing-action-panel.tsx`
- `apps/web/components/listings/listing-card.tsx`
- `apps/web/components/listings/listing-gallery.tsx`
- `apps/web/components/projects/project-action-panel.tsx`
- `apps/web/components/projects/project-card.tsx`
- `apps/web/components/search/filter-sidebar.tsx`
- `apps/web/components/search/global-search-bar.tsx`
- `apps/web/components/search/project-results-client.tsx`
- `apps/web/components/search/search-results-client.tsx`
- `apps/web/components/ui/sheet.tsx`
- `apps/web/components/ui/tabs.tsx`

The four pre-existing changed files identified by GHARAZI-001 were not modified for this implementation. No backend, database, authentication, API, payment, infrastructure, or deployment files were changed.

## 5. Responsive behavior before and after

| Viewport | Before | After |
|---|---|---|
| 320–430px | Full city/location/type/area/price form permanently occupied the initial viewport | Two compact search rows; full criteria are available on demand in the sheet; result heading and first result state appear immediately afterward |
| 768px | Large search form and incomplete mobile sheet behavior | Compact search, complete sheet, fixed tablet menu support, and early results |
| 1024px | Desktop fields wrapped into several rows and consumed substantial vertical space | Compact search remains active, with result summary and results shown earlier |
| 1440px | Existing desktop search | Full desktop search retained, with existing inline advanced filters |

No horizontal document overflow was detected at 320, 375, 390, 430, 768, 1024, or 1440px. The measured document widths were equal to the available layout viewport after accounting for the browser scrollbar.

## 6. Screenshots and visual evidence

Rendered local `/buy` evidence:

- [320px](screenshots/gharazi-003a/buy-320.png)
- [375px](screenshots/gharazi-003a/buy-375.png)
- [390px](screenshots/gharazi-003a/buy-390.png)
- [430px](screenshots/gharazi-003a/buy-430.png)
- [768px](screenshots/gharazi-003a/buy-768.png)
- [1024px](screenshots/gharazi-003a/buy-1024.png)
- [1440px](screenshots/gharazi-003a/buy-1440.png)
- [390px filter sheet](screenshots/gharazi-003a/buy-390-filters.png)

The screenshots were generated from the local Next.js development server. Depending on the individual run, the results region shows a loading skeleton or the existing error state because the sandbox could not reach the configured data API. The search layout, sheet, responsive breakpoints, and error/loading placement were visually inspected. Property cards and authenticated/dynamic detail pages were not claimed as visually verified because live listing data and authenticated sessions were unavailable locally.

## 7. Verification results

### Passed

- Frontend TypeScript: `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`
- Repository ESLint: `npm run lint`
- Next.js production build: `npm --prefix apps/web run build`
  - compiled successfully;
  - framework linting and type validation passed;
  - all 69 routes were generated;
  - build exited with code 0.
- Browser interaction through Chromium DevTools Protocol at 390px:
  - filter dialog opened;
  - Escape reduced open dialogs from 1 to 0;
  - keyword Apply produced `?q=lahore`;
  - Clear removed the query string;
  - browser Back restored both `?q=lahore` and the visible search value `lahore`.
- Horizontal overflow measurements passed at all seven requested viewport widths.
- `git diff --check -- apps/web` reported no whitespace errors in the implementation files.

### Warnings and limitations

- Static generation logged `fetch failed` / `EACCES` for external data calls in the restricted environment. The application already catches these calls and the build completed successfully.
- Browserslist reported that its local `caniuse-lite` data is seven months old. Dependencies were not updated because this batch forbids installations/upgrades.
- The repository has no configured frontend unit or end-to-end test command. Focused behavior was therefore exercised through the local rendered application and Chromium DevTools Protocol.

## 8. Remaining mobile issues

- Live-data property/project card layouts still require a visual QA pass with representative long titles, Urdu/English content, missing media, featured inventory, and real promotion combinations.
- At 320px the compact field intentionally yields width to two 44px actions, so its placeholder is partially truncated; entered text remains usable. An icon-only Search control could be evaluated later if user testing supports it.
- The cookie consent banner remains dense on the narrowest screens. It no longer covers modal controls, but its own composition warrants a separate accessibility/usability pass.
- Deep Post Ad image management, reordering, validation summaries, and multi-step recovery need authenticated mobile testing.
- Dashboard and admin data tables need representative production-like datasets to verify long values and action density.
- Dynamic listing/project detail pages could not be rendered locally without accessible API data, so the detail improvements are code/build verified rather than visually verified.
- Existing map placeholders, live map integration, WhatsApp changes, and recommendation behavior are outside this batch.

## 9. Recommended next improvements

1. Run authenticated device testing against a safe staging API with representative listings, projects, favorites, inquiries, and seller roles.
2. Add Playwright coverage for filter open/close, Apply/Clear, history restoration, mobile menu, card navigation, favorite authentication redirect, and horizontal overflow at the defined viewport matrix.
3. Continue GHARAZI-003B for explicitly reserved contact/WhatsApp and recommendation work.
4. Continue GHARAZI-003C with a focused Post Ad usability pass covering image uploads, step persistence, validation navigation, and draft recovery.
5. Continue GHARAZI-003D with dashboard/admin mobile tables, bulk actions, and information-density review.
6. Review the cookie banner and 320px compact search labels with real-device usability testing before considering further space-saving controls.

## 10. Known limitations and regression risks

- Moving search landing content below results on viewports under 1280px changes visual order but not the content, routes, metadata, or search query semantics.
- `router.push` intentionally creates filter history entries. This improves browser Back/Forward behavior but can produce more history entries for users who repeatedly apply filters.
- The shared sheet now applies modal behavior to public navigation and admin navigation as well as search filters. These paths passed compilation and the mobile filter interaction test; authenticated admin navigation still requires a staging-session test.
- Compact favorite controls preserve the same API calls and login redirect behavior, but live favorite mutations were not exercised without an authenticated API session.
- The implementation preserves existing promotion fields and labels; entitlement correctness remains dependent on the existing backend response.
- No deployment, commit, push, production-data access, environment change, or infrastructure change was performed.
