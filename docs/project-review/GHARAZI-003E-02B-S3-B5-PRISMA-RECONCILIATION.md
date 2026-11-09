# GHARAZI-003E-02B-S3-B5 — Prisma Migration History Reconciliation Plan

## Recommendation: NO-GO for now

The owner-provided facts say both outbox DDL migrations were applied manually, the outbox has zero rows, and no matching Prisma history rows exist. Source inspection confirms the exact migrations and their order. However, do not execute `migrate resolve` until the prerequisites below are verified: exact database object definitions, complete history for the fourteen earlier migrations, the correct Prisma migration lock/configuration, and the target database/schema used by the release runner.

No database connection or command that writes migration history was used. No source, schema, or migration SQL was modified.

## 1. Exact migrations and order

| Order | Migration directory | SQL file | Purpose |
|---|---|---|---|
| 1 | `20261109090000_promotion_activation_outbox` | `prisma/migrations/20261109090000_promotion_activation_outbox/migration.sql` | Creates the schema-qualified outbox table, primary/unique constraints, indexes, and FKs to promotions and notifications. |
| 2 | `20261109091500_promotion_activation_effect_delivery` | `prisma/migrations/20261109091500_promotion_activation_effect_delivery/migration.sql` | Adds per-effect delivery state, retry/claim fields, and six indexes to the outbox table. |

The second migration depends on the first. Filenames place both after the repository's fourteen earlier migration directories. No later migration directory is present in this checkout.

Local SHA-256 values (useful for preserving the exact reviewed files; not evidence of the manually executed SQL text):

- `20261109090000_promotion_activation_outbox`: `03229357BEF9F81DFA3C0A7686CEDE837A7BEDA22EF02E6BA04426AE98CAE851`
- `20261109091500_promotion_activation_effect_delivery`: `EDE0DEEF8F3F9CAC067F3F4CD3B50C9E2E73CA7B4009C2FBA97CB0C66DA4594B`

## 2. Schema and datasource findings

- Both SQL files explicitly address `sch_gharazi.promotion_activation_outbox`; the first also explicitly references `sch_gharazi.promotions` and `sch_gharazi.notifications`.
- `prisma/schema.prisma` uses PostgreSQL and `url = env("DATABASE_URL")`. Models map table names with `@@map`; there are no explicit `@@schema` declarations or datasource `schemas` list. Schema selection therefore depends on the datasource URL.
- The local `.env` was inspected without printing its URL or credentials; its `DATABASE_URL` includes `schema=sch_gharazi`. Production/release environment configuration was not inspected.
- Root `package.json` defines `prisma:deploy` as `prisma migrate deploy`; the installed Prisma CLI is 6.19.3. That command applies every pending migration in the migration directory, so it is not an acceptable substitute for the two targeted history reconciliations unless the full history has first been reconciled.
- `prisma/migrations/migration_lock.toml` is absent from this checkout. Resolve the authoritative lock file/provider and migration runner from the release artifact/source control before invoking Prisma Migrate. Do not create or infer a replacement in this task.

## 3. Comparison with owner-supplied database inventory

Owner-supplied verified facts: schema/table exist; original and delivery columns exist; foreign keys, unique indexes, and all six delivery indexes exist; outbox count is zero; the two SQL-editor executions have no corresponding migration-history records.

This matches the migrations at the object-category level. The supplied inventory does not provide exact column types/defaults/nullability, constraint names/actions, or index definitions. Before reconciling history, compare those exact definitions against the SQL and Prisma schema. In particular, confirm:

- Primary key `promotion_activation_outbox_pkey`.
- Unique indexes `promotion_activation_outbox_promotion_id_key`, `promotion_activation_outbox_event_key_key`, `promotion_activation_outbox_notification_id_key`.
- Foreign keys with the expected referenced columns and delete/update actions.
- Base indexes `promotion_activation_outbox_completed_at_created_at_idx` and `promotion_activation_outbox_claimed_at_idx`.
- All six delivery index names and ordered columns: `promo_act_outbox_notif_next_idx`, `promo_act_outbox_notif_claim_idx`, `promo_act_outbox_notif_queue_idx`, `promo_act_outbox_search_next_idx`, `promo_act_outbox_search_claim_idx`, and `promo_act_outbox_search_queue_idx`.
- Nullable status fields; nullable claim/retry/completion/error fields; non-null attempt/generation counters defaulting to zero; exact UUID and timestamp types.

“Objects exist” is not sufficient to safely mark the migration applied if names or definitions differ. `migrate resolve --applied` records migration history; it does not execute or validate the SQL against the current schema.

## 4. Earlier migration history that must be checked

Fourteen earlier directories precede the outbox migrations:

1. `20260501000000_sprint_1_foundation`
2. `20260501010000_sprint_1_schema_refinement`
3. `20260501020000_sprint_2_marketplace_core`
4. `20260501030000_sprint_3_discovery_leads_trust`
5. `20260501040000_sprint_4_admin_monetization_analytics`
6. `20260501050000_sprint_5_payments_risk_analytics`
7. `20260502090000_sprint_12_launch_readiness`
8. `20260502100000_sprint_14_inbound_submissions`
9. `20260503090000_sprint_16_auth_media_patch`
10. `20260509090000_sprint_23_newsletter`
11. `20260705090000_listing_contact_admin_utility`
12. `20260710190000_stripe_payments`
13. `20260710210000_system_events`
14. `20260711100000_professional_profiles`

No database history was queried. Confirm every earlier migration is successful and in the intended history before resolving the two later records. If any earlier migration is pending, failed, rolled back, or has a checksum mismatch, stop and reconcile that issue first. Otherwise Prisma may report inconsistent history or a later deploy may try to run unrelated earlier DDL.

## 5. Required database preflight

The owner should run read-only checks in Supabase SQL Editor. First locate the history table because its schema has not been supplied:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = '_prisma_migrations'
ORDER BY table_schema;
```

After identifying its schema, inspect all migration names and states (substitute the discovered schema):

```sql
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, logs
FROM <history_schema>._prisma_migrations
ORDER BY started_at, migration_name;
```

Confirm exact outbox columns, constraints, and index definitions using the read-only catalog queries in the preceding S3-B4 report. The owner-provided inventory should be supplemented with those definitions before resolving.

## 6. Proposed reconciliation commands — DO NOT EXECUTE IN THIS TASK

Run only from the approved release environment after all GO prerequisites pass, with the production target verified out-of-band and the repository root as the working directory. `DATABASE_URL` must select the verified Supabase database and `sch_gharazi` schema. Do not rely on an unverified developer `.env`.

First record the base table migration as already applied:

```powershell
npx.cmd prisma migrate resolve --applied 20261109090000_promotion_activation_outbox --schema prisma/schema.prisma
```

Only after that command succeeds and history is confirmed, record the delivery-state migration:

```powershell
npx.cmd prisma migrate resolve --applied 20261109091500_promotion_activation_effect_delivery --schema prisma/schema.prisma
```

These commands write only Prisma migration-history metadata; they do not apply either SQL migration. Do not run `prisma migrate deploy` as part of this reconciliation plan. Do not run either command if the SQL was only partially applied or if exact schema comparison fails.

## 7. Post-reconciliation verification

After the approved commands, perform read-only checks:

1. Run `npx.cmd prisma migrate status --schema prisma/schema.prisma` from the same approved release environment and verify the two named migrations are applied with no unexpected pending/failed history. This command was not run for this assessment.
2. Query the discovered `_prisma_migrations` schema and confirm one successful row per migration, in timestamp order, with non-null `finished_at`, null `rolled_back_at`, and checksums matching the reviewed local migration files.
3. Re-run the catalog checks and confirm the outbox object definitions still match the expected schema.
4. Confirm the outbox row count remains zero unless another authorized process has written records; do not infer this from the earlier snapshot after time has passed.
5. Keep `PROMOTION_ACTIVATION_ENABLED=false`; do not enqueue or replay jobs as part of history reconciliation.

`migrate resolve` records the local migration-file checksum and status; it does not prove that the manually applied SQL was byte-for-byte identical. The owner should retain the SQL Editor execution record or compare the deployed schema to every expected object. Do not edit the migration files after reconciliation; a changed file can cause checksum/history drift.

## 8. Cascade and pending evidence assessment

The base migration declares `promotion_id → promotions.id ON DELETE CASCADE`. With the supplied outbox count of zero, this causes no current outbox-evidence loss. Future hard deletion of a promotion would delete its outbox event, including undelivered/retry/terminal state. That is a material durability limitation if outbox rows are expected to be operational or audit evidence.

No direct promotion hard-delete call was found in the inspected API/worker source search. That does not rule out direct database operations, another service, or future code. The cascade is not proven unacceptable for current behavior if promotions are never hard-deleted; the owner should explicitly accept that assumption. If pending outbox evidence must survive promotion deletion, this FK behavior needs a separately approved schema decision before relying on the table as an audit archive. No schema change is proposed here.

## 9. Risks and GO criteria

### Current decision: NO-GO

The schema is reportedly present, but exact object definitions, the fourteen earlier history rows, the location/state of `_prisma_migrations`, release datasource target, and authoritative Prisma lock file are unresolved from source alone. Executing `resolve --applied` now could bless drift or inconsistent history without running validation.

### Change to GO only after all are true

- All fourteen preceding migrations are recorded successful in the shared DB and there are no failed/rolled-back rows requiring handling.
- The two target migrations have no prior history rows, and the owner confirms the actual DDL is complete, not partial.
- Catalog inspection confirms exact names, types, nullability, defaults, FKs/actions, unique constraints, and indexes.
- The correct `_prisma_migrations` schema, `migration_lock.toml`, Prisma provider, repository revision, and release `DATABASE_URL` schema/target are confirmed.
- Owner accepts `ON DELETE CASCADE` semantics for future promotion deletes, or has a separate approved plan.
- A release operator approves the two metadata-only commands, executed in the stated order, with activation still disabled.

## 10. Files and execution status

Created only this plan. No Prisma commands, SQL, source changes, migrations, deployment actions, or live service operations were performed.
