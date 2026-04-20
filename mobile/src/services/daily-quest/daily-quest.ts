import type { AnimalInfo } from '@/games/alphabet/content/types';

/**
 * Простой FNV-1a 32-bit хэш строки. Используется для детерминированного
 * выбора «животного дня» — один и тот же результат для всех игроков в
 * заданный день, без обращения к серверу.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * ISO-дата (YYYY-MM-DD) в локальной TZ устройства.
 */
export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Детерминированный выбор «животного дня» на основе даты.
 * Тот же день → тот же индекс (в рамках передаваемого массива).
 */
export function pickDailyAnimal(
  animals: readonly AnimalInfo[],
  dateIso: string = todayIsoDate(),
): AnimalInfo | null {
  if (animals.length === 0) return null;
  const idx = fnv1a(dateIso) % animals.length;
  return animals[idx] ?? null;
}

export const __testing = { fnv1a };
