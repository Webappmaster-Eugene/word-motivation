import Constants from 'expo-constants';
import { z } from 'zod';

/**
 * Схема `extra`-поля из `app.config.ts`. Валидируем на старте, чтобы падать
 * явно и на одной строке, а не по случайным undefined-прочтениям глубоко в коде.
 */
const extraSchema = z.object({
  apiBaseUrl: z
    .string()
    .url('apiBaseUrl должен быть валидным URL')
    .default('http://localhost:3000'),
});

function readExtra(): z.infer<typeof extraSchema> {
  const raw = Constants.expoConfig?.extra ?? {};
  const parsed = extraSchema.safeParse(raw);
  if (!parsed.success) {
    const formatted = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Некорректная конфигурация Expo (extra): ${formatted}`);
  }
  return parsed.data;
}

const cached = readExtra();

export const env = {
  apiBaseUrl: cached.apiBaseUrl.replace(/\/+$/, ''), // без trailing-slash
} as const;

export type Env = typeof env;
