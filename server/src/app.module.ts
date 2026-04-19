import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { envSchema, type AppConfig } from './config/env.schema';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ContentModule } from './modules/content/content.module';
import { HealthModule } from './modules/health/health.module';
import { ProgressModule } from './modules/progress/progress.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.development.env', '.env'],
      validate: (raw): AppConfig => {
        const parsed = envSchema.safeParse(raw);
        if (!parsed.success) {
          const formatted = parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
          throw new Error(`Некорректные переменные окружения: ${formatted}`);
        }
        return parsed.data;
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'HH:MM:ss.l' },
              }
            : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    AuthModule,
    ContentModule,
    ProgressModule,
    ChatModule,
    HealthModule,
  ],
})
export class AppModule {}
