import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Queue, QueueEvents } from 'bullmq';
import { parseRedisUrl } from '@Gharazi/shared-config';
import { QUEUES } from '@Gharazi/shared-events';
import { structuredLog } from '@Gharazi/shared-utils/structured-logger';

@Injectable()
export class WorkerObservabilityService implements OnModuleInit, OnModuleDestroy {
  private readonly events: QueueEvents[] = [];
  private readonly queues: Queue[] = [];
  private readonly started = new Map<string, number>();
  private redis?: Redis;
  private heartbeat?: NodeJS.Timeout;
  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const connection = { ...parseRedisUrl(this.config.getOrThrow<string>('REDIS_URL')), maxRetriesPerRequest: null };
    this.redis = new Redis(connection);
    await this.writeHeartbeat();
    this.heartbeat = setInterval(() => void this.writeHeartbeat(), 30000);
    for (const queueName of Object.values(QUEUES)) {
      const events = new QueueEvents(queueName, { connection });
      const queue = new Queue(queueName, { connection }); this.queues.push(queue);
      events.on('active', ({ jobId }) => { this.started.set(`${queueName}:${jobId}`, Date.now()); void queue.getJob(jobId).then((job) => { const data = job?.data as { entityType?: string; entityId?: string; type?: string; userId?: string } | undefined; structuredLog('log', 'worker', 'QueueJob', 'job.started', { queueName, jobId, jobName: job?.name, attempts: job?.attemptsMade, entityType: data?.entityType ?? data?.type, entityId: data?.entityId, userId: data?.userId }); }); });
      events.on('completed', ({ jobId }) => { const key = `${queueName}:${jobId}`; const durationMs = Date.now() - (this.started.get(key) ?? Date.now()); this.started.delete(key); structuredLog('log', 'worker', 'QueueJob', 'job.completed', { queueName, jobId, durationMs }); });
      events.on('failed', ({ jobId, failedReason }) => { const key = `${queueName}:${jobId}`; const durationMs = Date.now() - (this.started.get(key) ?? Date.now()); this.started.delete(key); structuredLog('error', 'worker', 'QueueJob', 'job.failed', { queueName, jobId, durationMs, error: String(failedReason).slice(0, 500) }); });
      events.on('error', (error) => structuredLog('error', 'worker', 'QueueEvents', 'queue.connection_error', { queueName, error: error.message }));
      this.events.push(events);
    }
    structuredLog('log', 'worker', 'WorkerObservability', 'worker.monitoring_started', { queues: Object.values(QUEUES) });
  }

  async onModuleDestroy() { if (this.heartbeat) clearInterval(this.heartbeat); await Promise.all([...this.events.map((item) => item.close()), ...this.queues.map((item) => item.close())]); await this.redis?.quit(); }
  private async writeHeartbeat() { await this.redis?.set('observability:worker:heartbeat', new Date().toISOString(), 'EX', 180).catch((error) => structuredLog('error', 'worker', 'Heartbeat', 'worker.heartbeat_failed', { error: error.message })); }
}
