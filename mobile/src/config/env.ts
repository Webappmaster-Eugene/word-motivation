import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

/**
 * Platform-specific дефолт для apiBaseUrl.
 *  - `web`      → `http://localhost:3000` (dev-сервер на той же машине).
 *  - `android`  → `http://10.0.2.2:3000` (loopback из эмулятора на хост).
 *  - `ios` и пр. → `http://localhost:3000`.
 * Явный `EXPO_PUBLIC_API_BASE_URL` всегда перекрывает дефолт.
 */
const defaultApiBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

/**
 * Схема `extra`-поля из `app.config.ts`. Валидируем на старте, чтобы падать
 * явно и на одной строке, а не по случайным undefined-прочтениям глубоко в коде.
 */
const extraSchema = z.object({
  apiBaseUrl: z
    .string()
    .url('apiBaseUrl должен быть валидным URL')
    .default(defaultApiBaseUrl),
  /**
   * Режим TTS на клиенте:
   *  - `server` — нейросетевой Silero через backend (по умолчанию, лучшее качество).
   *  - `native` — принудительно expo-speech (fallback/deprecated): использовать
   *    когда нужно отключить серверный TTS (локальный dev без sidecar'а,
   *    тесты). Запись в `EXPO_PUBLIC_TTS_MODE`.
   */
  ttsMode: z.enum(['server', 'native']).default('server'),
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
  ttsMode: cached.ttsMode,
} as const;

export type Env = typeof env;
