import { useCallback, useEffect, useRef, useState } from 'react';

import { kvStorage } from '@/services/storage/kv-storage';

const STORAGE_KEY = 'alphabet:progress:v1';

interface StoredProgress {
  wordIndex: number;
  totalStars: number;
}

export interface SessionProgress {
  readonly loaded: boolean;
  readonly wordIndex: number;
  readonly totalStars: number;
  save(partial: StoredProgress): void;
}

function isValid(value: unknown): value is StoredProgress {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.wordIndex === 'number' &&
    Number.isFinite(v.wordIndex) &&
    v.wordIndex >= 0 &&
    typeof v.totalStars === 'number' &&
    Number.isFinite(v.totalStars) &&
    v.totalStars >= 0
  );
}

/**
 * Загружает/сохраняет прогресс сессии алфавита в KV-storage (SecureStore
 * на native, localStorage на web). Ребёнок, закрывший и заново открывший
 * игру, должен продолжить со слова, на котором остановился.
 *
 * Пока идёт первичная загрузка — `loaded=false`; UI должен ждать, иначе
 * FSM стартует с wordIndex=0 и прогресс потеряется.
 *
 * Сохранение — fire-and-forget: любые ошибки storage проглатываются,
 * игра не должна ломаться из-за места для записи.
 */
export function useSessionProgress(wordsLength: number): SessionProgress {
  const [loaded, setLoaded] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void kvStorage
      .getJson<StoredProgress>(STORAGE_KEY)
      .then((value) => {
        if (cancelled) return;
        if (isValid(value)) {
          // Защищаемся от изменённого wordsLength: если сохранённый индекс
          // выходит за границы текущего контента — начинаем с нуля.
          const safeIndex = wordsLength > 0 ? value.wordIndex % wordsLength : 0;
          setWordIndex(safeIndex);
          setTotalStars(value.totalStars);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [wordsLength]);

  const save = useCallback((partial: StoredProgress) => {
    const serialized = JSON.stringify(partial);
    // Защита от лишних записей — если ничего не изменилось, пропускаем.
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    void kvStorage.setJson(STORAGE_KEY, partial).catch(() => {
      /* non-fatal — игре не нужен persist для работы */
    });
  }, []);

  return { loaded, wordIndex, totalStars, save };
}
