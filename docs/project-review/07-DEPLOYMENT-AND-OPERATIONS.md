# Deployment and Operations

## Intended topology

| Service | Intended host | Repository evidence |
|---|---|---|
| Next.js web/admin | Vercel | `apps/web`, README launch checklist |
| NestJS API | Railway | `apps/api`, root start scripts |
| NestJS worker | Railway | `apps/worker`, root start scripts |
| PostgreSQL | Supabase | Prisma datasource and README |
| Redis/BullMQ | external Redis (Upstash-compatible TLS supported) | shared config, queue modules |
| Elasticsearch | external service | search modules/config |
| Object storage | S3-compatible bucket/CDN | media service/config |
| Blog | WordPress REST API | frontend WordPress client |
| Payments | Stripe | payments service/webhook |
| Email | Resend | email service |

No `vercel.json`, Railway manifest, Dockerfile, GitHub Actions workflow, or infrastructure-as-code file was found. Hosting settings therefore cannot be reconstructed beyond README instructions and package scripts.

## Build and start commands

Documented/local scripts:

```text
API development:     npm run start:api:dev
API production-like: npm run start:api
Worker development:  npm run start:worker:dev
Worker production:   npm run start:worker
Web build:           npm --prefix apps/web run build
Web start:           npm --prefix apps/web run start
Migrations:          npm run prisma:deploy
```

The exact Railway/Vercel root directories, install/build commands, service count, release phase, health-check paths, and runtime versions are not stored in repository configuration.

## Environment variable groups

Only names are documented here; no values were read or reproduced.

| Group | Variables |
|---|---|
| Core | `NODE_ENV`, `APP_NAME`, `API_PORT`, `WORKER_CONCURRENCY` |
| Data | `DATABASE_URL`, optional `DIRECT_URL`, `REDIS_URL`, `ELASTICSEARCH_URL`, `ELASTICSEARCH_INDEX_PREFIX`, search flags |
| Security/network | `JWT_SECRET`, `JWT_EXPIRES_IN`, OTP controls, `CORS_ORIGINS`, rate-limit controls |
| Public URLs | `APP_PUBLIC_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, mock-fallback flag |
| Stripe | secret/webhook keys, currency, success/cancel URLs, package price IDs |
| WordPress | public/server API base, main category slug, server API key |
| Email | Resend key and sender |
| Storage | AWS region/credentials, bucket, public/CDN URL, path-style flag, nominal maximum MB |
| Observability | OTel enable/name/endpoint, Sentry DSNs/environment |
| Ads/seed | public ad controls and seed-admin inputs |

Environment validation uses Zod and rejects missing core database, Redis, JWT, and service URL settings. `JWT_SECRET` must be at least 24 characters. The `S3_UPLOAD_MAX_MB` setting is validated but not applied by the custom presigner.

## Frontend/backend boundary

- Vercel should receive `NEXT_PUBLIC_API_URL` pointing to Railway and must not receive `DATABASE_URL` or a Supabase service key.
- The API reads an explicit comma-separated CORS allowlist and enables credentials.
- The browser uses bearer JWTs, not cookies, so authentication callback URLs are not applicable in the current design.
- Production-like web deployments should set mock fallback off; otherwise API failures can be replaced with demo data.

## Health and observability

Endpoints:

- `/health/live`: process liveness.
- `/health/ready`: database/Redis readiness plus Elasticsearch signal.
- `/health/system`: detailed admin/moderator view.
- `/health/dependencies`, `/health/queues`, `/health/search`: detailed dependency/queue/search probes currently public.

The worker writes a Redis heartbeat. The API reports stale/missing heartbeat after two minutes. Structured logs include request IDs and operational fields. `SystemEvent` persists incidents and admin resolution state. OpenTelemetry can export traces/metrics; the local collector exposes Prometheus-format metrics. Sentry variables exist, but the README explicitly says SDK/event transport is not implemented.

Operational concerns:

- detailed public dependency/queue/search endpoints expose topology, failure detail, index aliases/counts, and queue counts;
- health checks call external services and may add cost/load if polled aggressively;
- no repository-defined retention, alerting, dashboard, backup, or on-call configuration;
- logs can contain OTP values and password-reset links when providers are unconfigured;
- no deployment CI gate is present for tests, lint, migrations, or smoke tests.

## Deployment verification status

| Item | Status |
|---|---|
| Public homepage on `gharazi.com` | Production observed |
| Vercel project settings/domains/env | Unknown / not verified |
| Railway API/worker commands, health checks, replicas, logs | Unknown / not verified |
| Supabase database connection, migrations, pooling, backups | Unknown / not verified |
| CORS production allowlist | Unknown / not verified |
| Stripe webhook registration and prices | Code/documented, runtime unverified |
| S3 bucket policy, CORS, malware scanning, lifecycle | Code boundary exists, runtime unverified |
| Redis/Elasticsearch availability and persistence | Runtime unverified |
| Resend sender/domain | Runtime unverified |
| WordPress public reads | Production homepage blog content observed; comment write unverified |

## Safe operational next steps

1. Export read-only Vercel/Railway/Supabase configuration snapshots for comparison with this document.
2. Confirm separate Railway API and worker services, migration release procedure, and health-check configuration.
3. Verify mock fallback is disabled in production and CORS contains only intended origins.
4. Verify Stripe webhook signing, S3 private/bucket policy and upload constraints, Redis TLS, Elasticsearch authentication, and database least-privilege roles.
5. Add CI checks and a non-production smoke-test environment before changing production.

