# GHARAZI-003C — Post Ad Acceptance

Date: 2026-11-08  
Status: COMPLETE for the approved frontend scope. Authenticated staging mutations and seller WhatsApp consent remain deferred as described below.

## 1. Baseline review

- Reviewed `ListingFormClient`, `MediaEditor`, `Stepper`, listing create/update/media clients, NestJS listing/media controllers and DTOs, Prisma contact fields, seller listing cards, and dashboard shell.
- Existing workflow remains an eight-step create/edit form backed by React Hook Form, Zod, existing create/update/publish endpoints, presigned uploads, and the existing publication transitions.
- Confirmed upload ownership checks and declared MIME allowlisting in the API.
- Confirmed no listing-media update/delete endpoint and no server-side byte limit or post-upload content inspection.
- Confirmed `contactWhatsapp` exists in Prisma, but seller create/update DTOs do not expose it.
- No critical baseline regression was found.

## 2. Mobile UX changes

- Added clear section headings, descriptions, required/optional indicators, mobile input modes, and compact spacing.
- Made the stepper horizontally scrollable with `aria-current="step"`.
- Added a safe-area-aware sticky mobile action area for Cancel, Back, Save draft, Next, and Publish.
- Added saving/publishing labels and cross-mutation disabling to prevent duplicate submission.
- Corrected dashboard grid containment so navigation and forms no longer create horizontal page overflow below 1024px.

## 3. Form validation improvements

- Field errors are associated with their controls using `aria-invalid` and `aria-describedby`.
- Step validation focuses the first invalid control.
- Whole-form validation moves to the step containing the first error, focuses it, and scrolls it into view.
- Existing valid input remains in React Hook Form after validation or server failures.
- Server/network errors remain visible in an alert without resetting the form.
- Frontend maximum lengths for seller contact fields now match existing backend limits.

## 4. Image management improvements

- New listings can select supported files before an entity ID exists; files are queued and uploaded after the existing create endpoint returns the draft ID.
- A remembered draft ID prevents retrying a failed upload from creating a duplicate listing.
- Added local preview, selected filename, upload status, failure message, and retry behavior.
- Added safe removal for unsaved media rows and one-cover selection behavior.
- Existing media is visibly preserved and immutable because the API has no ownership-checked update/delete endpoint.
- Direct URL/storage-key entry remains available under an advanced disclosure.
- Supported client types mirror the existing API allowlist: JPEG, PNG, WebP, MP4, and PDF floor plans as applicable.

Security limitation: presigning validates ownership and the declared MIME string, but S3 upload signing has no byte limit and the repository has no post-upload byte/MIME inspection. Secure deletion, byte limits, content verification, and orphan cleanup require a separate backend batch.

## 5. WhatsApp consent implementation status

DEFERRED. The seller listing DTO/API cannot store or clear `contactWhatsapp`; only an administrative contact path currently can. The form explicitly explains that the general phone does not enable WhatsApp. No legacy value is exposed or inferred. Owner approval is required for an explicit consent model and seller API contract before adding the control.

## 6. Completeness indicator

- Added a non-blocking percentage derived only from current form/media data.
- Required readiness covers purpose, type, city, area, title, description, price, and property area/unit.
- Recommendations cover media, contact name, contact phone, and useful bed/bath specifications.
- The indicator explicitly does not alter publication, ranking, verification, or promotion rules.

## 7. Dashboard changes

- Added a prominent Post property action and corrected stale empty-state copy.
- Added honest listing status labels, with verification shown separately.
- Prioritized Edit, Preview, Leads, and Messages.
- Grouped promotion and lifecycle actions under an accessible disclosure on small screens.
- Preserved all existing status mutations, confirmation prompts, payment actions, inquiries, and chats.

## 8. Files modified

- `apps/web/components/forms/listing-form-client.tsx`
- `apps/web/components/forms/media-editor.tsx`
- `apps/web/components/forms/stepper.tsx`
- `apps/web/lib/forms/listing-form-utils.ts` (new)
- `apps/web/lib/forms/listing-form-utils.spec.ts` (new)
- `apps/web/lib/api/supply.ts`
- `apps/web/components/dashboard/dashboard-shell.tsx`
- `apps/web/components/dashboard/supply-list-client.tsx`
- `apps/web/app/(dashboard)/dashboard/listings/page.tsx`
- `apps/web/app/(dashboard)/dashboard/listings/new/page.tsx`
- `apps/web/app/(dashboard)/dashboard/listings/[id]/edit/page.tsx`
- `apps/web/types/marketplace.ts`
- `docs/project-review/screenshots/gharazi-003c/`

No backend, database, migration, authentication, payment, publication, search, storage-provider, deployment, or environment file was changed in GHARAZI-003C.

## 9. Test results

| Check | Result |
|---|---|
| Frontend TypeScript | PASS |
| Repository ESLint | PASS, zero warnings |
| Focused Jest | PASS, 3 suites / 25 tests |
| Next.js production build | PASS, 69/69 pages generated |
| Required-field validation | PASS: two field alerts and focus moved to `purposeId` |
| Responsive overflow | PASS at 320, 375, 390, 430, 768, 1024, and 1440px after dashboard containment fix |
| Form visibility/completeness/actions | Rendered and verified locally with an intercepted non-production test identity |

The build emitted expected sandbox network `EACCES` messages for unavailable external services and still exited successfully. No production account or record was used.

Visual evidence: [390px Post Ad](screenshots/gharazi-003c/post-ad-purpose-390.png). The capture uses local mock/reference fallback data and an intercepted local test identity.

## 10. Deferred items

- WhatsApp opt-in/withdrawal and legacy-consent policy.
- Ownership-checked media replacement/deletion and storage-object cleanup.
- Server-enforced byte limits and post-upload content verification.
- Stable media reordering; no supported contract exists.
- Category-specific conditional fields; taxonomy responses do not expose reliable residential/commercial/plot capability metadata.
- Full create/edit/upload/remove mutation testing requires a safe staging API and seller account.

## 11. Regression risks

- A listing draft may be created before a media upload fails; retry now reuses that draft, but staging should verify this against real S3/CORS configuration.
- Existing media cannot be removed until the backend supplies an ownership-checked endpoint.
- Dashboard fallback fixtures do not contain every production listing status.
- Long translated labels and large media batches need staging visual/performance coverage.

## 12. Next recommendations

For GHARAZI-003D, add authenticated staging fixtures and focused browser tests for create/edit/publish recovery. Separately approve a backend media-security batch and a consent-backed seller WhatsApp contract before enabling either feature in production.
