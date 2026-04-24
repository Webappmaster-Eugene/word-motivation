/**
 * Абстракция над рендером 3D-животного.
 * Native: FilamentScene (GLB + скелетные анимации) — M4.5.
 * Web / low-end native: SkiaFallbackScene (2D-сцена в стиле Quaternius).
 */

export type AnimalId = string;

/**
 * Анимационные состояния сцены.
 * Соответствует `AnimationClip` из `AnimalModelDescriptor` для Filament (M4.5).
 *  - idle/greet/dance/sleep — «пассивные» (запускаются автоматически).
 *  - happy/eat/play — «интерактивные» (запускаются по действию ребёнка).
 */
export type SceneAnimation = 'idle' | 'greet' | 'dance' | 'sleep' | 'happy' | 'eat' | 'play';

export interface AnimalSceneAsset {
  readonly id: AnimalId;
  readonly title: string;
  readonly emoji: string;
  readonly color: string;
  /** Путь к GLB-файлу (используется FilamentScene). Для SkiaFallback — не требуется. */
  readonly glbUrl?: string;
}

export interface AnimalSceneController {
  play(anim: SceneAnimation): void;
  dispose(): void;
}

export interface AnimalSceneService {
  preload(asset: AnimalSceneAsset): Promise<void>;
  isAvailable(): boolean;
}
