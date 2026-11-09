# GHARAZI-003D — Dashboard Acceptance

Date: 2026-11-09  
Status: COMPLETE for the approved frontend scope; authenticated production/staging mutations were not exercised.

## 1. Baseline findings

- The seller dashboard already exposed listings, projects, inquiries, chats, notifications, favorites, saved searches, promotion purchases, and existing listing lifecycle actions.
- GHARAZI-003C had already prioritized Edit, Preview, Leads, and Messages and moved promotion/lifecycle actions into a compact disclosure.
- Listing status values are supplied by the existing API. The frontend had no useful status summary/filter and rendered all listings as one long card list.
- Inquiry responses already include related listing, project, and chat records, but the frontend type and UI did not use their titles or navigation targets.
- Notifications include supported entity identifiers in `payloadJson`, but only chat notifications exposed navigation and that link did not select the relevant conversation.
- The chat inbox stacked the full conversation list above the thread on mobile and ignored a requested chat identifier.
- Admin tables used horizontal scrolling at all widths.
- No recently viewed implementation or consent-state API exists in the reviewed frontend.
- Inquiry records expose individual status/response fields, but no reliable aggregate seller-response metric is supplied.

No critical regression was found in the reviewed 003A–003C work. Existing dirty-worktree changes were preserved.

## 2. Seller dashboard changes

- Reordered dashboard navigation around common seller tasks: listings, projects, inquiries, chats, and notifications now appear first after Overview.
- Added a compact mobile Post property action in the dashboard account/navigation header.
- Kept every existing dashboard route and professional/account section.
- Replaced the temporary “Dashboard shell” heading with “Dashboard” and standardized mobile-first page heading sizes.
- Preserved the desktop sticky sidebar and the existing horizontally scrollable mobile navigation.

## 3. Listing management improvements

- Added a horizontally scrollable, keyboard-accessible status filter generated only from statuses present in the API response.
- Added counts for All and each returned status without defining new status values or transitions.
- Preserved Edit, Preview, View leads, Messages, promotion purchases, Refresh, Mark sold, Mark rented, and Archive behavior.
- Kept status and verification as separate values.
- Added an explicit filtered-empty state and accessible error announcement.

## 4. Inquiry and lead presentation

- Inquiry cards now show the related property/project title when supplied by the existing response.
- Messages wrap cleanly and timestamps are placed consistently for narrow screens.
- Status and inquiry type labels are converted to readable presentation text without changing their values.
- Existing listing/project relations provide direct View property/View project links.
- Existing chat relations provide an Open conversation link with the specific chat identifier.
- Notification inquiry links can filter the existing inquiry view to one inquiry, with a View all inquiries escape path.
- Buyer contact data was not added because the existing inquiry response does not include authorized buyer contact fields. Privacy boundaries remain unchanged.

## 5. Recently viewed status

DEFERRED. No existing recently viewed feature or reusable consent-state contract was found. Adding local persistence without a reliable applicable-consent signal could violate the stated requirement not to persist history before consent. No tracking library, local-storage history, endpoint, or database entity was introduced.

Required future dependency: an owner-approved consent-state API/component that distinguishes necessary storage from optional browsing-history storage, plus an availability revalidation strategy for stored listing identifiers.

## 6. Seller response indicator status

DEFERRED. The current data can show whether an individual inquiry has a response status, but it does not provide a statistically reliable seller response-time/activity metric. No response speed, percentage, or performance claim was inferred.

Required future dependency: an authorized backend-provided aggregate with sample size, time window, and eligibility rules.

## 7. Notification and chat improvements

- Added centralized, tested destination resolution for existing chat, inquiry, listing, project, professional-profile, and verification payload identifiers.
- Unsupported or malformed payloads intentionally receive no invented destination.
- Added unread count, stronger unread presentation, pending labels, and mutation disabling.
- Notification View update links now open the relevant existing dashboard destination.
- Chat deep links select the requested existing conversation.
- Limited the mobile conversation-list height so the active thread appears sooner.
- Added pressed state, visible focus behavior, wrapping for long context identifiers, a labelled message input, send-pending text, and safe-area-aware composer spacing.

Notification delivery, polling, queues, email behavior, and database state were not changed.

## 8. Favorites and admin responsive improvements

- Contained the existing favorites tabs in a horizontal mobile scroller without modifying the shared Tabs component used by public search.
- Added a mobile card representation for all shared admin resource tables below 768px.
- Retained the existing desktop table and horizontal overflow fallback at wider widths.
- Added wrapping for long table/card values, labelled field/value pairs, and a dedicated action area.
- Tightened the admin header and added expanded/control relationships to the existing mobile menu.
- Admin permissions, moderation actions, API calls, and resource definitions are unchanged.

Substantial admin workflow redesign and dense specialist views remain outside this batch.

## 9. Files modified

### Dashboard pages

- `apps/web/app/(dashboard)/dashboard/page.tsx`
- `apps/web/app/(dashboard)/dashboard/chats/page.tsx`
- `apps/web/app/(dashboard)/dashboard/favorites/page.tsx`
- `apps/web/app/(dashboard)/dashboard/inquiries/page.tsx`
- `apps/web/app/(dashboard)/dashboard/notifications/page.tsx`

### Components and types

- `apps/web/components/dashboard/dashboard-shell.tsx`
- `apps/web/components/dashboard/supply-list-client.tsx`
- `apps/web/components/inquiries/inquiries-client.tsx`
- `apps/web/components/notifications/notifications-client.tsx`
- `apps/web/components/chat/chat-inbox-client.tsx`
- `apps/web/components/favorites/favorites-client.tsx`
- `apps/web/components/admin/admin-primitives.tsx`
- `apps/web/components/admin/admin-shell.tsx`
- `apps/web/types/engagement.ts`

### Focused utility and test

- `apps/web/lib/notifications/notification-destination.ts` (new)
- `apps/web/lib/notifications/notification-destination.spec.ts` (new)
- `docs/project-review/GHARAZI-003D-DASHBOARD-ACCEPTANCE.md` (new)

No search implementation, search DTO, API, Prisma, database, authentication, payment, listing-publication, or infrastructure file was modified for GHARAZI-003D.

## 10. Tests and verification

| Check | Result |
|---|---|
| Frontend TypeScript | PASS |
| Focused ESLint for all 003D files | PASS, zero warnings |
| Focused Jest | PASS, 4 suites / 32 tests |
| Notification destination tests | PASS, including malformed/unsupported payloads |
| Next.js production build | PASS, 69/69 pages generated |
| `git diff --check` for 003D files | PASS |
| Dashboard responsive widths | PASS at 320, 375, 390, 430, 768, 1024, and 1440px |
| Horizontal document overflow | None detected at all seven widths |
| My Listings status data | Mock-rendered Active and Draft filters/counts matched fixture data |
| Inquiry navigation | Mock-rendered property and specific conversation links verified |
| Notification navigation | Mock-rendered specific conversation link verified |
| Chat deep-link selection | Mock-rendered requested conversation selected |
| Admin mobile layout | Mock-rendered labelled mobile record card at 390px |
| Admin desktop preservation | Mock-rendered desktop table at 1440px |
| Buy/Rent navigation | `/buy` and `/rent` hrefs unchanged at all seven widths |

Browser verification used an isolated local API fixture and synthetic local token. It did not use production accounts or records and did not submit mutations. No screenshots were retained; measurements and DOM interaction evidence were collected directly from local headless Chromium.

The broad web ESLint command still reports six pre-existing errors in unrelated public/search/professional/compare files. Those files were not modified because this batch forbids unrelated refactoring and search interference. Focused lint across every 003D file passed. The production build’s integrated type/lint phase also passed.

The build logged expected restricted-network `fetch failed` messages during static data retrieval and completed successfully. Browserslist also reported stale local compatibility data; dependencies were not updated.

## 11. Deferred items

- Consent-aware recently viewed history.
- Reliable seller response indicators.
- Authorized buyer contact presentation in inquiry cards.
- Real staging verification of read/unread mutations, message sending, promotion checkout, and listing lifecycle actions.
- Production-like admin datasets covering very long values and complex action menus.
- Dedicated automated browser test infrastructure; no new dependency was introduced.

## 12. Regression risks and next recommendation

- Notification destinations depend on identifiers already present in `payloadJson`; unsupported notification types remain informational rather than being routed speculatively.
- Inquiry title/navigation depends on existing included listing/project/chat relations; cards retain generic labels when relations are absent.
- Mobile and desktop admin representations coexist in the DOM and are switched responsively with CSS. Action behavior is shared and unchanged, but staging should verify complex dialogs from the mobile card view.
- Status filters use exact API-returned values and do not change lifecycle behavior.

Recommended next batch: authenticated staging acceptance for seller mutations and admin dialogs, followed by a separately approved consent/history contract if Recently Viewed remains a product priority. Keep seller response claims deferred until the API supplies an auditable aggregate.
