import { isLetterMatch, isWordMatch, levenshtein, normalize } from '../guards';

describe('guards — нормализация и сравнение', () => {
  describe('normalize', () => {
    it('приводит к нижнему регистру, триммит, заменяет ё → е', () => {
      expect(normalize('  ЁЖ  ')).toBe('еж');
      expect(normalize('СОБАКА')).toBe('собака');
    });
  });

  describe('levenshtein', () => {
    it.each([
      ['', '', 0],
      ['', 'a', 1],
      ['a', '', 1],
      ['abc', 'abc', 0],
      ['abc', 'abd', 1],
      ['abc', 'axc', 1],
      ['abc', 'ab', 1],
      ['kitten', 'sitting', 3],
      ['собака', 'собаки', 1],
    ])('levenshtein(%p, %p) = %i', (a, b, expected) => {
      expect(levenshtein(a, b)).toBe(expected);
    });
  });

  describe('isLetterMatch', () => {
    it('точное совпадение', () => {
      expect(isLetterMatch('с', 'С')).toBe(true);
    });
    it('одиночная буква требует точного совпадения (distance 0)', () => {
      expect(isLetterMatch('б', 'п')).toBe(false);
      expect(isLetterMatch('б', 'б')).toBe(true);
    });
    it('мягкий знак точный', () => {
      expect(isLetterMatch('ь', 'ь')).toBe(true);
      expect(isLetterMatch('ь', 'ъ')).toBe(false);
    });
  });

  describe('isWordMatch', () => {
    it('точное совпадение', () => {
      expect(isWordMatch('собака', 'Собака')).toBe(true);
    });
    it('допускает 1 ошибку', () => {
      expect(isWordMatch('собака', 'собаки')).toBe(true);
    });
    it('допускает 2 ошибки', () => {
      expect(isWordMatch('собака', 'собаки.')).toBe(true);
    });
    it('отвергает 3+ ошибок', () => {
      expect(isWordMatch('собака', 'кошка')).toBe(false);
    });
  });
});
