import { Global, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { formatRedisConnectionTarget, parseRedisUrl } from '@Gharazi/shared-config';
import { QUEUES } from '@Gharazi/shared-events';
import { DEFAULT_JOB_OPTIONS } from '@Gharazi/shared-events/queue-options';
import { SearchIndexingService } from './search-indexing.service';

const logger = new Logger('QueueModule');

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.getOrThrow<string>('REDIS_URL');
        logger.log(`Configuring BullMQ Redis connection at ${formatRedisConnectionTarget(redisUrl)}`);

        return {
          connection: {
            ...parseRedisUrl(redisUrl),
            maxRetriesPerRequest: null,
          },
          skipWaitingForReady: true,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUES.searchIndexing }),
  ],
  providers: [SearchIndexingService],
  exports: [SearchIndexingService],
})
export class QueueModule {}
