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

  /**
   * Список разрешённых Origin-ов через запятую (например, "https://app.example.com,https://localhost:8080").
   * Пустая строка = разрешить любой (только для dev!). В проде обязательно заполнять.
   */
  ALLOWED_ORIGINS: z.string().default(''),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /**
   * TTS-сервис (нейросетевое озвучивание на базе Silero).
   *
   *  - `TTS_ENABLED=false` — endpoint `/tts/*` возвращает 503; на клиенте
   *    автоматический fallback на устаревший expo-speech. Безопасное выключение.
   *  - `TTS_WORKER_URL` — internal URL sidecar-контейнера с Silero
   *    (http://tts-worker:5000). Наружу НИКОГДА не выставляется.
   *  - `TTS_CACHE_DIR` — директория на диске для готовых WAV. Должна быть
   *    persistent volume (иначе после рестарта кеш теряется, и холодный старт
   *    резко возрастает).
   *  - `TTS_MAX_CACHE_MB` — верхний порог размера кеша. При превышении
   *    эвиктим старые файлы по mtime. Слишком маленький лимит = низкий
   *    cache-hit ratio, слишком большой = риск забить диск. 512 МБ хватает
   *    на ~10000 фраз при 50 КБ/фраза (средняя длительность 1.5 сек).
   *  - `TTS_DEFAULT_VOICE` — выбор голоса Silero v4_ru (`xenia`/`kseniya`/
   *    `baya`/`aidar`/`eugene`). `xenia` — взрослый женский, тёплый, хорошо
   *    подходит для детского контента.
   *  - `TTS_REQUEST_TIMEOUT_MS` — таймаут вызова sidecar. Silero на CPU
   *    синтезирует ~0.5 сек/секунда аудио, с запасом — 15 секунд.
   *  - `TTS_RATE_LIMIT_PER_MIN` — защита от спама. Typical usage ~10/мин
   *    на ребёнка, 60 — с запасом.
   */
  TTS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  TTS_WORKER_URL: z.string().url().default('http://tts-worker:5000'),
  TTS_CACHE_DIR: z.string().default('/data/tts-cache'),
  TTS_MAX_CACHE_MB: z.coerce.number().int().positive().max(10_000).default(512),
  TTS_DEFAULT_VOICE: z
    .enum(['xenia', 'kseniya', 'baya', 'aidar', 'eugene'])
    .default('xenia'),
  TTS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  TTS_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(60),
});

export type AppConfig = z.infer<typeof envSchema>;
