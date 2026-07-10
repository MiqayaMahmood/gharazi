import { z } from 'zod';

const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.string().url().optional());
const envBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_NAME: z.string().default('Gharazi-pk'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: optionalUrl,
  REDIS_URL: z.string().url(),
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  ELASTICSEARCH_NODE: z.string().url().optional(),
  ELASTICSEARCH_INDEX_PREFIX: z.string().default('Gharazi'),
  SEARCH_ENABLED: envBoolean.default(true),
  SEARCH_DB_FALLBACK_ENABLED: envBoolean.default(true),
  OTEL_ENABLED: envBoolean.default(false),
  OTEL_SERVICE_NAME: z.string().default('Gharazi-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  JWT_SECRET: z.string().min(24),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_DEV_CODE: z.string().regex(/^\d{6}$/).optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Gharazi <info@foodeez.ch>'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_PUBLIC_BASE_URL: optionalUrl,
  CLOUDFRONT_BASE_URL: optionalUrl,
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  S3_UPLOAD_MAX_MB: z.coerce.number().int().positive().default(50),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  return parsed.data;
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export type RedisProtocol = 'redis' | 'rediss';

export interface RedisConnectionTarget {
  protocol: RedisProtocol;
  hostname: string;
  port: number;
}

export function parseRedisUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(`Unsupported Redis protocol "${url.protocol}". Use redis:// or rediss://.`);
  }

  const protocol = url.protocol.replace(':', '') as RedisProtocol;
  const port = Number(url.port || 6379);
  if (protocol === 'redis' && url.hostname.includes('upstash.io')) {
    throw new Error('Upstash Redis requires a TLS URL. Use rediss:// for REDIS_URL.');
  }

  const path = url.pathname.replace('/', '');
  const db = path ? Number(path) : 0;
  if (Number.isNaN(db)) {
    throw new Error(`Invalid Redis database index "${path}".`);
  }

  return {
    host: url.hostname,
    port,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db,
    connectTimeout: 10000,
    retryStrategy: () => null,
    ...(protocol === 'rediss' ? { tls: {} } : {}),
  };
}

export function getRedisConnectionTarget(value: string): RedisConnectionTarget {
  const url = new URL(value);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(`Unsupported Redis protocol "${url.protocol}". Use redis:// or rediss://.`);
  }
  const protocol = url.protocol.replace(':', '') as RedisProtocol;
  if (protocol === 'redis' && url.hostname.includes('upstash.io')) {
    throw new Error('Upstash Redis requires a TLS URL. Use rediss:// for REDIS_URL.');
  }

  return {
    protocol,
    hostname: url.hostname,
    port: Number(url.port || 6379),
  };
}

export function formatRedisConnectionTarget(value: string): string {
  const target = getRedisConnectionTarget(value);
  return `${target.protocol}://${target.hostname}:${target.port}`;
}
