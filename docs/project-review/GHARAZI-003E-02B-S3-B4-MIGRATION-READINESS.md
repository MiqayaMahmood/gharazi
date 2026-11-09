# GHARAZI-003E-02B-S3-B4 — Final Promotion Outbox Migration Readiness

## Overall readiness

**PARTIAL — source review is complete; database state is unverified and migration application is not approved by this report.** No database connection was opened, no SQL was executed, and no application or migration file was changed. Scheduled activation remains disabled.

The two migrations are chronologically ordered and explicitly target `sch_gharazi`. They are additive, but both use ordinary (non-concurrent) index creation and contain no explicit transaction wrapper or rollback script. The repository also lacks `prisma/migrations/migration_lock.toml`; the owner must confirm the authoritative migration runner/history before any application.

## 1. Migration inventory and dependencies

### `20261109090000_promotion_activation_outbox`

Creates `sch_gharazi.promotion_activation_outbox` with:

- UUID primary key `id`, defaulting to `gen_random_uuid()`.
- Required `promotion_id` and `event_key`; each has a unique index.
- Nullable `notification_id`, also unique.
- Nullable notification/index checkpoint fields, claim/completion timestamps, and error field.
- Non-null attempt count defaulting to `0`; created/updated timestamps defaulting to `CURRENT_TIMESTAMP`.
- Foreign key `promotion_id → sch_gharazi.promotions(id)`, `ON DELETE CASCADE ON UPDATE CASCADE`.
- Foreign key `notification_id → sch_gharazi.notifications(id)`, `ON DELETE SET NULL ON UPDATE CASCADE`.
- Indexes for `(completed_at, created_at)` and `claimed_at`; primary and unique constraints have their own supporting indexes.

Dependencies: schema `sch_gharazi`; existing `promotions` and `notifications` tables with UUID `id` keys; a resolvable `gen_random_uuid()` function; and the migration runner having permission to create the table, constraints, and indexes.

### `20261109091500_promotion_activation_effect_delivery`

Depends on the first migration's table. It adds independent nullable notification/index status, claim, retry, completion, error, and enqueue fields; attempt/generation counters are non-null with constant default `0`. It adds six ordinary indexes on the outbox table for due retries, claims, and queue timestamps. It contains no data backfill, update, or delete.

All table references in both SQL files are explicitly schema-qualified. The local `.env` contains a `DATABASE_URL` schema parameter of `sch_gharazi` (only that parameter was inspected; no credential or host was read out). The Prisma datasource itself reads `DATABASE_URL`; the production connection configuration remains unverified. The Prisma model uses `@@map("promotion_activation_outbox")` and relies on the datasource URL's schema selection rather than an explicit `@@schema` annotation.

## 2. Migration history and database verification

The repository contains both migration directories and earlier migrations, but source files do not establish which have been applied to Supabase. No production or staging database check was performed. The checkout has no `prisma/migrations/migration_lock.toml`, despite `package.json` exposing `prisma migrate deploy`; confirm the deployed migration mechanism and recover/verify the intended provider lock file from the authoritative release source before running Prisma migration commands.

Do **not** run the generic deploy command merely to apply these two files: Prisma deploy applies every migration it considers pending, not only the two named migrations. First reconcile the complete migration history with the database and check for drift or manually applied DDL.

### Owner-run read-only checks

Run these in Supabase SQL Editor only after confirming the selected database/schema. They are SELECT-only.

Discover where Prisma migration history is stored:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = '_prisma_migrations'
ORDER BY table_schema;
```

If found, substitute its reported schema below and inspect only the two target names:

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at, logs
FROM <reported_schema>._prisma_migrations
WHERE migration_name IN (
  '20261109090000_promotion_activation_outbox',
  '20261109091500_promotion_activation_effect_delivery'
)
ORDER BY migration_name;
```

Check required objects and PostgreSQL version/function availability:

```sql
SELECT current_setting('server_version') AS server_version,
       to_regclass('sch_gharazi.promotions') AS promotions_table,
       to_regclass('sch_gharazi.notifications') AS notifications_table,
       to_regclass('sch_gharazi.promotion_activation_outbox') AS outbox_table,
       to_regprocedure('gen_random_uuid()') AS uuid_function;
```

Inspect outbox columns, constraints, and indexes after confirming the table exists:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'sch_gharazi'
  AND table_name = 'promotion_activation_outbox'
ORDER BY ordinal_position;

SELECT c.conname, c.contype, c.convalidated, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'sch_gharazi'
  AND t.relname = 'promotion_activation_outbox'
ORDER BY c.conname;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'sch_gharazi'
  AND tablename = 'promotion_activation_outbox'
ORDER BY indexname;
```

Only if the table exists, an aggregate count can establish whether legacy rows need review:

```sql
SELECT count(*)::bigint AS outbox_rows,
       count(*) FILTER (WHERE notification_status IS NULL)::bigint AS null_notification_status,
       count(*) FILTER (WHERE search_index_status IS NULL)::bigint AS null_search_status
FROM sch_gharazi.promotion_activation_outbox;
```

If columns are absent, do not run the count query as written; inspect the actual columns first. These queries expose no seller contact information.

## 3. Locking, transactions, and shared-database impact

- Migration 1 adds foreign keys while creating a new table. PostgreSQL takes a `SHARE ROW EXCLUSIVE` lock on each referenced table (`promotions` and `notifications`) for foreign-key creation. This can conflict with concurrent writes/DDL on those tables. The migration also creates several indexes on the new outbox table.
- Migration 2's `ALTER TABLE` takes a strong lock on the outbox table. Constant defaults may avoid a table rewrite on supported PostgreSQL versions, but the deployed version is unknown. Six normal `CREATE INDEX` statements follow; a normal index build blocks writes to the indexed table while it runs. The outbox's size and workload are unknown, so no duration estimate is justified.
- Both SQL files omit `BEGIN`/`COMMIT`. The installed Prisma CLI version is 6.19.3. Prisma's v6-era migration guidance says PostgreSQL migrations are not automatically wrapped as one transaction; treat the statements as potentially partially applied on failure. Verify the exact production runner behavior with the release owner rather than assuming all-or-nothing execution. [Prisma migration transaction guidance](https://github.com/prisma/orm/discussions/3774)
- PostgreSQL documents the referenced-table lock for foreign keys and the write-blocking behavior of ordinary index creation. [Foreign-key locking](https://www.postgresql.org/docs/current/sql-altertable.html), [index locking](https://www.postgresql.org/docs/17/sql-createindex.html).
- There is no `CREATE INDEX CONCURRENTLY`; do not add it ad hoc. It has transaction restrictions and would need a deliberately supported migration procedure.

The SQL creates a new outbox table and adds columns/indexes to that table only. It does not update existing listing, promotion, payment, or notification rows. The foreign keys can affect future hard deletion behavior: deleting a promotion cascades to its outbox event; deleting a linked notification nulls the reference. This is an explicit schema behavior to approve, not a migration-time data change.

## 4. Compatibility and idempotency assumptions

- Older application versions that do not reference the new columns/table should be compatible with additive DDL. New code with `PROMOTION_ACTIVATION_ENABLED=false` returns before outbox access in the scheduled activation path; do not deploy with the gate enabled before both migrations are verified.
- Migration 1 assumes one outbox event per promotion (`UNIQUE promotion_id`) and unique event keys. That is durable duplicate protection for a single activation event per promotion, but it also means a future reactivation/repeated activation lifecycle cannot create a second outbox event for the same promotion without a policy/schema change.
- `notification_id` uniqueness prevents one notification being linked by multiple outbox records. Migration 2 counters default to zero; effect statuses are nullable and deliberately have no default/backfill. This prevents legacy rows from entering the new `pending` dispatcher path automatically.
- If the first migration exists in the DB but is absent from `_prisma_migrations`, or vice versa, treat it as drift requiring an explicit reconciliation plan. Do not reapply SQL or mark a migration applied based only on filenames.

## 5. Legacy outbox events

If the first migration has been applied and events were created before the second one, those rows will have null per-effect status after migration 2. Current source filters for explicit states (`pending`, due `retryable`, stale `enqueued`, stale `processing`); null states are excluded. They will not be replayed automatically. Their earlier aggregate `completed_at` or enqueue timestamps do not prove consumer delivery. The owner should review bounded counts and, if nonzero, arrange a separate record-level operational reconciliation with the activation gate disabled. Do not backfill statuses or replay jobs as part of this phase.

## 6. Safe owner-controlled application sequence

1. **Freeze competing schema changes.** Confirm the official migration tool, release artifact, and expected `_prisma_migrations` schema. Resolve the missing `migration_lock.toml` from the authoritative source before using Prisma Migrate.
2. **Read-only preflight.** Run the SELECT checks above. Confirm full migration history, schema/table/function dependencies, object definitions, database version, and whether either target migration is already applied or partially applied. Confirm Supabase backup/PITR and recovery readiness through the owner's normal operations process.
3. **Reconcile before applying.** If migration history and actual schema disagree, stop for an explicit DBA repair plan. Do not run `migrate deploy` until all earlier pending migrations are understood; it can apply more than these two.
4. **Plan lock controls.** Schedule an owner-approved low-traffic window. Have the database operator set appropriate lock/statement timeouts in the actual execution session and monitor blockers. No duration is estimated here. Confirm there is a recovery operator available for a partially applied file.
5. **Apply the base migration first**, only if read-only inspection confirms it is absent and not partially present: `20261109090000_promotion_activation_outbox`. Review its completion/history record, then verify table, FK definitions, unique constraints, and indexes with SELECTs.
6. **Apply the delivery migration second**, only after step 5 is confirmed complete: `20261109091500_promotion_activation_effect_delivery`. Verify all expected columns/defaults/indexes and inspect null-status legacy counts.
7. **If any statement fails, stop.** Inspect actual objects and migration history read-only. Repair forward through the approved release/migration process; do not blindly rerun, drop the table, or mark the migration resolved without matching the database to the intended state.
8. **Deploy code with activation disabled.** Existing versions are expected to tolerate additive objects; deploy only after migration verification and run isolated functional checks. Keep `PROMOTION_ACTIVATION_ENABLED=false`.
9. **Review legacy rows and observability.** Decide separately whether any null-status historical events need manual reconciliation. Do not auto-replay them.
10. **Separate approval for activation.** Only a later owner-approved readiness decision may enable scheduled promotion processing. Migration approval does not imply activation approval. Automatic listing expiry remains prohibited.

## 7. Rollback and forward-repair limitations

Neither migration includes a down script. Before application, reverting the code is straightforward if the activation gate remains disabled. After migration 1, dropping the table would discard durable event evidence; after migration 2, dropping columns/indexes would discard delivery/retry history and make the new code incompatible. Prefer forward repair. Any schema rollback after events exist needs explicit owner/DBA review and preservation/export of relevant operational evidence; it is not an automatic rollback step.

Because the SQL is not explicitly transaction-wrapped, partial application can leave some indexes or columns present while Prisma records a failed migration. Inspect both database objects and migration history before any retry or `migrate resolve` action. A failed migration state is not proof that no DDL took effect.

## 8. Readiness decisions and outstanding approvals

| Decision | Assessment |
|---|---|
| Apply migration 1 | **Conditional; not approved yet.** Verify history/dependencies, resolve migration-runner metadata, and plan referenced-table lock window. |
| Apply migration 2 | **Conditional; not approved yet.** Requires migration 1 confirmed, outbox state/count review, and acceptance of ordinary index write blocking. |
| Deploy code with gate disabled | **Conditionally compatible.** Prefer after both migrations are verified; do not enable gate. |
| Enable scheduled promotion activation | **Not approved / out of scope.** Requires a separate owner decision after isolated acceptance and legacy-event review. |

Owner/DBA decisions required: migration tool and lock-file source; current migration/table state; application window and timeout controls; handling of partial failure; approval of `ON DELETE CASCADE` history semantics; and a separate future activation decision.

## 9. Recommended next action

Have the database owner run the read-only preflight queries and report the migration-history rows plus outbox object/row-state results. Reconcile those results with the authoritative Prisma migration lock/release artifact. Only then prepare a dated change window for the ordered migrations. No migration or activation action was taken in this assessment.
