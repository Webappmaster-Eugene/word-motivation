import { Platform } from 'react-native';

import { env } from '@/config/env';
import { SkiaFallbackScene } from '@/services/animal-scene/skia-fallback-scene';
import { ApiClient } from '@/services/api-client/api-client';
import { DeviceAuthService } from '@/services/auth/device-auth-service';
import { BackendContentRepo } from '@/services/content-repo/backend-content-repo';
import { LocalContentRepo } from '@/services/content-repo/local-content-repo';
import { ResilientContentRepo } from '@/services/content-repo/resilient-content-repo';
import { LlmChatClient } from '@/services/llm-chat/llm-chat';
import { ProgressApi } from '@/services/progress-api/progress-api';
import { StubAsr } from '@/services/speech-recognition/stub-asr';
import type { SpeechRecognitionService } from '@/services/speech-recognition/types';
import { WebSpeechAsr } from '@/services/speech-recognition/web-speech-asr';
import { ExpoSpeechTts } from '@/services/speech-synthesis/expo-speech-tts';

import type { ServiceBundle } from './types';

function pickSpeechRecognition(): SpeechRecognitionService {
  if (Platform.OS === 'web' && WebSpeechAsr.isSupported()) return new WebSpeechAsr();
  return new StubAsr();
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

  return {
    speechRecognition: pickSpeechRecognition(),
    speechSynthesis: new ExpoSpeechTts(),
    animalScene: new SkiaFallbackScene(),
    apiClient,
    deviceAuth,
    contentRepo,
    progressApi,
    llmChat,
  };
}
