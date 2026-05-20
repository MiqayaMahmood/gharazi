import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { startTelemetry, stopTelemetry } from '@Gharazi/shared-utils/observability';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  await startTelemetry(process.env.OTEL_SERVICE_NAME ?? 'Gharazi-worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  const logger = new Logger('WorkerBootstrap');

  logger.log('Worker application started');

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}; closing worker application`);
    await app.close();
    await stopTelemetry();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
