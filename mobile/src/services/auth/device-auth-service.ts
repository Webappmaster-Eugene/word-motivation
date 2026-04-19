import type { ApiClient } from '@/services/api-client/api-client';

import { deviceStorage, type DeviceStorage } from './device-storage';

export interface DeviceSession {
  readonly token: string;
  readonly childId: string;
  readonly ageBand: 'AGE_6_8' | 'AGE_9_12';
}

interface DeviceRegisterResponse {
  readonly token: string;
  readonly childId: string;
  readonly ageBand: 'AGE_6_8' | 'AGE_9_12';
}

/**
 * Анонимная авторизация устройства.
 *  - Генерирует UUID v4 при первом запуске и сохраняет в persistent storage.
 *  - Обменивает deviceId на JWT через POST /auth/device.
 *  - Кеширует session в памяти, параллельные вызовы ensure() шарят один in-flight promise.
 */
export class DeviceAuthService {
  private session: DeviceSession | null = null;
  private inFlight: Promise<DeviceSession> | null = null;

  constructor(
    private readonly api: ApiClient,
    private readonly storage: DeviceStorage = deviceStorage,
  ) {}

  async ensure(): Promise<DeviceSession> {
    if (this.session) return this.session;
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.register()
      .then((s) => {
        this.session = s;
        return s;
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }

  current(): DeviceSession | null {
    return this.session;
  }

  /** Сбросить кеш в памяти (например, после 401). Persistent deviceId сохраняется. */
  invalidate(): void {
    this.session = null;
    this.inFlight = null;
  }

  private async register(): Promise<DeviceSession> {
    const deviceId = await this.getOrCreateDeviceId();
    const response = await this.api.request<DeviceRegisterResponse>({
      method: 'POST',
      path: '/auth/device',
      body: { deviceId },
    });
    return response;
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.storage.get();
    if (existing && existing.length >= 8) return existing;
    const generated = generateUuid();
    await this.storage.set(generated);
    return generated;
  }
}

function generateUuid(): string {
  const g = globalThis as unknown as {
    crypto?: { randomUUID?: () => string; getRandomValues?: (arr: Uint8Array) => Uint8Array };
  };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  if (g.crypto?.getRandomValues) {
    // RFC 4122 v4
    const bytes = g.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Последний фолбэк — Math.random (не криптостойкий, только для dev).
  const rnd = () => Math.random().toString(16).slice(2, 10).padStart(8, '0');
  return `${rnd()}-${rnd().slice(0, 4)}-4${rnd().slice(0, 3)}-${rnd().slice(0, 4)}-${rnd()}${rnd().slice(0, 4)}`;
}

export const __testingUuid = generateUuid;
