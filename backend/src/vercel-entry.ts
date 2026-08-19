import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express } from 'express';
import express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

let cachedServer: Express | undefined;

async function createServer(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  if (process.env.VERCEL === '1') {
    expressApp.set('trust proxy', 1);
  }

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return expressApp;
}

async function handler(req: express.Request, res: express.Response) {
  if (!cachedServer) {
    cachedServer = await createServer();
  }
  return cachedServer(req, res);
}

export = handler;
