import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RedisService } from '../../common/redis/redis.service';
import { ElasticsearchService } from '../../common/elasticsearch/elasticsearch.service';
import { PrismaService } from '../../database/prisma.service';
import { HealthService } from './health.service';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUES } from '@Gharazi/shared-events';

const queueMock = {
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  getDelayedCount: jest.fn().mockResolvedValue(0),
};

describe('HealthService', () => {
  it('returns ok when dependencies respond', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) },
        },
        {
          provide: RedisService,
          useValue: { ping: jest.fn().mockResolvedValue('PONG') },
        },
        {
          provide: ElasticsearchService,
          useValue: { client: { ping: jest.fn().mockResolvedValue(true) } },
        },
        { provide: getQueueToken(QUEUES.notifications), useValue: queueMock },
        { provide: getQueueToken(QUEUES.searchIndexing), useValue: queueMock },
        { provide: getQueueToken(QUEUES.analyticsRollups), useValue: queueMock },
        { provide: getQueueToken(QUEUES.paymentFollowups), useValue: queueMock },
      ],
    }).compile();

    await expect(moduleRef.get(HealthService).ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: true, redis: true, elasticsearch: true },
    });
  });

  it('throws when a dependency is unavailable', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockRejectedValue(new Error('down')) },
        },
        {
          provide: RedisService,
          useValue: { ping: jest.fn().mockResolvedValue('PONG') },
        },
        {
          provide: ElasticsearchService,
          useValue: { client: { ping: jest.fn().mockResolvedValue(true) } },
        },
        { provide: getQueueToken(QUEUES.notifications), useValue: queueMock },
        { provide: getQueueToken(QUEUES.searchIndexing), useValue: queueMock },
        { provide: getQueueToken(QUEUES.analyticsRollups), useValue: queueMock },
        { provide: getQueueToken(QUEUES.paymentFollowups), useValue: queueMock },
      ],
    }).compile();

    await expect(moduleRef.get(HealthService).ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
