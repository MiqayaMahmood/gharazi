# Security and Technical Risks

## Severity scale

- **Critical**: likely broad compromise or irreversible impact; immediate containment.
- **High**: credible unauthorized access/data exposure or core control failure; prioritize before expansion.
- **Medium**: meaningful reliability, integrity, privacy, performance, or maintainability risk.
- **Low**: limited impact, hygiene, or defense-in-depth issue.

No production penetration testing was performed. “Confirmed” means the risky behavior is directly visible in code; “requires verification” means impact depends on deployment/runtime configuration.

## Priority findings

| ID | Severity | Confidence | Finding | Impact | Evidence | Recommended next step |
|---|---|---|---|---|---|---|
| SEC-01 | High | Confirmed | JWT revocation is not enforced | Logout, password reset/change, suspension, and session revocation do not invalidate an issued token for up to its expiry (default 7 days). | `AuthService` revokes `Session`; `JwtStrategy.validate` trusts signed claims without DB/session/status lookup. | Add token/session ID and enforce active, unrevoked session plus active user; shorten access token and introduce refresh rotation. |
| SEC-02 | High | Confirmed | Chat WebSocket room join is unauthenticated and unauthorized | Any socket client that learns/guesses a chat UUID can join its room and receive newly emitted messages. Permissive Socket.IO CORS broadens reach. | `chat.gateway.ts`: `cors: true`, `join_chat` directly joins `chat:${chatId}`; no guard/participant query. | Disable gateway until JWT handshake plus participant authorization and explicit origin policy are implemented and tested. |
| SEC-03 | High | Confirmed | OTP codes are logged and no SMS provider exists | Anyone with production log access could use live OTPs; users cannot reliably receive codes. | `OtpService.createOtp` logs phone and OTP; TODO says replace with SMS. | Ensure production startup rejects mock OTP mode, integrate an approved provider, redact identifiers, and add abuse monitoring. |
| SEC-04 | High | Confirmed | JWT role/status claims remain stale | Removed admin roles or suspended/deleted users retain old permissions until token expiry; OTP verification can set an existing user back to `ACTIVE`. | Role claims embedded in JWT; strategy performs no user lookup; `verifyOtp` upsert updates status to active. | Revalidate sensitive admin requests or use token version/session lookup; never reactivate suspended/deleted users through OTP. |
| SEC-05 | High | Confirmed, exploitability requires testing | WordPress HTML uses a regex sanitizer before `dangerouslySetInnerHTML` | Regex blacklisting is not a robust HTML parser/allowlist; crafted post/comment markup or compromised WordPress may enable stored XSS. | `wordpress/normalizers.ts` regex replacements; blog detail/comments use `dangerouslySetInnerHTML`. | Replace with a maintained allowlist sanitizer on the server, test XSS payload corpus, add CSP, and treat WordPress content as untrusted. |
| SEC-06 | Medium | Confirmed | Detailed health endpoints are public | Exposes queue names/counts, search aliases/counts, dependency status, timing and sanitized error detail; can assist reconnaissance and cause expensive probes. | `/health/dependencies`, `/health/queues`, `/health/search` have no guards. | Keep liveness minimal/public; require admin or network controls for detailed probes and rate-limit separately. |
| SEC-07 | Medium | Confirmed | Media presign lacks byte-size/content verification | A user can upload oversized or content-mismatched objects under an allowed MIME header, increasing storage/cost and content-abuse risk. | `S3_UPLOAD_MAX_MB` is validated but unused; signature covers content-type, not length; no post-upload scan/head validation. | Enforce size in signed policy or controlled upload, validate magic bytes/dimensions, scan, quarantine, and finalize metadata only after verification. |
| SEC-08 | Medium | Confirmed | Bearer token stored in browser localStorage | Any successful XSS can exfiltrate a seven-day account/admin token. | `apps/web/lib/api/client.ts` uses `localStorage`. | After resolving CSRF design, prefer secure HttpOnly SameSite cookies or a short-lived in-memory access token with rotated refresh cookie; deploy CSP. |
| SEC-09 | Medium | Confirmed | Moderation is not a publication gate | Owners/managers can directly make a draft public and searchable; admin approval only changes verification status or rejects later. | `ListingsService.publish` transitions to `active`; admin approval is separate. | Owner decision: implement pre-publication review, post-publication review SLA, or clear “unverified” policy with automated controls. |
| SEC-10 | Medium | Confirmed | Listing expiry is not enforced | Expired inventory can remain publicly visible/searchable indefinitely, undermining freshness claims. | `expiresAt` set on publish; public reads/search do not filter it; no expiry job; refresh does not extend it. | Add explicit expiry transition/index removal and renewal policy with idempotent scheduled processing. |
| SEC-11 | Medium | Confirmed | Moderators can create admin accounts and manage roles | Class-level `admin, moderator` guard covers `users/create-admin` and role mutation routes, enabling privilege escalation if moderator is intended to be lower trust. | `AdminOperationsController`; no narrower decorator on these routes. | Confirm role policy; restrict admin creation/admin-role assignment to admin/super-admin and prevent self-escalation/last-admin removal. |
| SEC-12 | Medium | Confirmed | Global throttling is generic and likely process-local | Auth, OTP, reset, analytics, newsletter, submissions and search share one default; multiple Railway replicas may multiply limits. OTP has only phone-based attempts and no IP/device request control. | `ThrottlerModule` default store; OTP TODO acknowledges IP/device gap. | Use shared Redis-backed limits, stricter route policies, CAPTCHA/risk signals, and response-shape monitoring. |
| SEC-13 | Medium | Confirmed | Build-time external failures become empty data | Deployment can succeed with incomplete sitemap/blog/inventory after network/provider failure, reducing SEO coverage without a failing gate. | Sitemap catches all provider calls to empty arrays; sandboxed build logged fetch failures yet succeeded. | Emit structured build warnings/metrics and define which external failures should fail staging/production release. |
| SEC-14 | Medium | Confirmed | Worker functionality is incomplete | Saved-search alerts, email/SMS/push delivery, and subscription expiry behavior are TODOs while UI/data models imply availability. | Worker processors contain explicit TODOs. | Label unavailable capabilities, implement provider-independent contracts/tests, then activate gradually. |
| SEC-15 | Medium | Confirmed | Automated test coverage is sparse and one suite cannot initialize | Security/state regressions across a large API surface may pass unnoticed. | Seven backend suites only; one fails due missing reflect metadata; no frontend/E2E/accessibility tests. | Fix test bootstrap, add controller/authz/state-machine/webhook/upload/E2E tests and CI gates. |

## Additional findings

| ID | Severity | Finding | Evidence/impact | Recommendation |
|---|---|---|---|---|
| TECH-01 | Medium | Status fields are free-form strings | Invalid transitions/vocabulary can enter the database; listing/project states are not centrally modeled. | Introduce application-level state-machine constants and DB checks in a separately approved migration. |
| TECH-02 | Medium | Taxonomy/geography lack admin CRUD | Operational changes require seed/manual database work, increasing production-change risk. | Add governed admin workflows, validation, audit, and safe deactivation rather than deletion. |
| TECH-03 | Medium | Internal CMS and WordPress overlap | Operators may edit content that the public site never reads; duplicated ownership and APIs. | Decide one source of truth per content type and retire/hide the unused path. |
| TECH-04 | Medium | Public analytics ingestion can be abused | Unauthenticated event rows/counter updates can be spammed despite generic rate limits. | Add signed/session identifiers, stronger idempotency, bot filtering, sampling, retention, and anomaly limits. |
| TECH-05 | Medium | Search consistency is asynchronous | Publish/update can succeed before indexing; queue/worker outages produce stale results, while DB fallback behavior differs. | Define consistency SLA, retry/dead-letter alerts, reconciliation, and visible degraded status. |
| TECH-06 | Medium | Search fallback lacks dedicated text/geo indexes | At scale, wildcard/text and coordinate filters can become slow. | Benchmark real queries; add trigram/full-text/PostGIS only from measured need. |
| TECH-07 | Medium | Dynamic sitemap can fan out heavily | Up to 500 pages × 100 for both inventory types plus per-city area calls can stress API/build/runtime and approaches sitemap limits. | Use sitemap indexes/chunks, bounded concurrency, cached DB export, and failure telemetry. |
| TECH-08 | Medium | No repository deployment automation/config | Release commands, health checks, migration order, and rollback depend on dashboard/manual knowledge. | Add reviewed IaC/manifests and CI/CD with migration and smoke-test gates. |
| TECH-09 | Low/Medium | No database RLS | A compromised/misconfigured server credential has broad access; no defense-in-depth for authorization bugs. | Use least-privilege database roles; assess RLS selectively if direct/multi-client access is introduced. |
| TECH-10 | Medium | Sensitive fallback logging | Password-reset URL includes bearer token and destination email when Resend is absent; OTP logs phone/code. | Hard-fail unsafe provider fallbacks in production and redact structured logs. |
| TECH-11 | Low | Newsletter unsubscribe lacks DTO validation | Raw `email` body property bypasses normal email validation. | Add a DTO and non-enumerating/idempotent response. |
| TECH-12 | Low/Medium | Generic admin lists may be unpaginated | Large users/listings/payments/audit datasets can slow API and browser, and broaden data exposure per request. | Add server pagination, bounded filters, field minimization, and export controls. |
| TECH-13 | Medium | Personal/contact data governance is undefined | Profiles, inquiries, chat, submissions, newsletter, and contact fields contain personal data; retention/export/deletion is absent. | Define consent, retention, subject-access/deletion, admin masking, and audit policies with counsel. |
| TECH-14 | Low | Dependency/build configuration drift | Root and web use separate lockfiles and differing Next version declarations; Next warns about inferred workspace root. | Choose one workspace dependency strategy and pin/runtime-test it before upgrades. |
| TECH-15 | Medium | No listing delete/account deletion flow | Soft-delete columns exist but no owner workflow, affecting privacy and operational cleanup. | Define reversible archive, deletion, retention, and legal-hold behavior before implementation. |

## Positive controls observed

- Passwords use bcrypt cost 12; reset tokens are random, hashed, expiring, and single-use.
- Stripe webhook requires raw body and signature; checkout validates entity ownership.
- Listing/project mutations generally scope by owner/manager/developer and soft-delete state.
- REST chat methods verify participant membership.
- DTO whitelisting and unknown-field rejection are global.
- CORS for HTTP is an explicit list; Helmet is enabled.
- Prisma parameterized queries dominate data access.
- S3 presign checks entity ownership, uses short expiry, sanitizes keys, and allowlists MIME types.
- Public listing mapping avoids returning direct contact/address; contact is a protected separate call.
- Admin actions commonly create audit logs and notifications.
- Unexpected production exceptions are filtered and request IDs support correlation.

## Verification priorities

1. In a non-production environment, prove whether revoked/suspended/role-changed JWTs still authorize requests and immediately close the gap.
2. Prove unauthorized Socket.IO room subscription and disable or secure the gateway.
3. Run an XSS corpus against WordPress post/comment normalization and deploy a proper sanitizer/CSP.
4. Inspect production settings read-only: mock OTP/fallback flags, CORS, secrets, Stripe webhook, S3 policy, Redis TLS, Elasticsearch auth, provider fallbacks.
5. Threat-model listing publication, moderation, personal-data retention, and commercial entitlements with product owners.

