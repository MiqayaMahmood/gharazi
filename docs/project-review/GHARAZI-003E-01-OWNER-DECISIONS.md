# GHARAZI-003E-01 — Owner Decision Worksheet

This file contains policy choices only. It does not describe approved implementation until the owner records decisions.

## Required decisions

| Topic | Recommended default | Owner decision |
|---|---|---|
| Standard listing duration | 90 days | Pending |
| First expiry anchor | Exact first publication time + 90 elapsed days | Pending |
| Expired renewal anchor | Renewal time + 90 days | Pending |
| Early renewal | Allow only within final 14 days; extend from current expiry | Pending |
| Renewal eligibility | Expired listings only; archived uses republish; sold/rented/rejected/pending excluded | Pending |
| Renewal price | Free initially, pending commercial policy | Pending |
| Refresh eligibility | Active listings only | Pending |
| Refresh cooldown | Once every 7 days | Pending |
| Refresh ranking | Explicitly define and make PostgreSQL/Elasticsearch equivalent | Pending |
| Pre-expiry reminders | In-app at 7 days and 1 day | Pending |
| Email reminders | Disabled until consent/preferences and templates are approved | Pending |
| Expired public visibility | Hidden immediately by query-time enforcement | Pending |
| Sold/rented public detail | Decide whether historical detail remains public | Pending |
| Existing overdue active listings | Grace period; no immediate mass expiry | Pending |
| Existing missing expiry | Assign owner-approved future grace deadline | Pending |
| Promotion purchase eligibility | Active listing with expiry after promotion end | Pending |
| Promotion outlives listing | Block at purchase; decide legacy credit/refund handling | Pending |
| Renewal effect on promotion | No automatic extension | Pending |
| Admin override roles | Admin only, required reason, bounded duration | Pending |
| Direct promotion creation endpoint | Restrict to authorized internal/admin flow or require entitlement/payment | Pending |
| Rollout sequence | Report-only, grace/backfill, query guard, worker, reminders | Pending |

## Required evidence before GHARAZI-003E-02

- Execute the aggregate-only SQL in the investigation report.
- Record counts of active listings past expiry and active listings missing expiry.
- Record active promotions attached to overdue or non-active listings.
- Confirm Railway worker deployment and current heartbeat/failed queue status.
- Confirm whether repeatable promotion jobs exist in the production Redis queue.
- Approve a grandfathering date and seller communication plan.

## Recommended release gates

1. No mutation in the first deployment: report-only metrics.
2. No automatic expiry until historical inventory treatment is approved.
3. PostgreSQL and Elasticsearch eligibility tests must pass together.
4. Renewal must be state-restricted, authorization-tested, audited, and idempotent.
5. Notification reminders require a deduplication test and safe retry test.
6. Promotion eligibility and existing paid entitlement handling must be approved before enforcement.
