import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET должен быть не короче 16 символов'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),

  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-haiku-4-5'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),

  RATE_LIMIT_CHAT_PER_MIN: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_CHAT_IP_PER_MIN: z.coerce.number().int().positive().default(120),

  DEVICE_ID_SALT: z.string().min(8, 'DEVICE_ID_SALT должен быть не короче 8 символов'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppConfig = z.infer<typeof envSchema>;
