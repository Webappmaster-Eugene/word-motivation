import type { KvStorage } from '@/services/storage/kv-storage';
import { kvStorage } from '@/services/storage/kv-storage';

export interface UnlockedAnimalRecord {
  readonly unlockedAt: string;
  readonly visits: number;
}

type Snapshot = Readonly<Record<string, UnlockedAnimalRecord>>;

const STORAGE_KEY = 'babyfunner.unlocked-animals.v1';

/**
 * Локальное хранилище открытых животных.
 *
 * Используется как немедленный UI-фидбэк и offline-fallback, когда backend
 * `/progress/unlock` недоступен. При восстановлении соединения данные
 * дублируются в БД через `ProgressApi.unlockAnimal` (fire-and-forget).
 */
export class LocalUnlockedRepo {
  private cache: Map<string, UnlockedAnimalRecord> | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(private readonly storage: KvStorage = kvStorage) {}

  async load(): Promise<Snapshot> {
    await this.ensureLoaded();
    return Object.fromEntries(this.cache!.entries());
  }

  async unlock(animalId: string): Promise<void> {
    await this.ensureLoaded();
    const prev = this.cache!.get(animalId);
    const next: UnlockedAnimalRecord = {
      unlockedAt: prev?.unlockedAt ?? new Date().toISOString(),
      visits: (prev?.visits ?? 0) + 1,
    };
    this.cache!.set(animalId, next);
    await this.storage.setJson(STORAGE_KEY, Object.fromEntries(this.cache!.entries()));
  }

  async reset(): Promise<void> {
    this.cache = new Map();
    await this.storage.delete(STORAGE_KEY);
  }

  snapshot(): Snapshot {
    if (!this.cache) return {};
    return Object.fromEntries(this.cache.entries());
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache) return;
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.storage
      .getJson<Snapshot>(STORAGE_KEY)
      .then((data) => {
        this.cache = new Map(Object.entries(data ?? {}));
      })
      .catch(() => {
        this.cache = new Map();
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }
}
