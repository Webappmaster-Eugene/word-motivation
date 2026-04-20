import type { KvStorage } from '@/services/storage/kv-storage';

import {
  LetterMasteryRepo,
  letterWeakness,
  orderWordsByMastery,
  type LetterMasterySnapshot,
  type LetterStats,
} from '../letter-mastery';

class InMemoryKv implements KvStorage {
  private readonly store = new Map<string, string>();

  async getJson<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }
  async setJson<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('letterWeakness', () => {
  const now = Date.parse('2026-04-19T12:00:00Z');

  it('неизвестная буква — средняя слабость 0.5', () => {
    expect(letterWeakness(undefined, now)).toBe(0.5);
  });
  it('много правильных ответов — низкая слабость', () => {
    const stats: LetterStats = { correct: 10, wrong: 0, lastSeenAt: new Date(now).toISOString() };
    expect(letterWeakness(stats, now)).toBeLessThan(0.1);
  });
  it('много ошибок — высокая слабость', () => {
    const stats: LetterStats = { correct: 1, wrong: 9, lastSeenAt: new Date(now).toISOString() };
    expect(letterWeakness(stats, now)).toBeGreaterThan(0.8);
  });
  it('давно не виденная — накидываются forget-баллы', () => {
    const longAgo = new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString();
    const stats: LetterStats = { correct: 5, wrong: 0, lastSeenAt: longAgo };
    const fresh: LetterStats = { correct: 5, wrong: 0, lastSeenAt: new Date(now).toISOString() };
    expect(letterWeakness(stats, now)).toBeGreaterThan(letterWeakness(fresh, now));
  });
});

describe('orderWordsByMastery', () => {
  it('приоритизирует слово с максимально слабой буквой', () => {
    const words = [
      { id: 'easy', letters: ['а', 'б'] },
      { id: 'hard', letters: ['ы', 'щ'] },
      { id: 'mid', letters: ['к', 'о'] },
    ];
    const mastery: LetterMasterySnapshot = {
      а: { correct: 10, wrong: 0, lastSeenAt: new Date().toISOString() },
      б: { correct: 8, wrong: 0, lastSeenAt: new Date().toISOString() },
      ы: { correct: 1, wrong: 9, lastSeenAt: new Date().toISOString() },
      щ: { correct: 2, wrong: 8, lastSeenAt: new Date().toISOString() },
      к: { correct: 5, wrong: 2, lastSeenAt: new Date().toISOString() },
      о: { correct: 7, wrong: 1, lastSeenAt: new Date().toISOString() },
    };
    const ordered = orderWordsByMastery(words, mastery);
    expect(ordered[0]!.id).toBe('hard');
    expect(ordered[ordered.length - 1]!.id).toBe('easy');
  });
});

describe('LetterMasteryRepo', () => {
  let kv: InMemoryKv;
  let repo: LetterMasteryRepo;

  beforeEach(() => {
    kv = new InMemoryKv();
    repo = new LetterMasteryRepo(kv);
  });

  it('load пустого → пустой snapshot', async () => {
    const snap = await repo.load();
    expect(snap).toEqual({});
  });

  it('record correct инкрементит correct', async () => {
    await repo.record('С', true);
    const snap = await repo.load();
    expect(snap.с?.correct).toBe(1);
    expect(snap.с?.wrong).toBe(0);
  });

  it('record wrong инкрементит wrong', async () => {
    await repo.record('с', false);
    const snap = await repo.load();
    expect(snap.с?.wrong).toBe(1);
  });

  it('нормализует регистр и Ё', async () => {
    await repo.record('Ё', true);
    await repo.record('е', true);
    const snap = await repo.load();
    expect(snap.е?.correct).toBe(2);
  });

  it('сохраняется между инстансами через KvStorage', async () => {
    await repo.record('а', true);
    await repo.record('а', false);

    const repo2 = new LetterMasteryRepo(kv);
    const snap = await repo2.load();
    expect(snap.а).toMatchObject({ correct: 1, wrong: 1 });
  });

  it('reset очищает', async () => {
    await repo.record('а', true);
    await repo.reset();
    const snap = await repo.load();
    expect(snap).toEqual({});
  });
});
