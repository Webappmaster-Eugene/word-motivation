import type { AnimalId } from '@/games/alphabet/content/types';

/**
 * Имена анимаций в glTF-модели. Все модели из пакета Quaternius Ultimate
 * Animated Animals используют унифицированный clip-set (совпадающий между
 * животными: Idle, Eat, Walk, Run, Jump, Attack, Death). Мы оставляем
 * семантически-игровой набор — остальные клипы просто не вызываются.
 *
 * Это позволяет одному и тому же FSM поведения применяться к любому животному
 * без знания конкретной модели.
 */
export type AnimationClip = 'idle' | 'greet' | 'eat' | 'happy' | 'sleep' | 'play';

export interface ModelInteraction {
  /** Уникальное имя взаимодействия — ключ в бандле ассетов (например, 'feed', 'pet'). */
  readonly id: 'feed' | 'pet' | 'throw-ball' | 'dance';
  /** Анимация, которая проигрывается на successful-ответ. */
  readonly animation: AnimationClip;
  /** Текст, который говорит животное (в TTS). */
  readonly reaction: string;
  /** Сколько секунд идёт кулдаун, чтобы ребёнок не спамил. */
  readonly cooldownMs: number;
}

export interface AnimalModelDescriptor {
  readonly animalId: AnimalId;
  /**
   * Абсолютный URL или bundler-require для glTF/GLB. На native — absolute path
   * через require('@assets/models/dog.glb'), на web — publicUrl к `/assets/models/...`.
   */
  readonly modelUrl: string | number;
  /**
   * Размер модели по высоте в метрах. Filament камера настраивается под этот
   * bounds, чтобы животное занимало одинаковое место в сцене независимо от того,
   * слон это или мышь.
   */
  readonly normalizedHeightM: number;
  /** Список доступных анимационных клипов (по имени внутри glTF). */
  readonly clips: Readonly<Partial<Record<AnimationClip, string>>>;
  /** Поддерживаемые интерактивности. */
  readonly interactions: readonly ModelInteraction[];
  /**
   * Фолбэк на 2D-сцену, если native-рендер недоступен
   * (web, старые Android, ошибка загрузки модели).
   */
  readonly fallbackEmoji: string;
  readonly fallbackColor: string;
}

export interface AnimalModelRegistry {
  /** Возвращает дескриптор или null, если модель не зарегистрирована. */
  get(animalId: AnimalId): AnimalModelDescriptor | null;
  /** Все зарегистрированные animalId. */
  list(): readonly AnimalId[];
  /**
   * Предзагрузка модели (сетевой fetch + разбор glTF) — вызывается перед показом
   * сцены, чтобы убрать «первый кадр — чёрный» лаг. На web — no-op.
   */
  preload(animalId: AnimalId): Promise<void>;
}
