import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { parseCorsOrigins } from '@Gharazi/shared-config';
import { startTelemetry } from '@Gharazi/shared-utils/observability';

async function bootstrap(): Promise<void> {
  await startTelemetry(process.env.OTEL_SERVICE_NAME ?? 'Gharazi-api');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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
  app.useGlobalFilters(new ApiExceptionFilter());

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
  console.log(`API listening on http://localhost:${port}`);
  console.log(`CORS allowed origins: ${corsOrigins.join(', ')}`);
}

void bootstrap();
