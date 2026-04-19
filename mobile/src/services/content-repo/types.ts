import type { AnimalInfo, WordEntry } from '@/games/alphabet/content/types';

export interface AlphabetContent {
  readonly words: readonly WordEntry[];
  readonly animals: Readonly<Record<string, AnimalInfo>>;
}

export interface ContentRepo {
  getAlphabetContent(): Promise<AlphabetContent>;
}
