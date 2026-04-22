import type { ApiClient } from '@/services/api-client/api-client';
import type { DeviceAuthService } from '@/services/auth/device-auth-service';

export type AttemptKind = 'LETTER' | 'WORD';

export interface StartSessionInput {
  readonly gameId: string;
}

export interface RecordAttemptInput {
  readonly sessionId: string;
  readonly kind: AttemptKind;
  readonly wordId?: string;
  readonly expected: string;
  readonly heard: string;
  readonly correct: boolean;
  readonly latencyMs?: number;
}

export interface EndSessionInput {
  readonly sessionId: string;
  readonly summaryStats?: Record<string, unknown>;
  readonly fsmSnapshot?: unknown;
}

export interface SessionResponse {
  readonly id: string;
  readonly gameId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

export interface UnlockedAnimalResponse {
  readonly animalId: string;
  readonly unlockedAt: string;
  readonly visits: number;
}

export interface ResetProgressResponse {
  readonly unlockedAnimals: number;
  readonly sessions: number;
  readonly attempts: number;
}

/**
 * Клиент к /progress/*. Все методы требуют предварительной регистрации устройства
 * (DeviceAuthService.ensure()) — токен пробрасывается автоматически.
 *
 * Методы бросают исключения наверх; вызывающий код решает стратегию:
 * либо graceful-skip (лог + игнор), либо retry-queue (future work).
 */
export class ProgressApi {
  constructor(
    private readonly api: ApiClient,
    private readonly auth: DeviceAuthService,
  ) {}

  async startSession(input: StartSessionInput): Promise<SessionResponse> {
    const session = await this.auth.ensure();
    return this.api.request<SessionResponse>({
      method: 'POST',
      path: '/progress/session',
      token: session.token,
      body: { gameId: input.gameId },
    });
  }

  async endSession(input: EndSessionInput): Promise<SessionResponse> {
    const session = await this.auth.ensure();
    return this.api.request<SessionResponse>({
      method: 'POST',
      path: `/progress/session/${input.sessionId}/end`,
      token: session.token,
      body: {
        ...(input.summaryStats ? { summaryStats: input.summaryStats } : {}),
        ...(input.fsmSnapshot !== undefined ? { fsmSnapshot: input.fsmSnapshot } : {}),
      },
    });
  }

  async recordAttempt(input: RecordAttemptInput): Promise<void> {
    const session = await this.auth.ensure();
    await this.api.request<{ ok: true }>({
      method: 'POST',
      path: '/progress/attempt',
      token: session.token,
      body: input,
    });
  }

  async unlockAnimal(animalId: string): Promise<UnlockedAnimalResponse> {
    const session = await this.auth.ensure();
    return this.api.request<UnlockedAnimalResponse>({
      method: 'POST',
      path: '/progress/unlock',
      token: session.token,
      body: { animalId },
    });
  }

  async listUnlocked(): Promise<readonly UnlockedAnimalResponse[]> {
    const session = await this.auth.ensure();
    return this.api.request<readonly UnlockedAnimalResponse[]>({
      path: '/progress/unlocked',
      token: session.token,
    });
  }

  /**
   * Полностью сносит прогресс ребёнка на сервере (unlocked + sessions + attempts).
   * Вызывается из settings → «Сбросить прогресс». Без этого метода сброс на
   * клиенте убирал только localUnlocked, а listUnlocked() при следующем открытии
   * зоопарка снова наливал всех животных как открытых — визуально выглядело, что
   * сброс не работает.
   */
  async resetProgress(): Promise<ResetProgressResponse> {
    const session = await this.auth.ensure();
    return this.api.request<ResetProgressResponse>({
      method: 'DELETE',
      path: '/progress/reset',
      token: session.token,
    });
  }
}
