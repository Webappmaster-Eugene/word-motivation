import { SkiaFallbackScene } from '../skia-fallback-scene';
import type { AnimalSceneAsset } from '../types';

const asset: AnimalSceneAsset = {
  id: 'dog',
  title: 'Собака',
  emoji: '🐕',
  color: '#F4A261',
};

describe('SkiaFallbackScene', () => {
  it('isAvailable всегда true (работает без native-модулей)', () => {
    const svc = new SkiaFallbackScene();
    expect(svc.isAvailable()).toBe(true);
  });

  it('preload резолвит промис и помечает asset как загруженный', async () => {
    const svc = new SkiaFallbackScene();
    expect(svc.hasPreloaded('dog')).toBe(false);
    await svc.preload(asset);
    expect(svc.hasPreloaded('dog')).toBe(true);
  });

  it('preload идемпотентный — повторный вызов не ломает', async () => {
    const svc = new SkiaFallbackScene();
    await svc.preload(asset);
    await svc.preload(asset);
    expect(svc.hasPreloaded('dog')).toBe(true);
  });

  it('несколько разных животных — каждый помечается независимо', async () => {
    const svc = new SkiaFallbackScene();
    await svc.preload(asset);
    await svc.preload({ ...asset, id: 'cat', title: 'Кошка' });
    expect(svc.hasPreloaded('dog')).toBe(true);
    expect(svc.hasPreloaded('cat')).toBe(true);
    expect(svc.hasPreloaded('lion')).toBe(false);
  });
});
