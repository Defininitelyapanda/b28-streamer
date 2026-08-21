import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { assertProductionSafeEnv, sanitizeOptionalEnv } from './config/env.validation';

async function bootstrap() {
  try {
    assertProductionSafeEnv();
    sanitizeOptionalEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  if (process.env.VERCEL === '1') {
    const httpAdapter = app.getHttpAdapter();
    if (httpAdapter.getType() === 'express') {
      httpAdapter.getInstance().set('trust proxy', 1);
    }
  }

  const configService = app.get(ConfigService);
  const port = Number(process.env.PORT ?? configService.get<number>('API_PORT', 4000));
  const host = process.env.VERCEL === '1' ? '0.0.0.0' : undefined;
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '');
  if (corsOrigin) {
    const corsOrigins = corsOrigin.split(',').map((o) => o.trim());
    app.enableCors({ origin: corsOrigins, credentials: true });
  } else if (process.env.VERCEL === '1') {
    // Same-origin /api/v1 requests need no CORS; allow preview/prod domains when configured explicitly later.
    app.enableCors({ origin: true, credentials: true });
  } else {
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    });
  }
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const swaggerDefault = nodeEnv === 'production' ? 'false' : 'true';
  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED', swaggerDefault) === 'true';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('B28 Oncodex API')
      .setDescription('B28 Oncodex streaming platform backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
  console.log(`B28 Oncodex API running on http://localhost:${port}`);
  if (
    process.env.DEV_BYPASS_STREAMING === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn('[dev] DEV_BYPASS_STREAMING is enabled — subscription checks are bypassed.');
  }
}

bootstrap().catch((error) => {
  console.error('[bootstrap] Fatal error:', error);
  process.exit(1);
});
