import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { formatRedisConnectionTarget, parseRedisUrl } from '@Gharazi/shared-config';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

const logger = new Logger('RedisModule');

function formatRedisError(error: unknown): string {
  if (error instanceof AggregateError) {
    const causes = error.errors
      .map((cause) => (cause instanceof Error ? cause.message : String(cause)))
      .filter(Boolean);
    const code = typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
    return [code, ...causes].filter(Boolean).join('; ') || error.message;
  }

  if (error instanceof Error) {
    const code = 'code' in error ? String(error.code) : undefined;
    return [code, error.message].filter(Boolean).join('; ');
  }

  return String(error);
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.getOrThrow<string>('REDIS_URL');
        const target = formatRedisConnectionTarget(redisUrl);
        logger.log(`Connecting to Redis at ${target}`);

        const client = new Redis({
          ...parseRedisUrl(redisUrl),
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: true,
          retryStrategy: () => null,
        });

        let lastRedisError: string | undefined;
        client.on('error', (error) => {
          lastRedisError = formatRedisError(error);
          logger.error(`Redis client error for ${target}: ${lastRedisError}`);
        });

        try {
          await client.connect();
          logger.log(`Redis connected at ${target}`);
          return client;
        } catch (error) {
          client.disconnect();
          const message = lastRedisError ?? formatRedisError(error);
          throw new Error(`Redis connection failed for ${target}: ${message}`);
        }
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
