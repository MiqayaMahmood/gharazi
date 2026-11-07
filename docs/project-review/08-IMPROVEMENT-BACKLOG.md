# Improvement Backlog

These are recommendations only. They are not implementation approvals. Priorities reflect risk and platform coherence, not a committed roadmap.

Priority: **P0** immediate security/availability, **P1** next phase, **P2** valuable follow-up, **P3** optional/strategic. Complexity: **S** small, **M** medium, **L** large, **XL** multi-stream.

“Existing impact” indicates whether the change alters a current user/operator flow and therefore needs migration, compatibility, rollout, or retraining planning.

## GUI / UX

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| UX-01 | Run responsive, keyboard, screen-reader, and contrast QA on core journeys; record baselines | P1 | M | Test environment, representative devices | No; assessment first |
| UX-02 | Correct card normalization: hide invalid zero dimensions, clamp/clean excerpts, handle missing media | P1 | S | Data rules/product wording | Yes; presentation only |
| UX-03 | Align verification badges with precise meanings (identity, listing review, legal approval) | P1 | M | Trust policy, content/legal review | Yes; labels and filters |
| UX-04 | Replace dead social/tool links or label unavailable destinations consistently | P1 | S | Owner URLs/tool decisions | Yes; navigation |
| UX-05 | Group admin navigation into job-based sections and add quick search | P2 | M | Operator interviews | Yes; admin IA |
| UX-06 | Make dashboard navigation role/task-aware and mobile-collapsible | P2 | M | Role policy | Yes; dashboard IA |
| UX-07 | Add accessible focus management, Escape handling, reduced motion, and ARIA error associations | P1 | M | Accessibility test tooling | Yes; interaction details |
| UX-08 | Measure homepage module engagement and simplify low-value sections | P2 | M | Privacy-safe analytics | Yes; homepage order |

## Functional enhancements

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| FUN-01 | Complete real email/SMS/push notification delivery with preferences and delivery status | P1 | L | Provider choices, consent, templates | Yes; activates promised alerts |
| FUN-02 | Implement saved-search matching, deduplication, cadence, and unsubscribe controls | P1 | L | Notification delivery, search consistency | Yes |
| FUN-03 | Define and implement account/data export and deletion lifecycle | P1 | L | Legal/retention policy | Yes; data lifecycle |
| FUN-04 | Decide whether internal CMS or WordPress owns each content type; remove duplicate operator paths | P1 | M | Editorial owner decision | Yes; content workflow |
| FUN-05 | Add real map provider/search only after privacy, cost, and geocoding decisions | P2 | L | Map vendor, location policy | Yes; replaces placeholders |
| FUN-06 | Build only validated smart tools (unit converter/calculators/trends) with audited formulas/data | P3 | L | Product/data owners | No until launched |

## Property advertisement management

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| LIST-01 | Decide and implement a coherent publication/moderation state machine | P1 | L | Owner trust/SLA decision, data migration | Yes; central lifecycle |
| LIST-02 | Enforce expiry, notify before expiry, and define refresh/renewal behavior | P1 | M | Scheduler/worker reliability, product policy | Yes; inventory visibility |
| LIST-03 | Redesign media flow: create draft first, direct uploads, progress/retry, ordering, single cover, delete | P1 | L | S3 controls, media finalize API | Yes; authoring flow |
| LIST-04 | Add content/size/dimension scanning and orphan-object cleanup | P1 | L | Storage/event/scanner architecture | Yes; upload pipeline |
| LIST-05 | Expose the intended backend field set consistently in create/edit/review | P2 | M | Field/product definitions | Yes; forms |
| LIST-06 | Define reversible delete/restore and permanent retention policy | P2 | M | Legal/retention decision | Yes |
| LIST-07 | Add draft autosave and resumable multi-step authoring | P2 | M | Stable draft API | Yes |
| LIST-08 | Add listing-quality rules and operator-visible validation reasons | P2 | L | Moderation policy, analytics | Yes |

## Search and discovery

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| SRCH-01 | Establish index freshness SLOs, reconciliation, dead-letter alerts, and degraded-mode UI | P1 | L | Worker observability | Yes; failure behavior |
| SRCH-02 | Benchmark production-like PostgreSQL fallback and add text/geo indexes only from evidence | P1 | M | Sanitized dataset/query plans | Potential DB migration |
| SRCH-03 | Add applied-filter chips, clear-all, result feedback, and mobile/back-state usability tests | P2 | M | UX tests | Yes; search UI |
| SRCH-04 | Cap API result sizes and paginate all public/admin lists consistently | P1 | M | API compatibility plan | Yes; response contracts |
| SRCH-05 | Split sitemap into indexes/chunks with cached, monitored generation | P1 | M | SEO owner, cache/storage | Yes; SEO infrastructure |
| SRCH-06 | Build promoted/profile/location feeds only with transparent ranking labels | P2 | L | Commercial policy/data endpoints | Yes; ranking |

## User experience

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| USER-01 | Replace mock OTP with production delivery and clear fallback/login recovery | P0 | L | SMS provider, abuse controls | Yes; authentication |
| USER-02 | Add email verification and decide which actions require verified email/phone | P1 | M | Email provider, policy | Yes; onboarding/action gates |
| USER-03 | Consolidate favorites/bookmarks terminology and scope | P2 | S | Product decision | Yes; IA/copy |
| USER-04 | Add notification/preferences center with channel/cadence controls | P1 | M | Delivery system | Yes |
| USER-05 | Improve inquiry/chat safety, reporting, blocking, and attachment policy | P1 | L | Trust policy, moderation | Yes |
| USER-06 | Add pagination/history retention for chats, inquiries, notifications, and saves | P2 | M | API pagination | Yes |

## Administration

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| ADM-01 | Formalize role matrix; restrict admin creation/role grants and sensitive operations | P0 | M | Owner security decision | Yes; permissions |
| ADM-02 | Add taxonomy and geography admin CRUD with audit, validation, deactivation, and impact previews | P1 | L | Data governance | Yes; reference operations |
| ADM-03 | Add paginated, purpose-built moderation queues with bulk-safe actions and reasons | P1 | L | State-machine policy | Yes |
| ADM-04 | Retire or tightly restrict legacy `/adminpage` and static `apps/admin` fallback | P1 | S/M | Operator confirmation | Yes; entry points |
| ADM-05 | Align frontend access with admin/moderator/support backend permissions | P1 | M | Role matrix | Yes |
| ADM-06 | Add protected exports with minimization, audit, expiry, and row limits | P2 | L | Privacy policy | Yes |

## Commercial features

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| COM-01 | Verify Stripe configuration/webhooks/idempotency/reconciliation in staging before selling packages | P0 | M | Stripe test account, owner package decisions | No production activation until verified |
| COM-02 | Reconcile public advertising copy/prices with server package catalog and entitlements | P1 | M | Commercial owner | Yes; package presentation |
| COM-03 | Enforce subscription/promotion entitlements and quotas server-side | P1 | L | Plan matrix, lifecycle workers | Yes; account limits |
| COM-04 | Add invoices/refunds/disputes/tax/accounting operating procedures | P1 | L | Legal/finance/payment decisions | Yes |
| COM-05 | Add transparent sponsored-ranking labels and placement reports | P1 | M | Ranking policy, analytics | Yes |
| COM-06 | Add agency teams/permissions/lead assignment only after core RBAC/session work | P2 | XL | Secure RBAC, professional model decision | Yes |

## Technical quality

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| TQ-01 | Fix Jest reflect-metadata bootstrap and make all current suites green | P0 | S | None | No |
| TQ-02 | Add frontend lint script covering TS/TSX and remove the current root-glob gap | P1 | S | ESLint config alignment | No |
| TQ-03 | Add integration/E2E tests for authz, listing state, search fallback, uploads, Stripe, admin, and core journeys | P1 | L | Test DB/Redis/ES/Stripe fixtures | No |
| TQ-04 | Add accessibility and performance budgets to CI | P2 | M | Browser runner/staging | No |
| TQ-05 | Centralize status/state constants and transition tests; later add DB checks via approved migration | P1 | L | State decisions/migration approval | Yes |
| TQ-06 | Resolve dual lockfiles/workspace-root warning and pin runtime/tool versions | P1 | M | Dependency strategy | Build behavior only |
| TQ-07 | Standardize pagination, filtering, DTOs, error codes, and API versioning policy | P2 | L | Compatibility strategy | Yes; API contracts |
| TQ-08 | Replace regex HTML sanitizer with maintained allowlist sanitizer and XSS tests | P0 | M | Package/security review | Yes; content rendering |

## Security and operations

| ID | Recommendation | Priority | Complexity | Dependencies | Existing impact |
|---|---|---:|---:|---|---|
| SECOPS-01 | Enforce server-side session revocation, active user status, and fresh sensitive roles | P0 | L | Auth design, schema/token migration | Yes; all authenticated sessions |
| SECOPS-02 | Disable or secure WebSocket chat with JWT, participant checks, explicit origins, tests | P0 | M/L | Socket client integration | Yes if real-time used |
| SECOPS-03 | Move away from long-lived localStorage tokens and deploy CSP | P1 | L | CSRF/session design | Yes; login/session behavior |
| SECOPS-04 | Protect detailed health endpoints; expose minimal liveness/readiness only | P0 | S | Railway health config | Yes; monitoring URLs |
| SECOPS-05 | Use distributed, route-specific auth/OTP/intake/analytics rate limits | P1 | M | Redis-backed throttler, risk policy | Yes |
| SECOPS-06 | Add production-safe logging rules and block OTP/reset-token fallback logging | P0 | S/M | Provider readiness | Yes; startup/logging |
| SECOPS-07 | Add least-privilege service/database/storage roles, rotation, and secret scanning | P1 | M | Dashboard access, security owner | Infrastructure only |
| SECOPS-08 | Define CI/CD, migration gate, staging smoke tests, rollback, and deployment manifests | P1 | L | Hosting owner/access | Release process |
| SECOPS-09 | Add backups/PITR restore drills, queue/worker/index recovery runbooks, and alert thresholds | P1 | L | Provider plans, on-call owner | Operations |
| SECOPS-10 | Establish personal-data retention, masking, access audit, and incident response | P1 | L | Legal/privacy owner | Yes; data operations |

## Suggested sequencing

1. **Security closure:** SECOPS-01/02/04/06, USER-01, ADM-01, TQ-01/08.
2. **Truthful lifecycle:** LIST-01/02/03, FUN-01/02, SRCH-01, COM-01/02.
3. **Operational baseline:** TQ-02/03, SECOPS-05/07/08/09, pagination and monitoring.
4. **UX consolidation:** UX-02/03/05/06/07, USER-03/04, search ergonomics.
5. **Growth features:** entitlements, promoted feeds, teams/CRM, maps, and smart tools only after the secure baseline is stable.

