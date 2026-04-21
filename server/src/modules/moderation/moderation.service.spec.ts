import { Test } from '@nestjs/testing';

import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  let svc: ModerationService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [ModerationService] }).compile();
    svc = module.get(ModerationService);
  });

  describe('screenInput', () => {
    it('пропускает нормальный детский вопрос', () => {
      expect(svc.screenInput('Привет, а что ты ешь?').allowed).toBe(true);
    });
    it('ловит мат', () => {
      const res = svc.screenInput('ты дурак, блять');
      expect(res.allowed).toBe(false);
      expect(res.flags.some((f) => f.startsWith('profanity'))).toBe(true);
    });
    it('ловит просьбу персональных данных', () => {
      const res = svc.screenInput('Скажи свой адрес');
      expect(res.allowed).toBe(false);
      expect(res.flags.some((f) => f.startsWith('child-safety'))).toBe(true);
    });
    it('нормализует регистр и Ё', () => {
      const res = svc.screenInput('ЁЖИК   хороший');
      expect(res.allowed).toBe(true);
    });
  });

  describe('screenOutput', () => {
    it('пропускает нормальный ответ', () => {
      expect(svc.screenOutput('Я добрая собака. Давай играть!').allowed).toBe(true);
    });
    it('блокирует мат', () => {
      expect(svc.screenOutput('ты сука ленивый').allowed).toBe(false);
    });
    it('блокирует мат в конце предложения (без пробела после)', () => {
      // Регрессия: trailing space в blocklist ('сука ') пропускал слово в конце.
      expect(svc.screenOutput('ты мелкая сука').allowed).toBe(false);
    });
    it('блокирует слишком длинный ответ', () => {
      const long = 'а'.repeat(801);
      const res = svc.screenOutput(long);
      expect(res.flags).toContain('length:too-long');
    });
    it('блокирует ответ без русского', () => {
      expect(svc.screenOutput('Hello world friend').allowed).toBe(false);
    });
  });
});
