# Executive Summary

## 1. What Gharazi currently does

Gharazi is a live Pakistan real-estate marketplace for property sales, rentals, and developer projects. The public product supports search/filtering, SEO landing/detail pages, listing/project comparison, blog guides, legal/trust content, feedback, and newsletter signup. Registered users can manage profiles, listings/projects, favorites, saved searches, inquiries, chat, and notifications. Professional and admin surfaces support business profiles, moderation, users, reports, verification, submissions, payments, promotions, subscriptions, analytics, system health, risk, and search operations.

The production homepage was observed returning live listing content and the expected public navigation/discovery surfaces. Authenticated and provider-backed production workflows were not exercised.

## 2. Architecture summary

- Single TypeScript monorepo.
- Next.js 15/React 19 frontend and integrated admin UI on Vercel.
- NestJS modular-monolith API plus separate BullMQ worker on Railway.
- Supabase PostgreSQL accessed only through Prisma; the frontend has no direct database/Supabase client access.
- Redis supports OTP state, queues, and worker heartbeat; Elasticsearch provides discovery with PostgreSQL fallback.
- S3-compatible storage handles direct media uploads; Stripe handles Checkout/webhooks; Resend handles password reset; WordPress is the public blog source.
- JWT bearer authentication supports email/password and mocked phone OTP; roles are embedded in tokens.

## 3. What is implemented

The repository contains substantial, coherent implementations for:

- public marketplace pages, search, filters, sorting, detail, gallery, compare, SEO, sitemap, and structured data;
- account registration/login/recovery, profiles, dashboard, RBAC scaffolding;
- listing and project create/edit/publish/archive, media metadata, units/updates, ownership checks;
- favorites, saved searches, inquiries, 1:1 chat persistence, in-app notifications, reporting and verification;
- broad administration, audit, submissions, analytics, risk, search operations, and health;
- subscription/promotion models and Stripe Checkout/webhook paths;
- queues, recurring jobs, structured logs, system events, optional OpenTelemetry.

Static verification was generally positive: root TypeScript ESLint passed, frontend TypeScript passed, and the Next.js production build generated 69 routes successfully.

## 4. What is incomplete or unverified

- OTP is not delivered by SMS; it is logged.
- Saved-search matching and external notification delivery are worker TODOs.
- Listing expiry is stored but not automatically enforced; renewal behavior is incomplete.
- User publication makes listings public before admin moderation.
- New-listing media upload is awkward/incomplete; secure size/content scanning and lifecycle management are absent.
- Real-time chat authorization is absent at the WebSocket layer.
- Mandatory email verification, public professional profiles, teams/CRM, taxonomy/location admin, account deletion/export, interactive maps, and advertised smart tools are absent or partial.
- Commercial code exists, but Stripe/prices/webhooks/entitlements were not production-verified.
- Railway, Vercel, Supabase, Redis, Elasticsearch, S3, Resend, and observability dashboards/settings were not accessible in this repository-only review.

## 5. Main technical, security, and UX concerns

Highest-priority confirmed risks:

1. Session revocation, logout, password changes, suspension, and role removal do not invalidate existing JWTs.
2. Socket.IO chat allows unauthenticated, unauthorized room joins with permissive CORS.
3. OTP and reset-link provider fallbacks can log sensitive authentication material.
4. WordPress HTML is rendered with `dangerouslySetInnerHTML` after a regex blacklist rather than a robust allowlist sanitizer.
5. Moderators can reach admin creation/role-management endpoints under the current class-level policy.

Other important concerns include public detailed health endpoints, upload size/content controls, stale/expired inventory, generic/process-local rate limiting, sparse tests, dual CMS concepts, async search consistency, sitemap fan-out, unpaginated admin/history paths, and undefined personal-data retention.

UX is broad and thoughtfully structured, but evidence is code/semantic rather than visual. The most concrete production/content issues are invalid-looking card values (`0 Marla`), description bleed into metadata, static/premium-ready agency presentation, dead social links, placeholder maps/tools, and conflicting publication/moderation copy. The seller media flow and dense dashboard/admin navigation deserve focused usability work before a broad visual rebuild.

## 6. Recommended priorities

### Immediate secure baseline

- Enforce active sessions/users/fresh sensitive roles for every protected request.
- Disable or secure the chat gateway with JWT, participant checks, and explicit origins.
- Remove production auth-secret logging; integrate real OTP delivery.
- Protect detailed health endpoints, strengthen distributed route-specific limits, and replace regex HTML sanitization.
- Fix the failing Jest bootstrap and establish CI security/regression gates.

### Next functional baseline

- Decide the publication/moderation state machine and enforce listing expiry/renewal.
- Complete seller-friendly, verified media upload management.
- Complete notifications and saved-search alerts.
- Verify Stripe end-to-end in staging and enforce package entitlements server-side.
- Add pagination, search/index reconciliation, and production observability/runbooks.

### Then improve experience/growth

- Correct card/data presentation and verify core journeys on mobile/tablet/desktop with accessibility tooling.
- Simplify role-aware dashboard/admin information architecture.
- Resolve WordPress/internal CMS ownership and taxonomy/location operations.
- Add maps, teams/CRM, promoted feeds, and decision tools only after the secure operational baseline is stable.

## 7. Items requiring owner decisions

- Is moderation pre-publication, post-publication, or optional verification?
- What do “verified” labels legally and operationally mean?
- Which roles may create admins, assign roles, reconcile payments, repair data, and manage commercial inventory?
- What are listing expiry, renewal, deletion, and sold/rented retention rules?
- Which CMS is authoritative, and who owns editorial operations?
- Which OTP/email/storage/payment providers and countries/consent rules are approved?
- Which packages, prices, entitlements, refunds, taxes, and sponsored-ranking rules are approved?
- What personal-data retention, export, deletion, moderation, and incident-response policies apply?
- Are real-time chat, public professional pages, maps, smart tools, teams, and CRM in the next phase or explicitly deferred?

## 8. Suggested next development phase

Run a **Security and Lifecycle Closure** phase before feature expansion:

1. session/JWT/WebSocket/auth hardening;
2. safe provider/logging/health/rate-limit configuration;
3. publication, moderation, expiry, and media state-machine completion;
4. notification/saved-search worker completion;
5. green CI with authorization, lifecycle, payment, upload, and core E2E tests;
6. staging verification of Railway/Vercel/Supabase/Redis/Elasticsearch/Stripe/S3/Resend configuration;
7. targeted mobile/accessibility UX remediation using measured findings.

This phase should preserve the modular-monolith architecture. The repository does not justify an architectural rewrite; the best return is to close security and lifecycle gaps in the existing boundaries.

## Completion status

**COMPLETE for repository-based discovery and documentation.**

The assessment is intentionally **partial for production runtime verification** because deployment dashboards, private/provider configuration, authenticated accounts, and production data were out of scope and not accessed. No application enhancement, refactor, migration, deployment, or production mutation was performed.

