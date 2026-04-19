import type { ContentWord } from '@prisma/client';

export class WordPresenter {
  readonly id: string;
  readonly word: string;
  readonly letters: readonly string[];
  readonly animalId: string;
  readonly letterHints: Readonly<Record<string, string>>;
  readonly minAge: number;
  readonly version: number;

  constructor(word: ContentWord) {
    this.id = word.id;
    this.word = word.word;
    this.letters = word.letters;
    this.animalId = word.animalId;
    this.letterHints = WordPresenter.sanitizeHints(word.letterHints);
    this.minAge = word.minAge;
    this.version = word.version;
  }

  static collection(words: readonly ContentWord[]): WordPresenter[] {
    return words.map((w) => new WordPresenter(w));
  }

  private static sanitizeHints(raw: unknown): Readonly<Record<string, string>> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  }
}
