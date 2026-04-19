import { ANIMALS, WORD_PACK } from '@/games/alphabet/content/words';

import type { AlphabetContent, ContentRepo } from './types';

/**
 * Бандл-зашитый контент (тот же 5-словный pack, что в M2).
 * Используется как fallback когда backend недоступен или отключён.
 */
export class LocalContentRepo implements ContentRepo {
  async getAlphabetContent(): Promise<AlphabetContent> {
    return {
      words: WORD_PACK,
      animals: ANIMALS,
    };
  }
}
