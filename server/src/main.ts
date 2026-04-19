import 'reflect-metadata';

import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

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

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(compress, { encodings: ['gzip', 'deflate'] });

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(`Сервер 90games запущен на http://${host}:${port}`);
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Фатальная ошибка запуска сервера:', err);
  process.exit(1);
});
