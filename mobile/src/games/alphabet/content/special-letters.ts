/**
 * Буквы, с которых слова не начинаются (Ъ, Ы, Ь, Й), плюс редкие начальные
 * (Ё, Ю), для которых в M2 используется режим LETTER_INSIDE_WORD —
 * слово показывается целиком с подсветкой буквы и произносится полностью.
 */
export const SPECIAL_LETTERS = new Set<string>(['ъ', 'ы', 'ь', 'й']);

export function isSpecialLetter(letter: string): boolean {
  return SPECIAL_LETTERS.has(letter.toLowerCase());
}
