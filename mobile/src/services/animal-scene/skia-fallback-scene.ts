import type { AnimalSceneAsset, AnimalSceneService } from './types';

/**
 * Сервис-заглушка сцены, которая не требует native-модулей.
 * Реальный рендер происходит в компоненте <AnimalScene /> на базе Skia/Reanimated;
 * этому сервису нужно лишь удовлетворить контракт preload/isAvailable,
 * чтобы код выше (FSM, use-alphabet-machine) работал одинаково с Filament и без.
 *
 * preload — синхронный (нет сетевой загрузки), но возвращает Promise для совместимости
 * с будущим Filament-пайплайном (скачивание GLB с CDN).
 */
export class SkiaFallbackScene implements AnimalSceneService {
  private readonly preloaded = new Set<string>();

  async preload(asset: AnimalSceneAsset): Promise<void> {
    this.preloaded.add(asset.id);
  }

  isAvailable(): boolean {
    return true;
  }

  hasPreloaded(id: string): boolean {
    return this.preloaded.has(id);
  }
}
