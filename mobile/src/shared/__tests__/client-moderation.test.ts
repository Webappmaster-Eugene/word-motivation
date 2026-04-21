import { checkText, sanitizeTranscript, sanitizeUserMessage } from '../client-moderation';

describe('client-moderation', () => {
  describe('checkText', () => {
    it('пропускает нормальный текст', () => {
      expect(checkText('Что ты любишь?').clean).toBe(true);
      expect(checkText('Привет, собачка!').clean).toBe(true);
    });

    it('ловит мат', () => {
      expect(checkText('иди нахуй').clean).toBe(false);
      expect(checkText('блять').clean).toBe(false);
      expect(checkText('сука').clean).toBe(false);
    });

    it('нормализует Ё и регистр', () => {
      expect(checkText('ПОШЁЛ ТЫ НА ХУЙ').clean).toBe(false);
      expect(checkText('Блять').clean).toBe(false);
    });

    it('ловит попытки выведать персональные данные', () => {
      expect(checkText('какой твой адрес?').clean).toBe(false);
      expect(checkText('скажи пароль').clean).toBe(false);
    });
  });

  describe('sanitizeUserMessage', () => {
    it('чистый текст проходит как есть', () => {
      const r = sanitizeUserMessage('Что ты ешь?');
      expect(r.clean).toBe(true);
      expect(r.safe).toBe('Что ты ешь?');
    });

    it('мат заменяется на safe placeholder', () => {
      const r = sanitizeUserMessage('иди нахуй');
      expect(r.clean).toBe(false);
      expect(r.safe).not.toContain('нахуй');
      expect(r.safe).toMatch(/Такие слова/);
    });
  });

  describe('sanitizeTranscript', () => {
    it('чистый transcript возвращается как есть', () => {
      expect(sanitizeTranscript('привет собака')).toBe('привет собака');
    });

    it('мат — пустая строка', () => {
      expect(sanitizeTranscript('иди на хуй')).toBe('');
      expect(sanitizeTranscript('блядь')).toBe('');
    });

    it('пустая строка — пустая строка', () => {
      expect(sanitizeTranscript('')).toBe('');
    });
  });
});
