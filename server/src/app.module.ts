import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { envSchema, type AppConfig } from './config/env.schema';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ContentModule } from './modules/content/content.module';
import { HealthModule } from './modules/health/health.module';
import { ProgressModule } from './modules/progress/progress.module';
import { TtsModule } from './modules/tts/tts.module';

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
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => ({
        throttlers: [
          {
            name: 'chat-ip',
            ttl: 60_000,
            limit: config.getOrThrow('RATE_LIMIT_CHAT_IP_PER_MIN', { infer: true }),
          },
          {
            name: 'tts',
            ttl: 60_000,
            limit: config.getOrThrow('TTS_RATE_LIMIT_PER_MIN', { infer: true }),
          },
        ],
      }),
    }),
    PrismaModule,
    AuthModule,
    ContentModule,
    ProgressModule,
    ChatModule,
    TtsModule,
    HealthModule,
  ],
})
export class AppModule {}
