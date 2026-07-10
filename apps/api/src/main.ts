import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { parseCorsOrigins } from '@Gharazi/shared-config';
import { startTelemetry } from '@Gharazi/shared-utils/observability';
import { StructuredLogger, structuredLog } from '@Gharazi/shared-utils/structured-logger';

async function bootstrap(): Promise<void> {
  await startTelemetry(process.env.OTEL_SERVICE_NAME ?? 'Gharazi-api');
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(new StructuredLogger('api'));
  const config = app.get(ConfigService);
  const corsOrigins = parseCorsOrigins(config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000,http://127.0.0.1:3000');

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(app.get(ApiExceptionFilter));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gharazi PK API')
    .setDescription('Sprint 1 foundation API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('API_PORT') ?? 3001;
  await app.listen(port);
  structuredLog('log', 'api', 'Bootstrap', 'api.started', { port, optionalServices: { stripe: Boolean(process.env.STRIPE_SECRET_KEY), s3: Boolean(process.env.S3_BUCKET_NAME), resend: Boolean(process.env.RESEND_API_KEY), wordpress: Boolean(process.env.WP_API_BASE), elasticsearch: process.env.SEARCH_ENABLED !== 'false', sentry: Boolean(process.env.SENTRY_DSN), otel: process.env.OTEL_ENABLED === 'true' } });
}

void bootstrap();
