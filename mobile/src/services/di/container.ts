import { Platform } from 'react-native';

import { env } from '@/config/env';
import { SkiaFallbackScene } from '@/services/animal-scene/skia-fallback-scene';
import { ApiClient } from '@/services/api-client/api-client';
import { DeviceAuthService } from '@/services/auth/device-auth-service';
import { BackendContentRepo } from '@/services/content-repo/backend-content-repo';
import { LocalContentRepo } from '@/services/content-repo/local-content-repo';
import { ResilientContentRepo } from '@/services/content-repo/resilient-content-repo';
import { LlmChatClient } from '@/services/llm-chat/llm-chat';
import { LetterMasteryRepo } from '@/services/mastery/letter-mastery';
import { LocalUnlockedRepo } from '@/services/mastery/local-unlocked';
import { ProgressApi } from '@/services/progress-api/progress-api';
import { StubAsr } from '@/services/speech-recognition/stub-asr';
import type { SpeechRecognitionService } from '@/services/speech-recognition/types';
import { WebSpeechAsr } from '@/services/speech-recognition/web-speech-asr';
import { ExpoSpeechTts } from '@/services/speech-synthesis/expo-speech-tts';
import { ServerTts } from '@/services/speech-synthesis/server-tts';
import type { SpeechSynthesisService } from '@/services/speech-synthesis/types';

import type { ServiceBundle } from './types';

/**
 * Выбирает реализацию TTS. Безопасный default: `ServerTts` поверх Silero с
 * внутренним автофолбэком на `ExpoSpeechTts` при любой сетевой/серверной
 * ошибке. Принудительный `native` — если `EXPO_PUBLIC_TTS_MODE=native`
 * (локальный dev без sidecar'а, или нужно быстро вернуть старое поведение).
 *
 * Важный инвариант: даже в режиме `server` базовый `ExpoSpeechTts` всегда
 * создаётся (как fallback). Это гарантирует, что озвучка работает в любом
 * режиме — пусть хуже по качеству, но не молча.
 */
function pickSpeechSynthesis(
  apiClient: ApiClient,
  deviceAuth: DeviceAuthService,
): SpeechSynthesisService {
  const expoTts = new ExpoSpeechTts();
  if (env.ttsMode === 'native') return expoTts;
  return new ServerTts(apiClient, deviceAuth, {
    apiBaseUrl: env.apiBaseUrl,
    defaultVoice: 'baya',
    fallback: expoTts,
  });
}

function pickSpeechRecognition(): SpeechRecognitionService {
  if (Platform.OS === 'web') {
    return WebSpeechAsr.isSupported() ? new WebSpeechAsr() : new StubAsr();
  }
  // Native (Android/iOS): expo-speech-recognition. Лениво импортируем,
  // чтобы при web-сборке не тянуть native-модуль. Дополнительно — sync-проверка
  // через ducktype `isModuleLoaded`: если native-часть не залинкована (dev-client
  // без перебилда после установки пакета), отдаём StubAsr — иначе при первом
  // обращении к микрофону получим JSI-краш.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExpoSpeechRecognitionAsr } = require('@/services/speech-recognition/expo-speech-recognition-asr') as {
      ExpoSpeechRecognitionAsr: new () => SpeechRecognitionService & {
        isModuleLoaded?: () => boolean;
      };
    };
    const candidate = new ExpoSpeechRecognitionAsr();
    if (typeof candidate.isModuleLoaded === 'function' && !candidate.isModuleLoaded()) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('expo-speech-recognition модуль не загрузился, fallback на StubAsr');
      }
      return new StubAsr();
    }
    return candidate;
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('expo-speech-recognition не установлен, падаем на stub:', err);
    }
    return new StubAsr();
  }
}

export function createServiceBundle(): ServiceBundle {
  const apiClient = new ApiClient({ baseUrl: env.apiBaseUrl });
  const deviceAuth = new DeviceAuthService(apiClient);
  const backendRepo = new BackendContentRepo(apiClient, deviceAuth);
  const localRepo = new LocalContentRepo();
  const contentRepo = new ResilientContentRepo(backendRepo, localRepo, (err) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Контент берём из локального фолбэка:', err);
    }
  });

  const progressApi = new ProgressApi(apiClient, deviceAuth);
  const llmChat = new LlmChatClient(apiClient, deviceAuth);
  const letterMastery = new LetterMasteryRepo();
  const localUnlocked = new LocalUnlockedRepo();

  return {
    speechRecognition: pickSpeechRecognition(),
    speechSynthesis: pickSpeechSynthesis(apiClient, deviceAuth),
    animalScene: new SkiaFallbackScene(),
    apiClient,
    deviceAuth,
    contentRepo,
    progressApi,
    llmChat,
    letterMastery,
    localUnlocked,
  };
}
