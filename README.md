# Gharazi PK Backend

Sprint 1 foundation for a Pakistan real-estate classifieds and projects platform.

## What Is Included

- NestJS monorepo with separate `api` and `worker` apps
- Prisma/PostgreSQL schema, first migration, and seed data
- Redis integration for OTP state and future cache/session helpers
- BullMQ queue wiring for `notifications` and `search-indexing`
- Zod environment validation
- JWT auth with phone-first mocked OTP flow
- Foundation modules: auth, users, roles, locations, taxonomy, health
- Stable machine-readable `code` fields on lookup/reference tables
- Hierarchical areas through optional parent-child area relationships
- Marketplace core modules: developers, listings, and projects
- Listing/project media metadata, amenities, lifecycle state, and indexing job hooks
- Public Elasticsearch-backed discovery endpoints
- Favorites, saved searches, inquiries, chat, notifications, verification, and reporting foundations
- Admin operations APIs, audit logging, promotions, subscriptions, analytics summaries, and CMS foundations
- Admin frontend shell, payment abstraction, analytics event ingestion, and risk tooling
- Newsletter subscription persistence and a public footer signup surface
- Observability, diagnostics, queue retry hardening, scheduled automation, search ops, and analytics rollups
- Swagger at `/docs`
- Docker Compose for local PostgreSQL, Redis, and Elasticsearch

Sprint 6 intentionally does not include advanced AI pricing/fraud modules, semantic/vector search, full BI warehousing, or multiple real payment provider integrations.

## Project Structure

```text
apps/
  admin/
    index.html
    main.js
    styles.css
  web/
    app/
    components/
    lib/
    stores/
    types/
  api/
    src/
      main.ts
      app.module.ts
      common/
      config/
      database/
      modules/
        auth/
        users/
        roles/
        locations/
        taxonomy/
        developers/
        listings/
        projects/
        search/
        favorites/
        saved-searches/
        notifications/
        inquiries/
        chat/
        verification/
        moderation/
        admin-operations/
        audit/
        promotions/
        subscriptions/
        analytics/
        cms/
        submissions/
        health/
  worker/
    src/
      main.ts
      worker.module.ts
      jobs/
        notifications/
        search-indexing/
packages/
  shared-config/
  shared-events/
  shared-types/
  shared-utils/
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Use a long random value for `JWT_SECRET` before running outside local development.

## Run Commands

```bash
npm run start:api:dev
npm run start:worker:dev
```

API defaults to `http://localhost:3001`.

Web frontend:

```bash
npm --prefix apps/web run dev
```

The Next.js app lives in `apps/web` and explicitly runs on `http://localhost:3000` in local development. Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` in `apps/web/.env.local` when running the API locally.

Local development URLs:

```text
Web: http://localhost:3000
API: http://localhost:3001
Health: http://localhost:3001/health/live
```

Recommended local terminals:

```bash
# Terminal 1 - API
npm run start:api:dev

# Terminal 2 - Worker
npm run start:worker:dev

# Terminal 3 - Web
npm --prefix apps/web run dev
```

For the web app, create `apps/web/.env.local` when needed:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=false
```

Troubleshooting local ports:

- If port `3000` is already in use, stop the existing process or run the web app on another port and add that origin to `CORS_ORIGINS`.
- If API CORS fails, verify the API is running on `http://localhost:3001`, verify `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`, and verify `CORS_ORIGINS` includes the web origin.

Production-like frontend mode:

```env
NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=false
SEARCH_ENABLED=true
```

With mock fallback disabled, public reads and dashboard reads use real APIs only. Backend/search errors are shown instead of replacing failed responses with demo listings, projects, favorites, or chats. Mock fallback can be enabled only for local demos with `NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=true`; it must not be used for staging or beta validation.

Local Elasticsearch:

```bash
docker compose up -d elasticsearch
curl http://localhost:9200
```

Open `http://localhost:9200` to confirm the local single-node cluster responds. Keep search enabled in local development with:

```env
ELASTICSEARCH_URL=http://localhost:9200
SEARCH_ENABLED=true
SEARCH_DB_FALLBACK_ENABLED=true
```

Then run the API and inspect search health:

```bash
npm run start:api
npm run search:bootstrap
npm run search:status
```

The search scripts call protected admin endpoints, so set an admin JWT first:

```bash
ADMIN_TOKEN=<admin-jwt> npm run search:status
ADMIN_TOKEN=<admin-jwt> npm run search:bootstrap
ADMIN_TOKEN=<admin-jwt> npm run search:reindex:listings
ADMIN_TOKEN=<admin-jwt> npm run search:reindex:projects
ADMIN_TOKEN=<admin-jwt> npm run search:reindex:areas
```

You can also open `http://localhost:3001/admin/search/status` directly with an Admin bearer token. If Elasticsearch is unavailable, the endpoint returns `status: degraded` instead of a server error. Public search endpoints use Elasticsearch when it is reachable. In local development, `SEARCH_DB_FALLBACK_ENABLED=true` lets `/search/listings`, `/search/projects`, and area autocomplete fall back to PostgreSQL instead of returning a raw Elasticsearch connection failure.

Reindex endpoints are:

```text
POST http://localhost:3001/admin/search/reindex/listings
POST http://localhost:3001/admin/search/reindex/projects
POST http://localhost:3001/admin/search/reindex/areas
```

Bootstrap creates versioned physical indices and assigns current aliases:

```text
Gharazi_listings_v1  -> Gharazi_listings_current
Gharazi_projects_v1  -> Gharazi_projects_current
Gharazi_areas_v1     -> Gharazi_areas_current
```

Legacy static admin shell:

```text
apps/admin/index.html
```

Open it in a browser only for low-level fallback operations. The primary admin GUI now lives in the Next.js app at `/admin`.

## Sprint 8 Web Frontend

Sprint 8 adds the first public marketplace frontend foundation.
Sprint 9 extends it with authenticated engagement and dashboard surfaces.
Sprint 10 adds supply-side create/edit forms, SEO route templates, search URL polish, and frontend tooling cleanup.
Sprint 11 adds map-assisted discovery, comparison tools, CMS/blog frontend depth, related-guide surfaces, and conversion polish.
Sprint 12 finalizes public beta readiness with batch compare endpoints, geo search parameters, data-integrity tools, SEO files, and funnel polish.
Sprint 13 improves the public face with a rotating hero, controlled ad slots, professional footer/legal pages, feedback collection UI, and support entry UX.
Sprint 21 enriches public search landing pages (`/buy`, `/rent`, `/projects`, and supported city/type routes) with contextual intros, quick-search chips, recommendation sections, related locations, tools, guides, profile placeholders, and FAQs. Search results remain primary, and production-like mode must not show fake listing/project records. Recommendation sections use `/search/listings`, `/search/projects`, and real stats from `/stats/popular` where available; empty data shows honest empty states. Premium agency/developer feeds, promoted profile feeds, and city/area intelligence remain future backend endpoints.
Sprint 14 closes the public submission loop with persisted feedback/contact/support requests, admin review endpoints, frontend form wiring, and notification/audit routing boundaries.
Sprint 15 refactors the homepage and public search UX with a sticky global search bar, full-width hero, collapsible dynamic filters, premium agency surface, stronger project/location sections, and smart-tool cards.
Sprint 16 adds email/password auth, public role selection, profile/security pages, city dropdown search, Resend reset-email boundary, S3 presigned uploads, seeded admin user, and expanded admin user management.
Sprint 17 adds the Admin Dashboard GUI inside `apps/web`, role-aware Admin navigation, protected `/admin` routes, admin list/action pages, and a cleaner logged-in account menu.
Sprint 18 switches public blog browsing to WordPress as a headless CMS while rendering posts natively in the Gharazi frontend.
Sprint 19 adds the public advertising packages page, monetization package data, sponsored placement explanations, FAQ, and advertising lead capture.
Sprint 20 adds centralized draft policy pages, legal footer links, inline disclaimers, consent copy, and a lightweight cookie notice.
Sprint 23 completes final launch visibility polish with non-blocking view tracking on detail/content pages, period-aware `/stats/popular` reads, current-month admin activity summaries, newsletter signup persistence, and a reorganized public footer. Popular/trending UI must remain stats-backed; if no real activity data exists, use honest empty states or safer labels such as Recently Added.

Included routes:

- `/`
- `/buy`
- `/rent`
- `/projects`
- `/listing/[publicId]`
- `/project/[slug]`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/favorites`
- `/dashboard`
- `/dashboard/favorites`
- `/dashboard/saved-searches`
- `/dashboard/chats`
- `/dashboard/notifications`
- `/dashboard/inquiries`
- `/dashboard/profile`
- `/dashboard/security`
- `/dashboard/listings`
- `/dashboard/listings/new`
- `/dashboard/listings/[id]/edit`
- `/dashboard/projects`
- `/dashboard/projects/new`
- `/dashboard/projects/[id]/edit`
- `/buy/[city]` (implemented as the one-segment `/buy/[propertyType]` route internally because Next.js requires consistent dynamic segment names under `/buy`)
- `/rent/[city]`
- `/buy/[propertyType]/[city]`
- `/projects/[city]`
- `/area/[slug]`
- `/compare/listings`
- `/compare/projects`
- `/advertise`
- `/blog`
- `/blog/[slug]`
- `/sitemap.xml`
- `/robots.txt`
- `/about`
- `/contact`
- `/privacy-policy`
- `/terms`
- `/disclaimer`
- `/anti-spam-policy`
- `/platform-neutrality`
- `/advertising-disclaimer`
- `/cookie-policy`

The frontend API layer lives in `apps/web/lib/api`. It calls the existing backend endpoints for OTP auth, current user, listing search, project search, area autocomplete, listing detail, and project detail. When the backend is unavailable, typed mock data keeps the public UI usable for development.

Sprint 9 API integrations:

- `/favorites`
- `/saved-searches`
- `/inquiries`
- `/chats`
- `/notifications`
- `/listings/me`
- `/projects/me`

Sprint 10 API integrations:

- `POST /listings`
- `PATCH /listings/:id`
- `POST /listings/:id/publish`
- `POST /listings/:id/archive`
- `POST /listings/:id/media`
- `POST /projects`
- `PATCH /projects/:id`
- `POST /projects/:id/publish`
- `POST /projects/:id/archive`
- `POST /projects/:id/media`
- `POST /projects/:id/units`
- `POST /projects/:id/updates`
- `/taxonomy/purposes`
- `/taxonomy/property-types`
- `/taxonomy/amenities`
- `/locations/cities`
- `/locations/areas?cityId=...`

Sprint 11 integrations and frontend state:

- `/cms/blog-posts`
- `/cms/blog-posts/:slug`
- listing/project comparison state persisted in browser local storage
- map/list toggle surfaces on listings and projects search pages
- related guides on home, listing detail, project detail, area, and SEO landing pages

Sprint 12 API and ops additions:

- `POST /listings/batch`
- `POST /projects/batch`
- geo search query params on listing/project search: `north`, `south`, `east`, `west`, `lat`, `lng`, `radiusKm`
- `GET /admin/data-integrity/check`
- `POST /admin/data-integrity/repair`
- DB indexes on listing/project latitude and longitude
- compare pages now use backend batch data and surface stale/deleted selections

Sprint 13 frontend additions:

- rotating homepage hero carousel
- controlled ad slot components for internal campaigns or future AdSense
- `NEXT_PUBLIC_ADS_ENABLED=true` enables ad rendering
- `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...` loads the AdSense script when enabled
- public About, Contact, Privacy Policy, Terms, Disclaimer, and Cookie Policy pages

Sprint 14 submission integrations:

- homepage feedback form posts to `POST /feedback`
- contact page form posts to `POST /contact`
- support widget posts to `POST /support-requests`
- public submissions are stored in the unified `InboundSubmission` table
- new submissions create admin/support notifications when matching users exist
- status and assignment changes are recorded in audit logs
- admin shell includes a lightweight `Submissions` view for review and status changes

Sprint 15 homepage/search additions:

- sticky `GlobalSearchBar` reused on home, listing search, project search, listing detail, and project detail surfaces
- search result pages use top sticky controls and collapsible advanced filters instead of a persistent desktop sidebar
- dynamic filters adapt to broad property context: house/apartment, plot, commercial, and projects
- homepage hero is now full-width with search above the campaign carousel
- homepage includes premium agency cards, improved project grid, popular quick-search blocks, and smart tools
- smart-tool cards link to live compare/area surfaces and clearly label future tools as `Coming soon`

Sprint 16 auth/profile/media additions:

- `POST /auth/register` creates bcrypt-hashed email/password users with public roles: `buyer`, `tenant`, `owner`, `agent`, or `developer`
- `POST /auth/login/email`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, and `POST /auth/change-password`
- public registration excludes `admin` and `moderator`; those roles are admin-assigned
- `/dashboard/profile` supports profile edits and verification-status placeholders
- `/dashboard/security` supports authenticated password changes
- `POST /media/presign-upload` returns S3 presigned PUT URLs when AWS env vars are configured and a dev placeholder URL otherwise
- admin user management adds list/detail, approve/block/unblock, role assignment/removal, and admin-user creation endpoints
- seed creates an admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, defaulting to `mahmoodrf@gmail.com`

Sprint 18 WordPress blog integration:

- WordPress remains the source of truth for public blog content; posts are not copied into the Gharazi database.
- The frontend fetches from `WP_API_BASE` / `NEXT_PUBLIC_WP_API_BASE`, defaulting to `https://mydaytogo.com/wp-json/wp/v2`.
- `WP_MAIN_CATEGORY_SLUG=realestate` identifies the main blog category. Child categories are exposed as filters on `/blog`.
- Public reads use Next.js fetch revalidation of about 10 minutes so WordPress outages do not need to make every page dynamic.
- `/blog` supports pagination, subcategory filtering, keyword search, and sort options: newest, oldest, A to Z, and Z to A.
- `/blog/[slug]` renders title, featured image, author/date/category labels, sanitized WordPress HTML, related posts, and a remarks section.
- Comment submission posts through the server route `POST /api/blog/comments`, which forwards to WordPress without exposing `WP_API_KEY` to the browser. WordPress may still moderate or reject comments depending on its settings.

WordPress environment variables:

```env
NEXT_PUBLIC_WP_API_BASE=https://mydaytogo.com/wp-json/wp/v2
WP_API_BASE=https://mydaytogo.com/wp-json/wp/v2
WP_MAIN_CATEGORY_SLUG=realestate
WP_API_KEY=
```

Sprint 19 advertising and monetization UX:

- Public route: `/advertise`.
- Package data lives in `apps/web/lib/advertising/packages.ts` so pricing labels, package names, features, and sponsored placements can be edited without scattering copy through JSX.
- The page includes individual owner packages, agency packages, developer packages, sponsored placement cards, benefits, how-it-works steps, FAQ, and a final CTA.
- The footer links to `Advertise with Gharazi` from the Company column.
- Advertising inquiries reuse the Sprint 14 inbound submission system through `POST /contact` with `category: advertising` and `sourcePage: /advertise`.
- Pricing is intentionally placeholder/config-driven during beta. Full payment checkout and self-serve ad activation are deferred.

Sprint 20 policy, consent, and disclaimer integration:

- Draft policy content is centralized in `apps/web/lib/policies/policy-content.ts`.
- Policy pages are rendered through `components/pages/legal-page.tsx` and include `/terms`, `/privacy-policy`, `/disclaimer`, `/anti-spam-policy`, `/platform-neutrality`, `/advertising-disclaimer`, and `/cookie-policy`.
- Inline disclaimer components live in `apps/web/components/legal/disclaimers.tsx`.
- Disclaimers are placed on listing detail, project detail, comparison pages, blog detail, homepage featured/recommended sections, and the advertising page.
- Registration includes acknowledgement language for Terms and Privacy Policy.
- Contact, feedback, and support submissions include concise processing consent text.
- Inquiry/chat panels remind users not to share sensitive financial details and to verify parties independently.
- A lightweight cookie notice stores acceptance in browser local storage and links to `/cookie-policy`.
- Policy text is public-beta draft content and should be reviewed by qualified legal counsel before launch.

Authenticated routes use the centralized client-side guard in `components/auth/protected-content.tsx`. Login redirects preserve the target route where practical.

Deferred to the next frontend sprint:

- full buyer/owner/developer dashboard
- richer add/edit listing and project field coverage
- full media upload pipeline beyond metadata URLs
- dedicated private detail endpoints for editing drafts
- richer real-time chat if WebSocket stabilization is needed
- viewport/geo search filters for true map-based discovery
- backend-hydrated compare records for arbitrary listing/project IDs
- richer CMS taxonomy/category APIs for editorial browsing
- production AdSense activation and policy review after traffic/content approval
- real email/helpdesk integration for feedback/contact/support routing
- dedicated backend feeds for promoted agencies and curated homepage inventory
- live implementations for placeholder tools such as price trends, calculators, and plot finder
- mandatory email/phone verification enforcement

Observability can be enabled locally with:

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=Gharazi-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Docker Compose includes an OpenTelemetry Collector. Prometheus-format metrics are exposed from the collector on `http://localhost:8889/metrics`.

## Public Beta Launch Checklist

- Set `JWT_SECRET`, database, Redis, Elasticsearch, and public web/API URLs for the target environment.
- Set `NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=false` for production-like and beta testing.
- Run `npm install`, `npm run prisma:generate`, and `npm run prisma:deploy`.
- Seed demo data with `npm run prisma:seed` for beta walkthroughs.
- Start API, worker, and web processes:

```bash
npm run start:api
npm run start:worker
npm --prefix apps/web run dev
```

- Confirm `GET http://localhost:3001/health/ready`, Swagger `http://localhost:3001/docs`, web `/sitemap.xml`, and web `/robots.txt`.
- Run admin data checks: `GET /admin/data-integrity/check`.
- Repair missing search index jobs if needed: `POST /admin/data-integrity/repair`.
- Reindex listings/projects from admin search ops before marketing traffic if seed/import data changed.

Critical flow verification before staging:

- Login as an owner or agent, create a sale listing, and verify a row exists in `listings`.
- Create a rent listing and verify `purposeId`, `ownerUserId`, `cityId`, `areaId`, and `propertyTypeId` are real database IDs.
- Publish a listing and verify `status='active'`, `publishedAt` is set, and a search-indexing job is queued/processed.
- Archive a listing and verify the delete/deindex path logs or reports failures.
- Login as a developer user with a developer profile, create a project, and verify a row exists in `projects`.
- If developer profile is missing, the UI should show `Developer profile is required before creating or managing projects`.
- Submit feedback/contact/support and verify an `InboundSubmission` row.
- Add/remove favorite, save search, send inquiry, send chat message, and mark notifications read; failures must be visible in the UI.
- Use `/admin/search/status` and `/admin/data-integrity/check` to confirm search and repair status.

Troubleshooting write failures:

- Browser console in development logs failed listing/project/admin mutations.
- API logs include route/action and user ID for listing/project create failures.
- API error responses use `{ success, statusCode, message, error, details, path, timestamp }`.
- Check `Authorization` bearer token if the UI shows login or permission errors.

Health endpoints:

```text
GET /health/live
GET /health/ready
```

Swagger:

```text
GET /docs
```

## Auth Flow

Request OTP:

```http
POST /auth/request-otp
Content-Type: application/json

{
  "phoneNumber": "+923001234567"
}
```

Verify OTP:

```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+923001234567",
  "otp": "123456"
}
```

In local development, `.env.example` sets `OTP_DEV_CODE=123456`. OTPs are stored only in Redis and expire after `OTP_TTL_SECONDS`.

Email/password auth:

```http
POST /auth/register
POST /auth/login/email
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/change-password
GET /auth/me
```

Passwords are hashed with bcrypt. Password reset tokens are stored hashed and expire after one hour. Resend is used only when `RESEND_API_KEY` is configured; otherwise reset links are logged for local development. Email and phone verification fields are present, but mandatory verification enforcement is deferred.

Seeded admin:

```text
SEED_ADMIN_EMAIL=mahmoodrf@gmail.com
SEED_ADMIN_PASSWORD=Mrfmm808$$
```

The seed script hashes the password before storage and assigns the `admin` role. Rotate this password after first login in any shared or production-like environment.

Additional Sprint 16 environment variables:

```env
APP_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
RESEND_API_KEY=
EMAIL_FROM=Gharazi <no-reply@Gharazi.pk>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_PUBLIC_BASE_URL=
CLOUDFRONT_BASE_URL=
```

## Database Commands

```bash
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```

Seed data includes roles, listing purposes, property types, amenity definitions, and a small hierarchical set of cities/areas for development. Elasticsearch is required for full Sprint 3 search behavior and remains enabled by default in development. Docker Compose exposes it at `http://localhost:9200`.

The schema refinement migration backfills new lookup `code` values from existing names/slugs. Existing `buy` listing purpose rows are mapped to internal code `sale`; existing `flat` property type rows are mapped to internal code `apartment`. Existing users keep their current `ACTIVE`, `SUSPENDED`, or `DELETED` status; the new `PENDING` status is available for future flows.

## Test And Quality Commands

```bash
npm run test
npm run lint
npm run build
```

## Architecture Notes

The platform is a modular monolith. PostgreSQL is the source of truth. Redis is used for ephemeral OTP state and queue infrastructure, and is prepared for cache/session/throttling helpers. API and worker are separate deployable NestJS apps within one monorepo. Elasticsearch is the local discovery read layer when `SEARCH_ENABLED=true`.

Prisma is used for ORM and migrations because it fits the requested stack, gives typed database access, and keeps the initial schema/migration workflow simple for a small team.

Reference tables such as roles, property types, listing purposes, and amenities expose human-friendly names/slugs but use durable `code` values for internal lookups. Roles are assigned by `role.code`, and JWT role claims use codes.

Areas support a simple hierarchy with optional `parentAreaId` and `areaLevel` values such as `society`, `phase`, `block`, `sector`, and `locality`. City deletion is restricted while areas exist to prevent accidental reference-data loss. Deleting a parent area sets child `parentAreaId` values to null, preserving child areas as top-level records.

## Marketplace Core

Sprint 2 adds the first business-domain entities:

- Developers: one developer profile per user for now.
- Listings: owner/manager controlled property records with media, amenities, publish/archive/refresh lifecycle, and status history.
- Projects: developer-owned projects with units, media, amenities, and construction updates.

Public IDs are generated by the API as `LST-...` for listings and `PRJ-...` for projects. These are human-friendly unique identifiers, not database primary keys.

Developer endpoints:

```text
POST /developers/profile
PATCH /developers/profile
GET /developers/me
GET /developers/:slug
```

Listing endpoints:

```text
POST /listings
PATCH /listings/:id
GET /listings/me
GET /listings/:publicId
POST /listings/:id/publish
POST /listings/:id/archive
POST /listings/:id/refresh
POST /listings/:id/media
```

Project endpoints:

```text
POST /projects
PATCH /projects/:id
GET /projects/me
GET /projects/:slug
POST /projects/:id/publish
POST /projects/:id/archive
POST /projects/:id/units
PATCH /projects/:id/units/:unitId
POST /projects/:id/media
POST /projects/:id/updates
```

New listings and projects start as `draft`. Public detail endpoints only expose `active` listings/projects, with listing detail also allowing public terminal marketplace states like `sold` and `rented`. Publish and archive go through service methods so status changes can trigger indexing hooks and, for listings, status history records.

Media endpoints only store metadata (`storageKey`, `url`, dimensions, cover flag). Actual upload/signing flows are deferred.

## Search Indexing

Sprint 3 uses Elasticsearch as the discovery read layer. Application code reads/writes through aliases:

- `Gharazi_listings_current`
- `Gharazi_projects_current`
- `Gharazi_areas_current`

The Elasticsearch service includes `ensureCoreIndices()` to create initial `_v1` indices and aliases with strict starter mappings. Rebuild/rotation tooling is still deferred.

Search endpoints:

```text
GET /search/listings
GET /search/projects
GET /search/areas/autocomplete?q=...
GET /search/listings/:id/similar
GET /search/projects/:id/similar
```

Indexing jobs:

- `index-listing`
- `delete-listing`
- `index-project`
- `delete-project`

API services enqueue these jobs on publish/archive and active-record updates. The worker writes placeholder alias-backed documents now; full PostgreSQL aggregate document building remains a TODO.

## Discovery And Leads

Favorites:

```text
POST /favorites
DELETE /favorites
GET /favorites?entityType=listing|project|developer|area
```

Favorites now reuse the polymorphic `Favorite` table for UUID-backed marketplace objects. Supported saved entity types are `listing`, `project`, `developer`, and `area`; duplicate saves are prevented per user/entity. Dashboard responses are hydrated with basic card data and links so `/favorites`, `/dashboard/favorites`, and `/dashboard/bookmarks` can render real saved items and remove actions. Blog/tool bookmarks remain a frontend-ready TODO until those pages have stable Gharazi IDs instead of external slugs.

Saved searches:

```text
POST /saved-searches
PATCH /saved-searches/:id
DELETE /saved-searches/:id
GET /saved-searches
```

Inquiries:

```text
POST /inquiries
GET /inquiries/me
PATCH /inquiries/:id/status
```

Chat:

```text
GET /chats
GET /chats/:id/messages
POST /chats/:id/messages
WebSocket namespace: /chat
```

Chat is MVP 1:1 only. Messages are stored in PostgreSQL. The gateway supports joining a chat room and receiving new message events; production-grade socket auth and presence are still deferred.

Notifications:

```text
GET /notifications
POST /notifications/:id/read
POST /notifications/read-all
```

Notifications are persisted with delivery records. Provider delivery remains mocked/logged in the worker.

Public inbound submissions:

```text
POST /feedback
POST /contact
POST /support-requests
```

These endpoints are public, validated server-side, covered by the global API rate limiter, and include a simple honeypot field (`website`) for lightweight abuse filtering. If a bearer token is present and valid, the submission is linked to that user.

Admin/internal submission review:

```text
GET /admin/submissions?submissionType=&status=&q=&from=&to=
GET /admin/submissions/:id
PATCH /admin/submissions/:id/status
PATCH /admin/submissions/:id/assign
```

Submission status is intentionally simple: `new`, `in_progress`, `resolved`, or `dismissed`. The API supports filtering by type/status/date and basic text search across subject, name, email, and message.

Trust foundations:

```text
POST /verification-requests
GET /verification-requests/me
POST /reports
```

Verification review and moderation workflows are available in the Next.js Admin Dashboard at `/admin` for users with the `admin` role.

## Admin Operations

Admin/moderator-only APIs use JWT role claims (`admin` or `moderator`) and record audit logs for important actions.

The Admin Dashboard lives in the existing web app, not a separate deployment:

```text
http://localhost:3000/admin
```

After login, the account dropdown shows `Admin Dashboard` only when the current user has an `admin` role. Non-admin users are blocked by the `/admin` route guard even if they navigate directly. The admin UI includes overview, users, listings, projects, reports, verification requests, submissions, promotions, subscriptions, payments, analytics, audit logs, CMS pages, blog posts, risk flags, data integrity, and search operations.

```text
GET /admin/overview
GET /admin/listings
GET /admin/projects
GET /admin/promotions
GET /admin/subscriptions
GET /admin/cms/pages
GET /admin/cms/blog-posts
GET /admin/reports
GET /admin/verification-requests
POST /admin/verification-requests/:id/approve
POST /admin/verification-requests/:id/reject
POST /admin/listings/:id/approve
POST /admin/listings/:id/reject
POST /admin/projects/:id/approve
POST /admin/projects/:id/reject
GET /admin/users
GET /admin/users/:id
POST /admin/users/:id/approve
POST /admin/users/:id/block
POST /admin/users/:id/unblock
POST /admin/users/:id/suspend
POST /admin/users/:id/unsuspend
POST /admin/users/:id/roles
DELETE /admin/users/:id/roles/:roleId
POST /admin/users/create-admin
GET /admin/audit-logs
GET /admin/analytics/summary
GET /admin/submissions
GET /admin/submissions/:id
PATCH /admin/submissions/:id/status
PATCH /admin/submissions/:id/assign
```

Known Sprint 14 limitations:

- There is no full helpdesk workflow or customer-support SLA model.
- Email delivery is represented by notification/routing boundaries; production support-inbox email integration is still deferred.
- Public form abuse prevention is lightweight: global throttling, validation, and honeypot filtering. CAPTCHA is not integrated.

Media upload:

```text
POST /media/presign-upload
```

The endpoint requires auth, verifies listing/project ownership, restricts file content types, and returns a presigned PUT URL plus storage key/public URL. After upload, the frontend persists metadata through existing listing/project media endpoints. AWS credentials are never exposed to the frontend.

## Monetization

Promotions:

```text
POST /promotions
PATCH /promotions/:id
GET /promotions/me
POST /promotions/:id/cancel
```

Promotions support `featured`, `homepage`, and `area_spotlight` records. Active featured promotions update listing/project `isFeatured` and enqueue search reindexing. Billing is intentionally stubbed.

Subscriptions:

```text
GET /subscriptions/plans
POST /subscriptions
GET /subscriptions/me
POST /subscriptions/:id/cancel
```

Subscription plans are seeded with basic starter plans. Payment provider integration is represented by optional provider/reference fields only.

## Analytics

Owner/developer summary endpoints:

```text
GET /analytics/listings/:id/summary
GET /analytics/projects/:id/summary
```

Daily rollup tables exist for listing/project stats. Worker placeholders exist for `analytics-rollups`; a full event pipeline is deferred.

## CMS

Admin/moderator write endpoints and public read endpoints:

```text
POST /cms/pages
PATCH /cms/pages/:id
GET /cms/pages/:slug
POST /cms/blog-posts
PATCH /cms/blog-posts/:id
GET /cms/blog-posts
GET /cms/blog-posts/:slug
```

Content is stored as `contentJson` with a simple `draft`/`published` status model.

## Sprint 2 Starting Points

## Sprint 3 Starting Points

## Sprint 4 Starting Points

## Sprint 5 Starting Points

- Frontend/admin dashboard integration
- Richer monetization workflows and payment provider integrations
- Advanced notifications and alert automation
- Stronger trust/risk tooling
- Reporting enhancements and operational polish
- Real analytics event ingestion and rollup execution
- Media upload/signing integration
- More complete auth hardening: refresh tokens, session revocation checks, device/IP throttling, and SMS provider integration

## Sprint 5 Operations

Payments:

```text
POST /payments/checkout
POST /payments/webhook/:provider
GET /payments/me
```

The payment layer uses a provider interface and a robust local `mock` provider. Checkout creates `PaymentTransaction` and `PaymentAttempt` records. Webhooks update transaction state and activate subscription/promotion lifecycle effects after `paid` status.

Analytics events:

```text
POST /analytics/events
GET /stats/popular?entityType=listing&purpose=sale&limit=6
GET /stats/popular?entityType=listing&period=month&limit=6
GET /stats/popular?entityType=project&limit=6
GET /stats/entity/:entityType/:entityId
```

The event model supports listing/project/developer/area/blog/tool views, favorites, inquiries, chat events, promotions, and subscription lifecycle events. Listing and project detail pages send idempotent view events once per browser session/day, and listing/project view/favorite events update daily stats immediately. Public "Most viewed" sections must use `/stats/popular`; if no real stat rows exist, the UI should hide the section or use safer labels such as "Recently added" or "Recommended". No fake view counts, fake favorites, or fake popularity claims should be used in production-like mode.

Admin activity summary:

```text
GET /admin/analytics/summary?range=current_month
GET /admin/analytics/summary?range=today
GET /admin/analytics/summary?range=last_7_days
GET /admin/analytics/summary?range=previous_month
GET /admin/analytics/summary?range=custom&from=2026-05-01&to=2026-05-31
```

The admin summary returns real counts for users, listings, projects, publication activity, listing/project views, submissions, advertising inquiries, favorites, chat messages, newsletter subscribers, pending queues, and top viewed listings/projects for the selected range.

Newsletter:

```text
POST /newsletter/subscribe
POST /newsletter/unsubscribe
```

`POST /newsletter/subscribe` accepts `email`, optional `name`, optional `city`, optional `interestsJson`, and `sourcePage`. Duplicate emails are upserted as active subscriptions and return the same friendly success path. Newsletter subscriber data is private; do not expose it through public APIs. The footer signup includes a privacy notice and links to `/privacy-policy`.

Risk and moderation expansion:

```text
GET /admin/reports?status=&entityType=&reasonCode=
POST /admin/reports/:id/resolve
POST /admin/reports/:id/dismiss
POST /admin/duplicate-candidates/:id/confirm
POST /admin/duplicate-candidates/:id/dismiss
POST /admin/admin-notes
GET /admin/admin-notes
POST /admin/risk-flags
GET /admin/risk-flags
POST /admin/risk-flags/:id
```

Worker queues now include payment follow-ups, subscription alerts, risk follow-ups, analytics rollups, promotion lifecycle jobs, saved-search alerts, notifications, and search indexing.

## Sprint 6 Hardening

Diagnostics:

```text
GET /health/live
GET /health/ready
GET /health/dependencies
GET /health/queues
GET /health/search
```

Search operations:

```text
POST /admin/search/reindex/listings
POST /admin/search/reindex/projects
POST /admin/search/reindex/areas
POST /admin/search/reindex/listings/:id
POST /admin/search/reindex/projects/:id
POST /admin/search/aliases/swap
GET /admin/search/status
```

Analytics rollups:

```text
POST /admin/analytics/rollups/run
POST /admin/analytics/rollups/rebuild
GET /admin/analytics/rollups/status
```

Payment operations:

```text
GET /payments/:id
GET /admin/payments
POST /admin/payments/:id/reconcile
```

Queue reliability:

- Default BullMQ jobs use 5 attempts with exponential backoff.
- Completed/failed jobs are retained with bounded age/count for operational inspection.
- Recurring jobs are centrally registered for promotion lifecycle, subscription reminders, and analytics rollups.

Security and launch hardening:

- Global API rate limiting is enabled through `RATE_LIMIT_TTL_SECONDS` and `RATE_LIMIT_MAX`.
- Admin search/payment/rollup actions require admin or moderator roles as appropriate.
- Important repair/review actions write audit logs.

## Sprint 6 Starting Points

## Sprint 7 Starting Points

- Prelaunch testing and QA automation
- Performance tuning from real load patterns
- Real payment provider rollout
- Stronger automated alerts and ops runbooks
- Consumer frontend polish and conversion optimization
- Optional internal AI-assisted ops tooling
