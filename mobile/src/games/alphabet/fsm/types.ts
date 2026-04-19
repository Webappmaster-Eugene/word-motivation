import type { WordEntry } from '../content/types';

export const MAX_RETRIES = 3;

export type LetterMode = 'normal' | 'letter_inside_word';

export interface AttemptStats {
  readonly correct: number;
  readonly wrong: number;
  readonly autoAdvanced: number;
}

export interface CurrentWordStats {
  readonly wrong: number;
  readonly autoAdvanced: boolean;
}

export interface AlphabetContext {
  readonly words: readonly WordEntry[];
  readonly wordIndex: number;
  readonly letterIndex: number;
  readonly letterRetries: number;
  readonly wordRetries: number;
  readonly mode: LetterMode;
  readonly stats: AttemptStats;
  readonly currentWordStats: CurrentWordStats;
  /** Сколько звёзд получено за ПОСЛЕДНЕЕ завершённое слово. Показывается UI. */
  readonly lastWordStars: number;
  /** Всего звёзд за сессию. */
  readonly totalStars: number;
}

/**
 * 3 звезды — безупречно (без ошибок и без авто-продвижений).
 * 2 звезды — 1-2 ошибки, без авто-продвижений.
 * 1 звезда — 3+ ошибок или любое авто-продвижение (fail-soft).
 */
export function starsForWord(stats: CurrentWordStats): number {
  if (stats.autoAdvanced) return 1;
  if (stats.wrong === 0) return 3;
  if (stats.wrong <= 2) return 2;
  return 1;
}

export type AlphabetEvent =
  | { type: 'START' }
  | { type: 'LETTER_SHOWN' }
  | { type: 'SUBMIT_LETTER'; value: string }
  | { type: 'SUBMIT_WORD'; value: string }
  | { type: 'HINT_DONE' }
  | { type: 'SCENE_READY' }
  | { type: 'EXIT_CONVERSATION' }
  | { type: 'RESTART' };

/**
 * Snapshot-типы состояний для удобной проверки в UI (`state.matches('showLetter')`).
 * Лежит здесь для того, чтобы UI не тянул XState-типы напрямую.
 */
export type AlphabetStateValue =
  | 'idle'
  | 'loadingWord'
  | 'showLetter'
  | 'listenLetter'
  | 'hintLetter'
  | 'showWord'
  | 'listenWord'
  | 'hintWord'
  | 'revealAnimal'
  | 'sceneReady'
  | 'conversation'
  | 'done';
