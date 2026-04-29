import type {
  AnimalInfo,
  AnimalId,
  Biome,
  WordEntry,
} from '@/games/alphabet/content/types';
import type { ApiClient } from '@/services/api-client/api-client';
import type { DeviceAuthService } from '@/services/auth/device-auth-service';


import type { AlphabetContent, ContentRepo } from './types';

/**
 * DTO серверных ответов. Сервер использует Presenter-паттерн и стабильный контракт.
 */
interface AnimalDto {
  readonly id: string;
  readonly title: string;
  readonly biome: string;
  readonly emoji: string;
  readonly color: string;
  readonly systemPrompt: string;
  readonly scriptedReplies: readonly string[];
}

interface WordDto {
  readonly id: string;
  readonly word: string;
  readonly letters: readonly string[];
  readonly animalId: string;
  readonly letterHints: Readonly<Record<string, string>>;
}

/**
 * Берёт контент с `/content/words` и `/content/animals`.
 * Требует зарегистрированного устройства (DeviceAuthService).
 */
export class BackendContentRepo implements ContentRepo {
  constructor(
    private readonly api: ApiClient,
    private readonly auth: DeviceAuthService,
  ) {}

  async getAlphabetContent(): Promise<AlphabetContent> {
    const session = await this.auth.ensure();
    const [animalsDto, wordsDto] = await Promise.all([
      this.api.request<readonly AnimalDto[]>({
        path: '/content/animals',
        token: session.token,
      }),
      this.api.request<readonly WordDto[]>({
        path: '/content/words',
        token: session.token,
      }),
    ]);

    const animals = this.mapAnimals(animalsDto);
    const words = this.mapWords(wordsDto, animals);
    return { words, animals };
  }

  private mapAnimals(dto: readonly AnimalDto[]): Record<string, AnimalInfo> {
    const out: Record<string, AnimalInfo> = {};
    for (const a of dto) {
      const greeting = a.scriptedReplies[0] ?? `Привет! Я ${a.title.toLowerCase()}.`;
      out[a.id] = {
        id: a.id as AnimalId,
        title: a.title,
        emoji: a.emoji,
        greeting,
        color: a.color,
        biome: isBiome(a.biome) ? a.biome : undefined,
        scriptedReplies: a.scriptedReplies,
      };
    }
    return out;
  }

  private mapWords(dto: readonly WordDto[], animals: Record<string, AnimalInfo>): WordEntry[] {
    const out: WordEntry[] = [];
    for (const w of dto) {
      // Пропускаем слова для которых нет соответствующего животного —
      // это знак рассинхронизации контента, лучше тихо скипнуть, чем падать.
      if (!animals[w.animalId]) continue;
      out.push({
        id: w.id,
        word: w.word,
        letters: w.letters,
        animalId: w.animalId as AnimalId,
        letterHints: w.letterHints,
      });
    }
    return out;
  }
}

function isBiome(value: string): value is Biome {
  return (
    value === 'FARM' ||
    value === 'FOREST' ||
    value === 'SAVANNA' ||
    value === 'SEA' ||
    value === 'JUNGLE' ||
    value === 'ARCTIC'
  );
}
