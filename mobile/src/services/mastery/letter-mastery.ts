import type { KvStorage } from '@/services/storage/kv-storage';
import { kvStorage } from '@/services/storage/kv-storage';

export interface LetterStats {
  readonly correct: number;
  readonly wrong: number;
  readonly lastSeenAt: string; // ISO
}

export type LetterMasterySnapshot = Readonly<Record<string, LetterStats>>;

const STORAGE_KEY = 'babyfunner.mastery.letters.v1';

/**
 * Хранит статистику по буквам для spaced repetition-лайт.
 * Формула слабости буквы — `wrongRate`:
 *   wrongRate = wrong / max(1, correct + wrong)
 * Буквы с wrongRate >= THRESHOLD_WEAK считаются «сложными»;
 * выбор слов смещается в их сторону (см. `orderWordsByMastery`).
 */
export class LetterMasteryRepo {
  private cache: Map<string, LetterStats> | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(private readonly storage: KvStorage = kvStorage) {}

  async load(): Promise<LetterMasterySnapshot> {
    await this.ensureLoaded();
    return Object.fromEntries(this.cache!.entries());
  }

  async record(letter: string, correct: boolean): Promise<void> {
    await this.ensureLoaded();
    const key = normalise(letter);
    if (!key) return;
    const prev = this.cache!.get(key) ?? { correct: 0, wrong: 0, lastSeenAt: new Date(0).toISOString() };
    const next: LetterStats = {
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
      lastSeenAt: new Date().toISOString(),
    };
    this.cache!.set(key, next);
    await this.storage.setJson(STORAGE_KEY, Object.fromEntries(this.cache!.entries()));
  }

  async reset(): Promise<void> {
    this.cache = new Map();
    await this.storage.delete(STORAGE_KEY);
  }

  /** Синхронный snapshot — годится для UI, после load(). */
  snapshot(): LetterMasterySnapshot {
    if (!this.cache) return {};
    return Object.fromEntries(this.cache.entries());
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache) return;
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.storage
      .getJson<LetterMasterySnapshot>(STORAGE_KEY)
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

function normalise(letter: string): string {
  return letter.trim().toLowerCase().replace(/ё/g, 'е');
}

/**
 * Оценка «слабости» буквы: 0 (легко) — 1 (сложно).
 * Формула учитывает давно не виденные буквы (bonus за забывание).
 */
export function letterWeakness(stats: LetterStats | undefined, nowMs = Date.now()): number {
  if (!stats) return 0.5; // неизвестные буквы — средне, чтобы попадали в рандом
  const total = stats.correct + stats.wrong;
  const wrongRate = total === 0 ? 0.5 : stats.wrong / total;
  const lastSeenMs = Date.parse(stats.lastSeenAt);
  const hoursSinceSeen = Number.isFinite(lastSeenMs)
    ? Math.max(0, (nowMs - lastSeenMs) / (60 * 60 * 1000))
    : 24 * 30; // очень давно
  const forgetBonus = Math.min(0.3, hoursSinceSeen / (24 * 7)); // +до 0.3 за неделю забвения
  return Math.min(1, wrongRate + forgetBonus);
}

export interface WordWithLetters {
  readonly letters: readonly string[];
}

/**
 * Сортирует слова так, чтобы первыми шли те, где самые «слабые» буквы.
 * Детерминированный quicksort по score, не меняет исходный массив.
 */
export function orderWordsByMastery<T extends WordWithLetters>(
  words: readonly T[],
  mastery: LetterMasterySnapshot,
  nowMs = Date.now(),
): T[] {
  const scored = words.map((w) => {
    const letterScores = w.letters.map((l) => letterWeakness(mastery[normalise(l)], nowMs));
    const maxWeakness = letterScores.reduce((a, b) => Math.max(a, b), 0);
    const avgWeakness =
      letterScores.length === 0 ? 0 : letterScores.reduce((a, b) => a + b, 0) / letterScores.length;
    // total = макс (главный критерий) + avg (tie-breaker) + небольшой случайный шум
    const score = maxWeakness * 1 + avgWeakness * 0.3;
    return { word: w, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.word);
}
