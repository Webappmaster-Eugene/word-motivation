import type { AnimalInfo } from '@/games/alphabet/content/types';

import { pickDailyAnimal, todayIsoDate } from '../daily-quest';

const animals: readonly AnimalInfo[] = [
  { id: 'dog', title: 'Собака', emoji: '🐕', greeting: 'Гав', color: '#f00' },
  { id: 'cat', title: 'Кошка', emoji: '🐈', greeting: 'Мяу', color: '#0f0' },
  { id: 'lion', title: 'Лев', emoji: '🦁', greeting: 'Ррр', color: '#00f' },
];

describe('daily-quest', () => {
  describe('todayIsoDate', () => {
    it('возвращает дату в YYYY-MM-DD формате', () => {
      const date = todayIsoDate(new Date('2026-04-19T12:34:56'));
      expect(date).toBe('2026-04-19');
    });
    it('по умолчанию использует текущую дату', () => {
      expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('pickDailyAnimal', () => {
    it('детерминированно возвращает одно и то же животное для одной даты', () => {
      const a = pickDailyAnimal(animals, '2026-04-19');
      const b = pickDailyAnimal(animals, '2026-04-19');
      expect(a).toBe(b);
    });
    it('разные даты дают (как правило) разные результаты', () => {
      const results = new Set<string>();
      for (let i = 1; i <= 30; i += 1) {
        const date = `2026-04-${String(i).padStart(2, '0')}`;
        results.add(pickDailyAnimal(animals, date)?.id ?? '');
      }
      // на 30 разных датах должно быть хотя бы 2 разных животных
      expect(results.size).toBeGreaterThan(1);
    });
    it('null при пустом списке', () => {
      expect(pickDailyAnimal([], '2026-04-19')).toBeNull();
    });
  });
});
