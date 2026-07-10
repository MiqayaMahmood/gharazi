import { LoggerService, LogLevel } from '@nestjs/common';

const secretKey = /password|token|authorization|cookie|secret|api[_-]?key|database_url|redis_url/i;

export function safeError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: safeString(error.message).slice(0, 500), code: 'code' in error ? String(error.code) : undefined };
  return { message: safeString(String(error)).slice(0, 500) };
}

function safeString(value: string) { return value.replace(/(?:postgres(?:ql)?|redis|rediss):\/\/\S+/gi, '[redacted-url]').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]'); }

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secretKey.test(key) ? '[redacted]' : sanitize(item, depth + 1)]));
  if (typeof value === 'string') { const safe = safeString(value); return safe.length > 1000 ? `${safe.slice(0, 1000)}…` : safe; }
  return value;
}

export function structuredLog(level: LogLevel, service: 'api' | 'worker', context: string, message: unknown, extra?: Record<string, unknown>) {
  const record = { timestamp: new Date().toISOString(), level, service, context, message: typeof message === 'string' ? message : undefined, ...sanitize(typeof message === 'object' ? message : extra) as object };
  const output = JSON.stringify(record);
  if (level === 'error' || level === 'fatal') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

export class StructuredLogger implements LoggerService {
  constructor(private readonly service: 'api' | 'worker') {}
  log(message: unknown, context?: string) { structuredLog('log', this.service, context ?? 'Application', message); }
  error(message: unknown, trace?: string, context?: string) { structuredLog('error', this.service, context ?? 'Application', message, trace && process.env.NODE_ENV !== 'production' ? { stack: trace } : undefined); }
  warn(message: unknown, context?: string) { structuredLog('warn', this.service, context ?? 'Application', message); }
  debug(message: unknown, context?: string) { structuredLog('debug', this.service, context ?? 'Application', message); }
  verbose(message: unknown, context?: string) { structuredLog('verbose', this.service, context ?? 'Application', message); }
  fatal(message: unknown, context?: string) { structuredLog('fatal', this.service, context ?? 'Application', message); }
}
