import { useEffect, useRef } from 'react';

import { useService } from '@/services/di/provider';

import type { WordEntry } from '../content/types';
import type { AlphabetStateValue } from '../fsm/types';

interface UseProgressSyncOptions {
  readonly stateValue: AlphabetStateValue | string;
  readonly gameId: string;
  readonly word: WordEntry | null;
  readonly letter: string | null;
  readonly wordRetries: number;
  readonly letterRetries: number;
  readonly statsCorrect: number;
  readonly statsWrong: number;
  readonly animalId: string | null;
}

/**
 * Fire-and-forget синхронизация прогресса с backend.
 *
 *  - idle → loadingWord: старт первой сессии (если ещё не стартовала).
 *  - done: завершаем сессию итоговой статистикой.
 *  - revealAnimal (+ animalId): помечаем животное unlocked.
 *  - изменения `statsCorrect` / `statsWrong`: отправляем attempt.
 *
 * Любые ошибки сети/API проглатываются: игра продолжается в offline-режиме
 * (backend-side данные будут неполными, что ок для MVP). В M9+ добавим
 * retry-queue на SQLite.
 */
export function useProgressSync({
  stateValue,
  gameId,
  word,
  letter,
  statsCorrect,
  statsWrong,
  animalId,
}: UseProgressSyncOptions): void {
  const progress = useService('progressApi');
  const localUnlocked = useService('localUnlocked');

  const sessionIdRef = useRef<string | null>(null);
  const lastCorrectRef = useRef(0);
  const lastWrongRef = useRef(0);
  const sessionEndedRef = useRef(false);
  const unlockedAnimalsRef = useRef<Set<string>>(new Set());

  // Start-of-session: первый переход из idle запускает сессию на бэке.
  useEffect(() => {
    if (sessionIdRef.current || sessionEndedRef.current) return;
    if (stateValue === 'idle') return; // ещё не стартовали

    let cancelled = false;
    progress
      .startSession({ gameId })
      .then((session) => {
        if (!cancelled) sessionIdRef.current = session.id;
      })
      .catch((err) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('progress.startSession упал, играем оффлайн:', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stateValue, gameId, progress]);

  // Attempts — сравниваем счётчики stats, при росте шлём новый attempt.
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !word) return;
    if (statsCorrect === lastCorrectRef.current && statsWrong === lastWrongRef.current) return;

    const correctDelta = statsCorrect - lastCorrectRef.current;
    const wrongDelta = statsWrong - lastWrongRef.current;
    lastCorrectRef.current = statsCorrect;
    lastWrongRef.current = statsWrong;

    const kind: 'LETTER' | 'WORD' =
      stateValue === 'listenWord' || stateValue === 'hintWord' || stateValue === 'revealAnimal'
        ? 'WORD'
        : 'LETTER';
    const expected = kind === 'WORD' ? word.word : (letter ?? '');

    if (correctDelta > 0 && expected) {
      progress
        .recordAttempt({
          sessionId,
          kind,
          wordId: word.id,
          expected,
          heard: expected,
          correct: true,
        })
        .catch(() => {
          /* graceful-skip */
        });
    } else if (wrongDelta > 0 && expected) {
      progress
        .recordAttempt({
          sessionId,
          kind,
          wordId: word.id,
          expected,
          heard: '',
          correct: false,
        })
        .catch(() => {
          /* graceful-skip */
        });
    }
  }, [statsCorrect, statsWrong, stateValue, word, letter, progress]);

  // Unlock animal — один раз на сессию на каждое открытие.
  // Пишем в local-store немедленно + пытаемся на backend.
  useEffect(() => {
    if (stateValue !== 'revealAnimal' || !animalId) return;
    if (unlockedAnimalsRef.current.has(animalId)) return;
    unlockedAnimalsRef.current.add(animalId);
    void localUnlocked.unlock(animalId).catch(() => {
      /* non-fatal */
    });
    progress.unlockAnimal(animalId).catch((err) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('progress.unlockAnimal упал (local-unlock сохранён):', err);
      }
    });
  }, [stateValue, animalId, progress, localUnlocked]);

  // End-of-session: при unmount или done-состоянии завершаем сессию.
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    if (stateValue !== 'done' || sessionEndedRef.current) return;
    sessionEndedRef.current = true;

    progress
      .endSession({
        sessionId,
        summaryStats: {
          correct: statsCorrect,
          wrong: statsWrong,
        },
      })
      .catch(() => {
        /* graceful-skip */
      });
  }, [stateValue, statsCorrect, statsWrong, progress]);
}
