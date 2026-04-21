import type { AnimalSceneService } from '@/services/animal-scene/types';
import type { ApiClient } from '@/services/api-client/api-client';
import type { DeviceAuthService } from '@/services/auth/device-auth-service';
import type { ContentRepo } from '@/services/content-repo/types';
import type { LlmChatClient } from '@/services/llm-chat/llm-chat';
import type { LocalUnlockedRepo } from '@/services/mastery/local-unlocked';
import type { LetterMasteryRepo } from '@/services/mastery/letter-mastery';
import type { ProgressApi } from '@/services/progress-api/progress-api';
import type { SpeechRecognitionService } from '@/services/speech-recognition/types';
import type { SpeechSynthesisService } from '@/services/speech-synthesis/types';

export interface ServiceBundle {
  readonly speechRecognition: SpeechRecognitionService;
  readonly speechSynthesis: SpeechSynthesisService;
  readonly animalScene: AnimalSceneService;
  readonly apiClient: ApiClient;
  readonly deviceAuth: DeviceAuthService;
  readonly contentRepo: ContentRepo;
  readonly progressApi: ProgressApi;
  readonly llmChat: LlmChatClient;
  readonly letterMastery: LetterMasteryRepo;
  readonly localUnlocked: LocalUnlockedRepo;
}

export type ServiceToken<T> = symbol & { readonly __brand: T };

export const createToken = <T>(description: string): ServiceToken<T> =>
  Symbol(description) as ServiceToken<T>;
