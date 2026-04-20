import 'reflect-metadata';

import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { AppConfig } from './config/env.schema';

function parseAllowedOrigins(csv: string): string[] {
  return csv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter({
    logger: false,
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = app.get(ConfigService<AppConfig>);
  const allowedOrigins = parseAllowedOrigins(config.getOrThrow('ALLOWED_ORIGINS', { infer: true }));

  // CORS: пустой список (dev) — разрешаем любые Origin-ы;
  // непустой — жёсткий whitelist.
  app.enableCors({
    origin: allowedOrigins.length === 0 ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(compress, { encodings: ['gzip', 'deflate'] });

  const port = config.getOrThrow('PORT', { infer: true });
  const host = config.getOrThrow('HOST', { infer: true });
  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(
    `Сервер 90games запущен на http://${host}:${port} (CORS: ${
      allowedOrigins.length === 0 ? 'все Origin-ы' : allowedOrigins.join(', ')
    })`,
  );
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Фатальная ошибка запуска сервера:', err);
  process.exit(1);
});
