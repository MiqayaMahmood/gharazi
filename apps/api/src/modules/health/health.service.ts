import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import Stripe from 'stripe';
import { QUEUES } from '@Gharazi/shared-events';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ElasticsearchService } from '../../common/elasticsearch/elasticsearch.service';

type ServiceStatus = { status: 'ok' | 'degraded' | 'down' | 'disabled'; message?: string; latencyMs?: number; checkedAt: string; lastError?: string; [key: string]: unknown };

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly elasticsearch: ElasticsearchService,
    @InjectQueue(QUEUES.notifications) private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUES.searchIndexing) private readonly searchQueue: Queue,
    @InjectQueue(QUEUES.analyticsRollups) private readonly analyticsQueue: Queue,
    @InjectQueue(QUEUES.paymentFollowups) private readonly paymentQueue: Queue,
  ) {}

  async ready() {
    const checks = { database: await this.booleanCheck(() => this.prisma.$queryRaw`SELECT 1`), redis: await this.booleanCheck(async () => (await this.redis.ping()) === 'PONG'), elasticsearch: await this.booleanCheck(() => this.elasticsearch.client.ping()) };
    if (!checks.database || !checks.redis) throw new ServiceUnavailableException({ status: 'error', checks });
    return { status: 'ok', checks };
  }

  async system() {
    const [database, redis, elasticsearch, queues, stripe, s3, wordpress] = await Promise.all([
      this.probe('database', () => this.prisma.$queryRaw`SELECT 1`),
      this.probe('redis', async () => { if ((await this.redis.ping()) !== 'PONG') throw new Error('PING did not return PONG'); }),
      this.searchStatus(), this.queueStatus(), this.stripeStatus(), this.s3Status(), this.wordpressStatus(),
    ]);
    const heartbeat = await this.redis.get('observability:worker:heartbeat').catch(() => null);
    const heartbeatAge = heartbeat ? Date.now() - Date.parse(heartbeat) : undefined;
    const worker: ServiceStatus = heartbeatAge !== undefined && heartbeatAge < 120000 ? this.result('ok', `Heartbeat ${Math.round(heartbeatAge / 1000)}s ago`) : this.result('degraded', heartbeat ? 'Worker heartbeat is stale' : 'No worker heartbeat recorded');
    const resend = process.env.RESEND_API_KEY ? this.result('ok', 'Configured; no email sent by health check') : this.result('disabled', 'RESEND_API_KEY is not configured');
    const services = { api: this.result('ok', 'API process is responding'), worker, database, redis, elasticsearch, stripe, s3, resend, wordpress, queues };
    const criticalDown = database.status === 'down' || redis.status === 'down';
    const degraded = Object.values(services).some((item) => item.status === 'degraded' || item.status === 'down');
    return { status: criticalDown ? 'down' : degraded ? 'degraded' : 'ok', checkedAt: new Date().toISOString(), services };
  }

  async dependencies() { const data = await this.system(); return data.services; }

  async queues() { return { queues: await Promise.all(this.allQueues().map(async (queue) => ({ name: queue.name, waiting: await queue.getWaitingCount(), active: await queue.getActiveCount(), failed: await queue.getFailedCount(), delayed: await queue.getDelayedCount() }))) }; }
  async search() { return this.searchStatus(); }

  private async searchStatus(): Promise<ServiceStatus> {
    if (process.env.SEARCH_ENABLED === 'false') return this.result('disabled', 'Search disabled; database fallback available');
    const started = Date.now();
    try {
      await this.elasticsearch.client.ping();
      const names = ['listings', 'projects', 'areas'] as const;
      const counts = Object.fromEntries(await Promise.all(names.map(async (name) => { const alias = this.elasticsearch.alias(name); const count = await this.elasticsearch.client.count({ index: alias }).then((x) => x.count).catch(() => undefined); return [name, { alias, count }]; })));
      return this.result('ok', 'Elasticsearch reachable', Date.now() - started, { counts, fallbackEnabled: process.env.SEARCH_DB_FALLBACK_ENABLED !== 'false' });
    } catch (error) { return this.result(process.env.SEARCH_DB_FALLBACK_ENABLED !== 'false' ? 'degraded' : 'down', 'Elasticsearch unavailable; fallback status reported', Date.now() - started, { lastError: this.errorMessage(error), fallbackEnabled: process.env.SEARCH_DB_FALLBACK_ENABLED !== 'false' }); }
  }

  private async queueStatus(): Promise<ServiceStatus> {
    const started = Date.now();
    try { const stats = await Promise.all(this.allQueues().map(async (queue) => ({ name: queue.name, waiting: await queue.getWaitingCount(), active: await queue.getActiveCount(), failed: await queue.getFailedCount(), delayed: await queue.getDelayedCount() }))); const failed = stats.reduce((sum, item) => sum + item.failed, 0); return this.result(failed ? 'degraded' : 'ok', failed ? `${failed} failed jobs require review` : 'Queues reachable', Date.now() - started, { stats }); }
    catch (error) { return this.result('down', 'BullMQ queue inspection failed', Date.now() - started, { lastError: this.errorMessage(error) }); }
  }

  private async stripeStatus(): Promise<ServiceStatus> {
    if (!process.env.STRIPE_SECRET_KEY) return this.result('disabled', 'Stripe is not configured');
    const started = Date.now(); try { await new Stripe(process.env.STRIPE_SECRET_KEY).accounts.retrieve(); return this.result('ok', 'Stripe API reachable', Date.now() - started); } catch (error) { return this.result('degraded', 'Stripe API check failed', Date.now() - started, { lastError: this.errorMessage(error) }); }
  }

  private async s3Status(): Promise<ServiceStatus> {
    const bucket = process.env.S3_BUCKET_NAME; const accessKeyId = process.env.AWS_ACCESS_KEY_ID; const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) return this.result('disabled', 'S3 credentials or bucket are not configured');
    const started = Date.now(); try { const client = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1', credentials: { accessKeyId, secretAccessKey } }); await client.send(new HeadBucketCommand({ Bucket: bucket })); client.destroy(); return this.result('ok', 'S3 bucket accessible', Date.now() - started); } catch (error) { return this.result('degraded', 'S3 bucket access failed', Date.now() - started, { lastError: this.errorMessage(error) }); }
  }

  private async wordpressStatus(): Promise<ServiceStatus> {
    const base = process.env.WP_API_BASE; if (!base) return this.result('disabled', 'WP_API_BASE is not configured');
    const started = Date.now(); try { const response = await fetch(`${base.replace(/\/$/, '')}/categories?per_page=1`, { signal: AbortSignal.timeout(3000) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return this.result('ok', 'WordPress API reachable', Date.now() - started); } catch (error) { return this.result('degraded', 'WordPress API unavailable', Date.now() - started, { lastError: this.errorMessage(error) }); }
  }

  private async probe(_name: string, fn: () => Promise<unknown>) { const started = Date.now(); try { await fn(); return this.result('ok', undefined, Date.now() - started); } catch (error) { return this.result('down', 'Dependency check failed', Date.now() - started, { lastError: this.errorMessage(error) }); } }
  private result(status: ServiceStatus['status'], message?: string, latencyMs?: number, extra: Record<string, unknown> = {}): ServiceStatus { return { status, message, latencyMs, checkedAt: new Date().toISOString(), ...extra }; }
  private errorMessage(error: unknown) { return (error instanceof Error ? error.message : String(error)).replace(/(?:postgres(?:ql)?|redis|rediss):\/\/\S+/gi, '[redacted-url]').slice(0, 300); }
  private async booleanCheck(fn: () => Promise<unknown>) { try { await fn(); return true; } catch { return false; } }
  private allQueues() { return [this.notificationsQueue, this.searchQueue, this.analyticsQueue, this.paymentQueue]; }
}
