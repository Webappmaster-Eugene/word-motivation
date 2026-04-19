import { gameRegistry } from '@/games/registry';

describe('gameRegistry', () => {
  it('содержит игру alphabet', () => {
    const alphabet = gameRegistry.resolve('alphabet');
    expect(alphabet).toBeDefined();
    expect(alphabet?.metadata.title).toBe('Алфавит');
  });

  it('возвращает undefined для неизвестного id', () => {
    expect(gameRegistry.resolve('unknown-game')).toBeUndefined();
  });

  it('list() возвращает хотя бы одну игру', () => {
    const games = gameRegistry.list();
    expect(games.length).toBeGreaterThan(0);
  });
});
