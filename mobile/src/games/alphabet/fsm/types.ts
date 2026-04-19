import type { WordEntry } from '../content/types';

export const MAX_RETRIES = 3;

export type LetterMode = 'normal' | 'letter_inside_word';

export interface AttemptStats {
  readonly correct: number;
  readonly wrong: number;
  readonly autoAdvanced: number;
}

export interface AlphabetContext {
  readonly words: readonly WordEntry[];
  readonly wordIndex: number;
  readonly letterIndex: number;
  readonly letterRetries: number;
  readonly wordRetries: number;
  readonly mode: LetterMode;
  readonly stats: AttemptStats;
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
