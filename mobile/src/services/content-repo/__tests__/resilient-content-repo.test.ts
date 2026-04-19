import { LocalContentRepo } from '../local-content-repo';
import { ResilientContentRepo } from '../resilient-content-repo';
import type { AlphabetContent, ContentRepo } from '../types';

class FakeRepo implements ContentRepo {
  constructor(private readonly impl: () => Promise<AlphabetContent>) {}
  getAlphabetContent(): Promise<AlphabetContent> {
    return this.impl();
  }
}

describe('ResilientContentRepo', () => {
  const local = new LocalContentRepo();

  it('использует primary если тот успешен', async () => {
    const primaryContent: AlphabetContent = { words: [], animals: {} };
    // empty words → должен упасть на fallback, см. ниже отдельный тест
    const nonEmpty: AlphabetContent = {
      words: [{ id: 'x', word: 'x', letters: ['x'], animalId: 'dog', letterHints: {} }],
      animals: { dog: { id: 'dog', title: 'Собака', emoji: '🐕', color: '#fff', greeting: 'gav' } },
    };
    const primary = new FakeRepo(async () => nonEmpty);
    const repo = new ResilientContentRepo(primary, local);
    const result = await repo.getAlphabetContent();
    expect(result.words).toHaveLength(1);
    expect(primaryContent).not.toBe(result); // sanity
  });

  it('падает на fallback при ошибке primary', async () => {
    const primary = new FakeRepo(async () => {
      throw new Error('backend недоступен');
    });
    const onFallback = jest.fn();
    const repo = new ResilientContentRepo(primary, local, onFallback);
    const result = await repo.getAlphabetContent();
    expect(result.words.length).toBeGreaterThan(0);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('падает на fallback если primary вернул пустой список слов', async () => {
    const primary = new FakeRepo(async () => ({ words: [], animals: {} }));
    const onFallback = jest.fn();
    const repo = new ResilientContentRepo(primary, local, onFallback);
    const result = await repo.getAlphabetContent();
    expect(result.words.length).toBeGreaterThan(0);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });
});

describe('LocalContentRepo', () => {
  it('возвращает ненулевой контент (M2 pack)', async () => {
    const repo = new LocalContentRepo();
    const content = await repo.getAlphabetContent();
    expect(content.words.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(content.animals).length).toBeGreaterThanOrEqual(5);
  });
});
