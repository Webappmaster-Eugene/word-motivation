import { useEffect, useRef, useState } from 'react';

import { useService } from '@/services/di/provider';
import type { LetterMasterySnapshot } from '@/services/mastery/letter-mastery';
import { orderWordsByMastery } from '@/services/mastery/letter-mastery';

import type { WordEntry } from '../content/types';

interface UseLetterMasteryResult {
  readonly snapshot: LetterMasterySnapshot;
  readonly loaded: boolean;
  readonly ordered: readonly WordEntry[];
  recordLetter(letter: string, correct: boolean): void;
}

/**
 * Загружает mastery-snapshot один раз и сортирует words по сложности букв.
 * Запись в storage — fire-and-forget (ошибки только логируются).
 */
export function useLetterMastery(words: readonly WordEntry[]): UseLetterMasteryResult {
  const repo = useService('letterMastery');
  const [snapshot, setSnapshot] = useState<LetterMasterySnapshot>({});
  const [loaded, setLoaded] = useState(false);
  const orderedRef = useRef<readonly WordEntry[]>(words);

  useEffect(() => {
    let cancelled = false;
    repo
      .load()
      .then((snap) => {
        if (cancelled) return;
        setSnapshot(snap);
        orderedRef.current = orderWordsByMastery(words, snap);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSnapshot({});
        orderedRef.current = words;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, words]);

  const recordLetter = (letter: string, correct: boolean): void => {
    repo.record(letter, correct).catch((err) => {
      if (__DEV__) {
         
        console.warn('LetterMastery.record упал:', err);
      }
    });
  };

  return {
    snapshot,
    loaded,
    ordered: orderedRef.current,
    recordLetter,
  };
}
