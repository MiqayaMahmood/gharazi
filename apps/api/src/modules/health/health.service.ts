import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '@Gharazi/shared-events';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ElasticsearchService } from '../../common/elasticsearch/elasticsearch.service';

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
    const checks = {
      database: false,
      redis: false,
      elasticsearch: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      checks.redis = (await this.redis.ping()) === 'PONG';
    } catch {
      checks.redis = false;
    }

    try {
      checks.elasticsearch = Boolean(await this.elasticsearch.client.ping());
    } catch {
      checks.elasticsearch = false;
    }

    const ready = Object.values(checks).every(Boolean);
    if (!ready) {
      throw new ServiceUnavailableException({ status: 'error', checks });
    }

    return { status: 'ok', checks };
  }

  async dependencies() {
    const database = await this.safe(async () => {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    });
    const redis = await this.safe(async () => (await this.redis.ping()) === 'PONG');
    const elasticsearch = await this.safe(async () => Boolean(await this.elasticsearch.client.ping()));
    return { database, redis, elasticsearch, paymentProvider: { mock: true } };
  }

  async queues() {
    const queues = [this.notificationsQueue, this.searchQueue, this.analyticsQueue, this.paymentQueue];
    const stats = await Promise.all(
      queues.map(async (queue) => ({
        name: queue.name,
        waiting: await queue.getWaitingCount(),
        active: await queue.getActiveCount(),
        failed: await queue.getFailedCount(),
        delayed: await queue.getDelayedCount(),
      })),
    );
    return { queues: stats };
  }

  async search() {
    const ping = await this.safe(async () => Boolean(await this.elasticsearch.client.ping()));
    return {
      reachable: ping.ok,
      aliases: {
        listings: this.elasticsearch.alias('listings'),
        projects: this.elasticsearch.alias('projects'),
        areas: this.elasticsearch.alias('areas'),
      },
    };
  }

  private async safe<T>(fn: () => Promise<T>) {
    try {
      return { ok: true, value: await fn() };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'unknown' };
    }
  }
}
