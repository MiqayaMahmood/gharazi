# Feature Inventory

## Status key

- **IMPLEMENTED**: a coherent code path exists. This does not imply production/provider verification.
- **PARTIALLY IMPLEMENTED**: core scaffolding or some paths exist, but an important part is absent, placeholder, or internally inconsistent.
- **NOT IMPLEMENTED**: no supporting application path was found or code explicitly marks it as future work.
- **UNKNOWN / NOT VERIFIED**: cannot be established from the accessible repository or safe public inspection.

The verification column distinguishes code from runtime evidence. The public production homepage was content-inspected; no authenticated/admin production action was performed.

## A. Public website

| Feature | Status | Evidence and implementation | Verification gap |
|---|---|---|---|
| Homepage/navigation | IMPLEMENTED | `/`; `PublicHeader`, `PublicFooter`, hero/search/home sections | Production observed; not pixel/device tested |
| Property browsing | IMPLEMENTED | `/buy`, `/rent`, search result clients; `GET /search/listings` | Homepage inventory observed; result route runtime not fetched |
| Categories/types/purposes | IMPLEMENTED | taxonomy APIs, `PropertyType`, `ListingPurpose`, category links and filters | Production taxonomy values not enumerated |
| Sale/rental ads | IMPLEMENTED | purpose-aware routes and search DTO/service | Authenticated lifecycle unverified |
| Location browsing | IMPLEMENTED | city/type routes, `/area/[slug]`, hierarchical `City`/`Area`, autocomplete | Area-page runtime unverified |
| Property detail | IMPLEMENTED | `/listing/[publicId]`, `GET /listings/:publicId` | A production card/detail link was observed; detail fetch tool failed |
| Image gallery | IMPLEMENTED | `ListingGallery`, `ListingMedia` | Actual production gallery interaction unverified |
| Search/filter/sort | IMPLEMENTED | keyword, taxonomy, price, area, rooms, furnishing, verification, geo bounds/radius, pagination, six sort modes | Search correctness/performance not production-tested |
| Featured/hot listings | IMPLEMENTED | listing flags, promotion models, homepage sections | Selection/business rules and paid placement runtime unverified |
| Similar listings/projects | IMPLEMENTED | public similar-search endpoints with Elasticsearch/DB fallback | Runtime unverified |
| Compare | IMPLEMENTED | `/compare/listings`, `/compare/projects`, batch APIs, local compare store | Runtime unverified |
| Map-assisted discovery | PARTIALLY IMPLEMENTED | geo search parameters and `MapPreview`; detail pages contain explicit map placeholders | No interactive map provider/display |
| SEO URLs/metadata | IMPLEMENTED | public IDs/slugs, metadata helpers, canonical URLs, JSON-LD, breadcrumbs, sitemap, robots | Rich Results/Lighthouse not verified |
| Blog/guides | IMPLEMENTED | WordPress REST integration, category/search/sort/detail/comments proxy | Blog content observed on homepage; comment posting unverified |
| Responsive UI | IMPLEMENTED | mobile sheets, Tailwind breakpoints, responsive grids | Code verified only; no device/browser visual test |
| Legal/trust pages | IMPLEMENTED | terms, privacy, disclaimer, anti-spam, neutrality, advertising and cookie policies | Content is explicitly draft and requires legal review |
| Feedback/contact/support | IMPLEMENTED | public forms → `InboundSubmission`; admin review APIs | Submission runtime unverified |
| Newsletter signup | IMPLEMENTED | public form and subscriber table/API | Campaign delivery is not implemented |
| Smart tools | PARTIALLY IMPLEMENTED | compare/area guides live; price trends, calculators, converter, plot finder marked “Coming soon” | Future tools absent |

## B. User accounts

| Feature | Status | Evidence and implementation | Verification gap |
|---|---|---|---|
| Registration | IMPLEMENTED | `/register`; `POST /auth/register`; public role allowlist; bcrypt | Production account creation not attempted |
| Email/password login | IMPLEMENTED | `/login`; `POST /auth/login/email`; JWT | Production runtime unverified |
| Phone OTP login | PARTIALLY IMPLEMENTED | request/verify endpoints, Redis TTL/attempt counter, UI | No SMS provider; OTP is logged by server |
| Email verification | PARTIALLY IMPLEMENTED | fields/status surfaces exist | No verification flow or mandatory enforcement |
| Phone verification | PARTIALLY IMPLEMENTED | successful OTP sets timestamp | OTP delivery is mocked and existing suspended user can be reactivated by OTP upsert |
| Password recovery | IMPLEMENTED | hashed one-hour tokens, Resend boundary, reset UI/API | Resend production setup unverified; dev fallback logs reset URL |
| Logout/session management | PARTIALLY IMPLEMENTED | session rows are revoked, client token cleared | JWT guard does not check revocation; server-side logout is ineffective until JWT expiry |
| User profile | IMPLEMENTED | `/dashboard/profile`, `UserProfile`, profile APIs | Runtime unverified |
| Security/password change | PARTIALLY IMPLEMENTED | password change endpoint/UI and session-row revocation | Existing JWTs remain valid |
| Buyer/tenant/owner capabilities | IMPLEMENTED | role assignment, favorites, inquiries, listings/dashboard | Fine-grained role restrictions are limited; most actions rely on ownership |
| Agent/developer accounts | PARTIALLY IMPLEMENTED | roles, `ProfessionalProfile`, `Developer`, professional dashboard | Two overlapping profile concepts; team/agency permissions and hard quotas absent |
| Account dashboard | IMPLEMENTED | overview, saves, chats, notifications, inquiries, profile/security, supply pages | Client-side page gate; API remains authoritative |
| RBAC | PARTIALLY IMPLEMENTED | JWT role claims and admin/moderator/support guards | Role/status changes do not invalidate or refresh existing tokens |

## C. Property advertisement management

| Feature | Status | Evidence and implementation | Verification gap |
|---|---|---|---|
| Create listing | IMPLEMENTED | eight-step form; `POST /listings`; draft/status history | Runtime unverified |
| Edit listing | IMPLEMENTED | private `GET /listings/me/:id`, `PATCH /listings/:id`, ownership/manager checks | Runtime unverified |
| Delete listing | NOT IMPLEMENTED | no user delete endpoint/UI; soft-delete field exists | Owner decision needed on deletion policy |
| Archive listing | IMPLEMENTED | `POST /listings/:id/archive` | Runtime unverified |
| Attributes/specifications | IMPLEMENTED | taxonomy, price/area/rooms/floor/year/furnishing/possession/geo/contact/amenities | Frontend covers fewer fields than full backend DTO |
| Upload/manage images/media | PARTIALLY IMPLEMENTED | S3 presign, ownership check, MIME allowlist, metadata creation, media editor | New draft has no entity ID for upload; manual URL metadata supported; no delete/reorder endpoint, content verification, enforced size, or scan |
| Draft/published lifecycle | IMPLEMENTED | draft creation, active publish, archive, sold/rented, history | Status vocabulary is free-form |
| Publication moderation | PARTIALLY IMPLEMENTED | admin approve/reject and verification state | User publish immediately sets `active`; approval is not a pre-publication gate |
| Expiry/renewal | PARTIALLY IMPLEMENTED | 90-day `expiresAt`, refresh timestamp, expiry schema | No listing-expiry job/filter and refresh does not extend expiry |
| Seller contact | IMPLEMENTED | contact fields and authenticated contact endpoint returning WhatsApp URL | Telephone/WhatsApp behavior runtime unverified |
| Owner analytics | IMPLEMENTED | summary endpoints, counters, daily stat models | Rollup completeness/runtime unverified |
| Project authoring | IMPLEMENTED | create/edit/publish/archive, media, units, updates, amenities | Requires `Developer`; authenticated runtime unverified |

## D. Buyer/seller interactions

| Feature | Status | Evidence and implementation | Verification gap |
|---|---|---|---|
| Contact seller | IMPLEMENTED | authenticated contact API and detail action panels | Runtime unverified |
| Telephone/WhatsApp | IMPLEMENTED | normalized `wa.me` URL and contact phone data | Click tracking and production data quality unverified |
| Property inquiry | IMPLEMENTED | inquiry creation, recipient derivation, status updates, history dashboard | Runtime unverified |
| Favorites/bookmarks | IMPLEMENTED | polymorphic favorites, dashboard/public save UI | Blog/tool bookmarks absent |
| Inquiry history | IMPLEMENTED | `/dashboard/inquiries`, `GET /inquiries/me` | Runtime unverified |
| 1:1 chat persistence | IMPLEMENTED | chat/messages/participants in PostgreSQL and REST UI | Runtime unverified |
| Real-time chat | PARTIALLY IMPLEMENTED | Socket.IO gateway emits/joins rooms | Gateway has no authentication/participant authorization; frontend primarily uses REST |
| In-app notifications | IMPLEMENTED | notification table, list/read/read-all, queue boundary | Runtime unverified |
| Email/SMS/push notifications | NOT IMPLEMENTED | worker contains explicit TODO | Password reset email is separate and implemented |
| Saved-search alerts | PARTIALLY IMPLEMENTED | saved search CRUD and alert flag/queue | matching/delivery worker is an explicit TODO |
| Lead management/CRM | PARTIALLY IMPLEMENTED | inquiries, chats, owner summaries, professional dashboard | assignment pipeline, stages, notes, automation, team roles absent |

## E. Administration

| Feature | Status | Evidence and implementation | Verification gap |
|---|---|---|---|
| Admin dashboard | IMPLEMENTED | `/admin` shell/overview; role-gated APIs | Production admin not accessed |
| User management | IMPLEMENTED | list/detail/create-admin/status/role endpoints and UI | Token revocation gap after status/role changes |
| Listing/project moderation | IMPLEMENTED | queues, approve/reject, contact-update utility, audit/notifications | Not a mandatory pre-publication workflow |
| Verification management | IMPLEMENTED | request/review and professional verification | Document/KYC verification absent |
| Reports/risk/duplicates | IMPLEMENTED | models, admin APIs, audit paths | Automation depth/runtime unverified |
| Category/taxonomy management | NOT IMPLEMENTED | public read APIs and seed exist; no admin CRUD endpoints/UI | Changes require seed/DB workflow |
| Geographic data management | NOT IMPLEMENTED | public reads and seed exist; no admin CRUD endpoints/UI | Changes require seed/DB workflow |
| Featured/promoted management | IMPLEMENTED | promotions CRUD/lifecycle, admin list, payment linkage | Runtime/provider verification absent |
| Analytics/reports | PARTIALLY IMPLEMENTED | overview, summaries, daily stats, event capture | deeper charts explicitly deferred; rollup reliability unverified |
| Site configuration | NOT IMPLEMENTED | no settings entity/admin screen | configuration is code/env driven |
| Content management | PARTIALLY IMPLEMENTED | internal CMS pages/blog CRUD plus admin UI | public blog source of truth is WordPress, creating two CMS concepts |
| Submission management | IMPLEMENTED | contact/support/feedback list/detail/status/assignment | Runtime unverified |
| Search operations | IMPLEMENTED | bootstrap/reindex/alias/status admin endpoints/UI | Runtime Elasticsearch configuration unverified |
| System health/events | IMPLEMENTED | health dashboard, dependency probes, persistent events | several detailed probes are unintentionally public-risk candidates |
| Data-integrity repair | IMPLEMENTED | admin check/repair endpoints | Repair scope capped and production behavior unverified |

## F. Commercial capabilities

| Feature | Status | Evidence and implementation | Verification gap |
|---|---|---|---|
| Free advertisements | IMPLEMENTED | owners can create and publish without checkout in current service | Business limits not enforced |
| Paid promotions/featured packages | IMPLEMENTED | package catalog, Stripe checkout, promotions, lifecycle worker | Stripe/prices/webhook runtime unverified |
| Seller subscriptions | IMPLEMENTED | plans, subscriptions, Stripe events, dashboard/admin paths | expiry-alert worker TODO; entitlements/hard quotas limited |
| Agency/professional accounts | PARTIALLY IMPLEMENTED | professional profile/onboarding/verification/summary | public profiles, teams, permissions, lead assignment absent |
| Developer packages | IMPLEMENTED | catalog/checkout and project/developer entities | Runtime unverified |
| Advertising placements | PARTIALLY IMPLEMENTED | `/advertise`, package catalog, ad slots, inbound leads, optional AdSense | package copy includes placeholders; self-service activation/serving rules incomplete |
| Payment integration | IMPLEMENTED | Stripe Checkout, signed webhook, transactions/attempts/reconciliation | Runtime/provider configuration unverified |
| Promotional inventory selection | PARTIALLY IMPLEMENTED | flags/promotions and UI surfaces | dedicated promoted agency/developer feeds absent |

## Code existence versus runtime summary

Confirmed by build/static evidence: frontend route generation, DTO validation setup, ownership queries, persistence models, search fallback, authoring components, admin/API route structure, Stripe/S3/Resend boundaries, and most compile-time integration.

Observed in public production: homepage/navigation/search form, live listing cards, verification labels, compare/save/inquire actions, empty featured-project state, area/category discovery, blog excerpts, legal links, feedback/newsletter surfaces, and explicit “Coming soon” tools.

Not runtime verified: every authenticated flow, admin operation, payment, media upload, notification, WebSocket, email/SMS, worker/scheduler, search-index operation, and deployment/provider setting.

