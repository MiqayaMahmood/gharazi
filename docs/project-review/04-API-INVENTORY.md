# API Inventory

## Conventions

The NestJS API has no global prefix and no versioned URL namespace. Swagger is served at `/docs` and describes version `0.1.0`.

Unless noted otherwise:

- body/query DTOs use global `ValidationPipe` transformation, whitelisting, and rejection of unknown fields;
- errors pass through `ApiExceptionFilter`, which returns a consistent timestamp/path/request ID/status payload and hides unexpected production details;
- `JWT` means `Authorization: Bearer <token>` through `JwtAuthGuard`;
- `RBAC` means JWT plus `RolesGuard` and `@RequireRoles`;
- ownership/participant checks are service-level and are identified in the purpose column;
- Prisma parameterizes normal queries; the only raw query found is a tagged-template `SELECT 1` health probe.

Global API protections: Helmet, explicit CORS allowlist, credentials enabled, and global throttling (default 120 requests per 60 seconds). There are no route-specific upload byte limits; the upload endpoint returns a signed direct-to-storage PUT rather than accepting multipart content.

## Authentication and users

| Method | Route | Auth | Purpose / validation | Service and entities |
|---|---|---|---|---|
| POST | `/auth/request-otp` | Public | Validate/normalize phone; create Redis OTP | `AuthService`, `OtpService`, Redis |
| POST | `/auth/verify-otp` | Public | Validate phone/OTP; upsert user and issue JWT | `AuthService`; `User`, `UserProfile`, `UserRole`, `Session` |
| POST | `/auth/register` | Public | Email, phone, 8–100 char password, allowed public role | `AuthService`; identity tables |
| POST | `/auth/login/email` | Public | Email/password login; active users only | `AuthService`; `User`, `Session` |
| POST | `/auth/forgot-password` | Public | Email; non-enumerating response; email reset link | `AuthService`; `PasswordResetToken`, Resend |
| POST | `/auth/reset-password` | Public | Token plus 8–100 char password | `AuthService`; reset/session/user tables |
| POST | `/auth/logout` | JWT | Mark all user session rows revoked | `AuthService`; `Session` |
| POST | `/auth/change-password` | JWT | Current/new password | `AuthService`; `User`, `Session` |
| GET | `/auth/me` | JWT | Current identity/profile/roles | `AuthService`; `User` relations |
| GET | `/users/me` | JWT | Current profile | `UsersService`; `User`, `UserProfile` |
| PATCH | `/users/me` | JWT | Update permitted profile fields | `UsersService`; `UserProfile` |

## Reference data, discovery, and public statistics

| Method | Route | Auth | Purpose / validation | Service and entities |
|---|---|---|---|---|
| GET | `/locations/cities` | Public | Active city list | `LocationsService`; `City` |
| GET | `/locations/areas?cityId=` | Public | Area list, optionally by city | `LocationsService`; `Area` |
| GET | `/locations/areas/:id` | Public | Area detail | `LocationsService`; `Area`, `City` |
| GET | `/taxonomy/property-types` | Public | Active property types | `TaxonomyService`; `PropertyType` |
| GET | `/taxonomy/purposes` | Public | Sale/rent purposes | `TaxonomyService`; `ListingPurpose` |
| GET | `/taxonomy/amenities` | Public | Amenity definitions | `TaxonomyService`; `AmenityDefinition` |
| GET | `/search/listings` | Public | Validated listing search/filter/geo/sort/pagination | `SearchService`; Elasticsearch or Prisma listing graph |
| GET | `/search/projects` | Public | Validated project search/filter/geo/sort/pagination | `SearchService`; Elasticsearch or Prisma project graph |
| GET | `/search/areas/autocomplete?q=` | Public | Area autocomplete | `SearchService`; Elasticsearch/Prisma `Area` |
| GET | `/search/listings/:id/similar` | Public | Similar active listings | `SearchService`; listing index/DB |
| GET | `/search/projects/:id/similar` | Public | Similar active projects | `SearchService`; project index/DB |
| GET | `/analytics/listings/:id/summary` | JWT | Owner/manager-only listing analytics summary | `AnalyticsService`; `Listing`, daily stats |
| GET | `/analytics/projects/:id/summary` | JWT | Developer-owner-only project analytics summary | `AnalyticsService`; `Project`, daily stats |
| POST | `/analytics/events` | Public | Record validated analytics event/idempotency key | `AnalyticsService`; `AnalyticsEvent`, counters |
| GET | `/stats/popular` | Public | Popular entities by type/purpose/period/limit | `AnalyticsService`; events/daily stats |
| GET | `/stats/entity/:entityType/:entityId` | Public | Entity-level public stats | `AnalyticsService`; stats/entity tables |

## Listings and projects

| Method | Route | Auth | Purpose / authorization | Service and entities |
|---|---|---|---|---|
| POST | `/listings` | JWT | Create owned draft; validated taxonomy/attributes | `ListingsService`; `Listing`, amenities/history |
| POST | `/listings/batch` | Public | Hydrate public listings for comparison; bounded ID DTO | `ListingsService`; `Listing` graph |
| GET | `/listings/me` | JWT | Owner/manager inventory | `ListingsService`; `Listing` graph |
| GET | `/listings/me/:id` | JWT | Private draft/detail; owner/manager only | `ListingsService`; `Listing` graph |
| PATCH | `/listings/:id` | JWT | Update owner/manager listing | `ListingsService`; listing/amenity graph |
| POST | `/listings/:id/publish` | JWT | Validate required fields; owner/manager makes active and indexes | `ListingsService`; listing/history, BullMQ |
| POST | `/listings/:id/archive` | JWT | Owner/manager or admin/moderator archive | `ListingsService`; listing/history/index |
| POST | `/listings/:id/refresh` | JWT | Owner/manager or admin/moderator refresh timestamp | `ListingsService`; `Listing`, index |
| POST | `/listings/:id/mark-sold` | JWT | Owner/manager or admin/moderator lifecycle transition | `ListingsService`; listing/history/index |
| POST | `/listings/:id/mark-rented` | JWT | Same for rented state | `ListingsService`; listing/history/index |
| GET | `/listings/:id/owner-summary` | JWT | Ownership/admin check; performance/lead summary | `ListingsService`; stats/favorites/inquiries/chats |
| GET | `/listings/:id/viewer-context` | JWT | Return owner/manager/admin capabilities | `ListingsService`; `Listing` |
| POST | `/listings/:id/media` | JWT | Owner/manager adds validated metadata | `ListingsService`; `ListingMedia` |
| GET | `/listings/:id/contact` | JWT | Contact for public-status listing | `ListingsService`; selected listing contact fields |
| GET | `/listings/:publicId` | Public | Public active/sold/rented detail, mapped to safe fields | `ListingsService`; listing graph |
| POST | `/projects` | JWT | Create draft for user's developer profile | `ProjectsService`; project graph |
| POST | `/projects/batch` | Public | Hydrate active projects for comparison | `ProjectsService`; project graph |
| GET | `/projects/me` | JWT | Developer-owned projects | `ProjectsService`; `Developer`, `Project` |
| PATCH | `/projects/:id` | JWT | Developer-owner update | `ProjectsService`; project graph |
| POST | `/projects/:id/publish` | JWT | Developer-owner makes active and indexes | `ProjectsService`; `Project`, BullMQ |
| POST | `/projects/:id/archive` | JWT | Developer-owner or admin/moderator archive | `ProjectsService`; project/index |
| GET | `/projects/:id/owner-summary` | JWT | Owner/admin performance summary | `ProjectsService`; stats/engagement |
| GET | `/projects/:id/viewer-context` | JWT | Project management capabilities | `ProjectsService`; `Project`, `Developer` |
| POST | `/projects/:id/units` | JWT | Developer-owner add validated unit | `ProjectsService`; `ProjectUnit` |
| PATCH | `/projects/:id/units/:unitId` | JWT | Developer-owner update unit | `ProjectsService`; `ProjectUnit` |
| POST | `/projects/:id/media` | JWT | Developer-owner add media metadata | `ProjectsService`; `ProjectMedia` |
| POST | `/projects/:id/updates` | JWT | Developer-owner add progress update | `ProjectsService`; `ProjectUpdate` |
| GET | `/projects/:slug` | Public | Active project detail | `ProjectsService`; project graph |
| POST | `/developers/profile` | JWT | Create developer profile | `DevelopersService`; `Developer` |
| PATCH | `/developers/profile` | JWT | Owner update developer profile | `DevelopersService`; `Developer` |
| GET | `/developers/me` | JWT | Current developer profile | `DevelopersService`; `Developer` |
| GET | `/developers/:slug` | Public | Public developer detail | `DevelopersService`; `Developer` |
| POST | `/media/presign-upload` | JWT | MIME allowlist and listing/project ownership; return 15-minute PUT URL | `MediaService`; entity check, S3 signing |

## Engagement, leads, chat, and notifications

| Method | Route | Auth | Purpose / authorization | Service and entities |
|---|---|---|---|---|
| POST | `/favorites` | JWT | Save supported entity; prevent duplicates | `FavoritesService`; `Favorite` plus hydration targets |
| DELETE | `/favorites` | JWT | Remove caller's favorite | `FavoritesService`; `Favorite` |
| GET | `/favorites?entityType=` | JWT | Caller favorites, optionally filtered | `FavoritesService`; favorites/entities |
| POST | `/saved-searches` | JWT | Create validated search/alert definition | `SavedSearchesService`; `SavedSearch` |
| PATCH | `/saved-searches/:id` | JWT | Update caller-owned saved search | `SavedSearchesService`; `SavedSearch` |
| DELETE | `/saved-searches/:id` | JWT | Delete caller-owned saved search | `SavedSearchesService`; `SavedSearch` |
| GET | `/saved-searches` | JWT | List caller searches | `SavedSearchesService`; `SavedSearch` |
| POST | `/inquiries` | JWT | Create listing/project inquiry and recipient/chat | `InquiriesService`; `Inquiry`, `Chat`, notifications |
| GET | `/inquiries/me` | JWT | Buyer and recipient inquiry history | `InquiriesService`; `Inquiry` graph |
| PATCH | `/inquiries/:id/status` | JWT | Participant-only status change | `InquiriesService`; `Inquiry` |
| GET | `/chats` | JWT | Chats where caller is participant | `ChatService`; chat/participants/messages |
| GET | `/chats/:id/messages` | JWT | Participant-only messages; mark read | `ChatService`; chat/message/participant |
| POST | `/chats/:id/messages` | JWT | Participant-only message, notify and emit | `ChatService`; chat/message/notification |
| GET | `/notifications` | JWT | Caller notifications | `NotificationsService`; `Notification` |
| POST | `/notifications/:id/read` | JWT | Mark caller notification read | `NotificationsService`; `Notification` |
| POST | `/notifications/read-all` | JWT | Mark all caller notifications read | `NotificationsService`; `Notification` |
| POST | `/verification-requests` | JWT | Submit verification request | `VerificationService`; `VerificationRequest` |
| GET | `/verification-requests/me` | JWT | Caller verification history | `VerificationService`; `VerificationRequest` |
| POST | `/reports` | JWT | Report an entity with validated reason/details | `ModerationService`; `Report` |

### WebSocket boundary

Namespace `/chat` accepts `join_chat(chatId)` and emits `chat_message`. No handshake JWT validation or participant check exists, and gateway CORS is `true`. This is separate from the protected REST message APIs and is a confirmed authorization gap.

## Professional accounts

| Method | Route | Auth | Purpose / authorization | Service and entities |
|---|---|---|---|---|
| GET | `/professional/profile/me` | JWT | Current business profile | `ProfessionalService`; `ProfessionalProfile` |
| POST | `/professional/profile` | JWT | Create profile for eligible account | `ProfessionalService`; profile/user roles |
| PATCH | `/professional/profile` | JWT | Update caller profile | `ProfessionalService`; profile |
| POST | `/professional/profile/request-verification` | JWT | Submit company verification | `ProfessionalService`; profile/verification/notification |
| GET | `/professional/limits/me` | JWT | Derived package/account limits | `ProfessionalService`; profile/subscription |
| GET | `/professional/dashboard/summary` | JWT | Business dashboard summary | `ProfessionalService`; listing/project/lead aggregates |

## Public intake, newsletter, and CMS

| Method | Route | Auth | Purpose / validation | Service and entities |
|---|---|---|---|---|
| POST | `/feedback` | Public; optional bearer parsed by service | Store feedback | `SubmissionsService`; `InboundSubmission` |
| POST | `/contact` | Public; optional bearer | Store contact/advertising inquiry | `SubmissionsService`; `InboundSubmission` |
| POST | `/support-requests` | Public; optional bearer | Store support request | `SubmissionsService`; `InboundSubmission` |
| POST | `/newsletter/subscribe` | Public | Validate and upsert subscriber | `NewsletterService`; `NewsletterSubscriber` |
| POST | `/newsletter/unsubscribe` | Public | Unsubscribe by email; body property lacks a DTO wrapper | `NewsletterService`; `NewsletterSubscriber` |
| GET | `/cms/pages/:slug` | Public | Published CMS page | `CmsService`; `CmsPage` |
| GET | `/cms/blog-posts` | Public | Internal published posts | `CmsService`; `BlogPost` |
| GET | `/cms/blog-posts/:slug` | Public | Internal post detail | `CmsService`; `BlogPost` |
| POST | `/cms/pages` | RBAC admin/moderator | Create page DTO | `CmsService`; `CmsPage`, audit |
| PATCH | `/cms/pages/:id` | RBAC admin/moderator | Update page DTO | `CmsService`; `CmsPage`, audit |
| POST | `/cms/blog-posts` | RBAC admin/moderator | Create post DTO | `CmsService`; `BlogPost`, audit |
| PATCH | `/cms/blog-posts/:id` | RBAC admin/moderator | Update post DTO | `CmsService`; `BlogPost`, audit |

The production public blog uses WordPress rather than these internal blog endpoints.

## Commercial APIs

| Method | Route | Auth | Purpose / authorization | Service and entities |
|---|---|---|---|---|
| GET | `/payments/packages` | Public | Server package catalog | `PaymentsService`; code catalog |
| POST | `/payments/checkout` | JWT | Validate package/entity ownership; create Stripe Checkout | `PaymentsService`; transaction/attempt, Stripe |
| POST | `/payments/webhook/stripe` | Stripe signature | Raw-body signature validation and idempotent event handling | `PaymentsService`; payments/promotions/subscriptions |
| GET | `/payments/me` | JWT | Caller payment history | `PaymentsService`; `PaymentTransaction` |
| GET | `/payments/session/status?sessionId=` | JWT | Caller-owned checkout session status | `PaymentsService`; transaction |
| GET | `/payments/:id` | JWT | Caller-owned transaction | `PaymentsService`; transaction/attempts |
| GET | `/subscriptions/plans` | Public | Active subscription plans | `SubscriptionsService`; `SubscriptionPlan` |
| POST | `/subscriptions` | JWT | Create caller subscription | `SubscriptionsService`; `UserSubscription` |
| GET | `/subscriptions/me` | JWT | Caller subscriptions | `SubscriptionsService`; subscription/plan |
| POST | `/subscriptions/:id/cancel` | JWT | Cancel caller subscription | `SubscriptionsService`; subscription |
| POST | `/promotions` | JWT | Create caller promotion; entity ownership enforced in service | `PromotionsService`; `Promotion` |
| PATCH | `/promotions/:id` | JWT | Update caller promotion | `PromotionsService`; `Promotion` |
| GET | `/promotions/me` | JWT | Caller promotions | `PromotionsService`; `Promotion` |
| POST | `/promotions/:id/cancel` | JWT | Cancel caller promotion | `PromotionsService`; `Promotion` |

## Administration

All routes in this table require admin or moderator unless a narrower role is shown.

| Method | Route | Role | Purpose / dependencies |
|---|---|---|---|
| GET | `/admin/overview` | admin/moderator | Operational counts and queues |
| GET | `/admin/reports` | admin/moderator | Filter moderation reports |
| GET | `/admin/verification-requests` | admin/moderator | Review queue |
| GET | `/admin/audit-logs` | admin/moderator | Recent audit events; numeric limit parsed manually |
| GET | `/admin/analytics/summary` | admin/moderator | Date/range summaries |
| GET | `/admin/payments` | admin/moderator | Payment transactions |
| GET | `/admin/listings` | admin/moderator | Listing moderation list |
| GET | `/admin/listing-contact-updates` | admin only | Contact cleanup list with DTO query |
| PATCH | `/admin/listing-contact-updates/:id` | admin only | Update contact fields and audit |
| GET | `/admin/projects` | admin/moderator | Project moderation list |
| GET | `/admin/promotions` | admin/moderator | Promotion list |
| GET | `/admin/subscriptions` | admin/moderator | Subscription list |
| GET | `/admin/system-events` | admin/moderator | Recent operational events |
| POST | `/admin/system-events/:id/resolve` | admin/moderator | Resolve event and audit |
| GET | `/admin/professionals` | admin/moderator | Professional profile queue |
| GET | `/admin/professionals/:id` | admin/moderator | Professional detail |
| POST | `/admin/professionals/:id/approve` | admin/moderator | Verify profile, request, notify, audit |
| POST | `/admin/professionals/:id/reject` | admin/moderator | Reject with reason |
| GET | `/admin/cms/pages` | admin/moderator | Internal CMS page list |
| GET | `/admin/cms/blog-posts` | admin/moderator | Internal CMS post list |
| GET | `/admin/users` | admin/moderator | User list |
| GET | `/admin/users/:id` | admin/moderator | User detail/roles/profile |
| POST | `/admin/users/create-admin` | admin/moderator | Create admin account (class-level policy permits moderators) |
| POST | `/admin/payments/:id/reconcile` | admin/moderator | Reconcile provider state |
| POST | `/admin/promotions/expire` | admin/moderator | Run expiry transition |
| POST | `/admin/analytics/rollups/run` | admin/moderator | Enqueue/run requested rollup |
| POST | `/admin/analytics/rollups/rebuild` | admin/moderator | Rebuild requested rollup |
| GET | `/admin/analytics/rollups/status` | admin/moderator | Rollup status |
| GET | `/admin/data-integrity/check` | admin/moderator | Check capped records/index parity |
| POST | `/admin/data-integrity/repair` | admin/moderator | Reindex/fix supported anomalies and audit |
| POST | `/admin/verification-requests/:id/approve` | admin/moderator | Approve request |
| POST | `/admin/verification-requests/:id/reject` | admin/moderator | Reject request/reason |
| POST | `/admin/listings/:id/approve` | admin/moderator | Mark verified; index active listing |
| POST | `/admin/listings/:id/reject` | admin/moderator | Mark rejected and de-index |
| POST | `/admin/projects/:id/approve` | admin/moderator | Mark verified; index active project |
| POST | `/admin/projects/:id/reject` | admin/moderator | Mark rejected and de-index |
| POST | `/admin/users/:id/suspend` | admin/moderator | Set `SUSPENDED`, audit |
| POST | `/admin/users/:id/block` | admin/moderator | Alias of suspend |
| POST | `/admin/users/:id/unsuspend` | admin/moderator | Set `ACTIVE` |
| POST | `/admin/users/:id/unblock` | admin/moderator | Alias of unsuspend |
| POST | `/admin/users/:id/approve` | admin/moderator | Set `ACTIVE` |
| POST | `/admin/users/:id/roles` | admin/moderator | Assign role by code |
| DELETE | `/admin/users/:id/roles/:roleId` | admin/moderator | Remove role |
| POST | `/admin/reports/:id/resolve` | admin/moderator | Resolve report/reason |
| POST | `/admin/reports/:id/dismiss` | admin/moderator | Dismiss report/reason |
| POST | `/admin/duplicate-candidates/:id/confirm` | admin/moderator | Confirm duplicate |
| POST | `/admin/duplicate-candidates/:id/dismiss` | admin/moderator | Dismiss duplicate |
| POST | `/admin/admin-notes` | admin/moderator | Create entity note |
| GET | `/admin/admin-notes` | admin/moderator | Filter entity notes |
| POST | `/admin/risk-flags` | admin/moderator | Create risk flag |
| GET | `/admin/risk-flags` | admin/moderator | Filter risk flags |
| POST | `/admin/risk-flags/:id` | admin/moderator | Update risk flag (uses POST, not PATCH) |

Submission administration:

| Method | Route | Role | Purpose |
|---|---|---|---|
| GET | `/admin/submissions` | admin/moderator/support | Filter submission queue |
| GET | `/admin/submissions/:id` | admin/moderator/support | Submission detail |
| PATCH | `/admin/submissions/:id/status` | admin/moderator/support | Status/admin notes and audit |
| PATCH | `/admin/submissions/:id/assign` | admin/moderator/support | Assignment/admin notes and audit |

Search operations (admin only):

| Method | Route | Purpose |
|---|---|---|
| POST | `/admin/search/bootstrap` | Create core indices/aliases |
| POST | `/admin/search/reindex/listings` | Bulk listing reindex |
| POST | `/admin/search/reindex/projects` | Bulk project reindex |
| POST | `/admin/search/reindex/areas` | Bulk area reindex |
| POST | `/admin/search/reindex/listings/:id` | Reindex one listing |
| POST | `/admin/search/reindex/projects/:id` | Reindex one project |
| POST | `/admin/search/aliases/swap` | Validated alias swap |
| GET | `/admin/search/status` | Alias/index status |

## Health endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/health/live` | Public | Process liveness |
| GET | `/health/ready` | Public | Database/Redis readiness; Elasticsearch signal |
| GET | `/health/dependencies` | Public | Detailed dependency status derived from full system probe |
| GET | `/health/system` | RBAC admin/moderator | Full dependency/worker/provider status |
| GET | `/health/queues` | Public | Queue names and waiting/active/failed/delayed counts |
| GET | `/health/search` | Public | Elasticsearch aliases/counts/fallback/error detail |

## API design findings

- **Authorization strengths:** listing/project writes enforce ownership; chats enforce participants on REST; favorites/saved searches/payments are caller-scoped; admin/search routes have explicit roles.
- **Authorization gaps:** WebSocket chat has none; admin “create admin” is available to moderators due class-level roles; JWT roles/status/session are not revalidated after issuance.
- **Validation strengths:** most inputs have DTOs with type, length, enum, array, numeric and UUID controls.
- **Validation gaps:** newsletter unsubscribe binds a raw email property without DTO validation; some admin query values use raw strings/`Number()`; analytics event endpoint is public; S3 byte size is not part of the signature/DTO.
- **Error handling:** consistent global filter and request IDs are positive; provider/service errors require production log review because unexpected details are suppressed.
- **Public/private boundary:** public search/detail/reference/content/stat/event/intake/health endpoints coexist with protected account/admin APIs. Detailed health endpoints should be reduced or protected.

