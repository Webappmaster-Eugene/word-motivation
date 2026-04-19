import type { WordEntry } from '../content/types';

/**
 * Расстояние Левенштейна (итеративный двухрядный вариант).
 * Нужно для устойчивого сравнения детской речи с ожидаемым значением:
 * допускаем 1 ошибку в букве и 2 ошибки в слове.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      // безопасный доступ по индексам (значения инициализированы выше)
      const del = (curr[j - 1] ?? 0) + 1;
      const ins = (prev[j] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length] ?? 0;
}

export function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/ё/g, 'е');
}

/**
 * Проверяет, совпал ли голос/тап с ожидаемой буквой.
 * Разрешаем Levenshtein ≤ 1 (для однобуквенных — точное совпадение).
 */
export function isLetterMatch(expected: string, heard: string): boolean {
  const e = normalize(expected);
  const h = normalize(heard);
  if (e === h) return true;
  if (e.length <= 1) return false; // одиночная буква — только точно
  return levenshtein(e, h) <= 1;
}

/**
 * Проверяет, совпало ли слово с ожидаемым. Для слов допускаем Levenshtein ≤ 2.
 */
export function isWordMatch(expected: string, heard: string): boolean {
  const e = normalize(expected);
  const h = normalize(heard);
  if (e === h) return true;
  return levenshtein(e, h) <= 2;
}

export function currentWord(words: readonly WordEntry[], wordIndex: number): WordEntry {
  const word = words[wordIndex];
  if (!word) {
    throw new Error(`currentWord: индекс ${wordIndex} вне диапазона (${words.length})`);
  }
  return word;
}

export function currentLetter(word: WordEntry, letterIndex: number): string {
  const letter = word.letters[letterIndex];
  if (letter === undefined) {
    throw new Error(`currentLetter: индекс ${letterIndex} вне диапазона (${word.letters.length})`);
  }
  return letter;
}
