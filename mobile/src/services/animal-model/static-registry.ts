import type { AnimalId } from '@/games/alphabet/content/types';

import type {
  AnimalModelDescriptor,
  AnimalModelRegistry,
  AnimationClip,
} from './types';

/**
 * Клипы Quaternius-пака унифицированы: все модели экспортированы с одинаковыми
 * именами анимаций. Если добавляете не-Quaternius модель (Poly Pizza, Sketchfab) —
 * переопределяйте `clips` в дескрипторе.
 */
const QUATERNIUS_CLIPS: Readonly<Record<AnimationClip, string>> = {
  idle: 'Idle',
  greet: 'Walk',
  eat: 'Eat',
  happy: 'Run',
  sleep: 'Death',
  play: 'Jump',
};

/**
 * Базовый набор интерактивностей. Можно переопределить покомпонентно
 * (например, для акулы убрать 'pet' — погладить акулу нельзя).
 */
const BASE_INTERACTIONS: AnimalModelDescriptor['interactions'] = [
  { id: 'pet', animation: 'happy', reaction: 'Мурр! Спасибо.', cooldownMs: 1500 },
  { id: 'feed', animation: 'eat', reaction: 'Вкусно! Ещё!', cooldownMs: 2500 },
  { id: 'throw-ball', animation: 'play', reaction: 'Ура, мячик!', cooldownMs: 2000 },
  { id: 'dance', animation: 'happy', reaction: 'Ла-ла-ла!', cooldownMs: 3000 },
];

/**
 * Статический реестр: пока 3D-пак не подключён, реестр в основном служит
 * схемой данных. По мере добавления моделей (M4.5) сюда вносятся записи.
 * Отсутствующая запись означает «использовать 2D-fallback».
 */
const DESCRIPTORS: Readonly<Record<string, AnimalModelDescriptor>> = {
  // NOTE: modelUrl — это placeholder-путь. Реальные файлы появятся после
  // пайплайна gltf-transform (M4.5). fallbackEmoji/fallbackColor позволяют
  // render-слою мгновенно показать что-то, пока модель скачивается.
  dog: {
    animalId: 'dog',
    modelUrl: '',
    normalizedHeightM: 0.6,
    clips: QUATERNIUS_CLIPS,
    interactions: BASE_INTERACTIONS,
    fallbackEmoji: '🐕',
    fallbackColor: '#F4A261',
  },
  cat: {
    animalId: 'cat',
    modelUrl: '',
    normalizedHeightM: 0.4,
    clips: QUATERNIUS_CLIPS,
    interactions: BASE_INTERACTIONS,
    fallbackEmoji: '🐈',
    fallbackColor: '#E9C46A',
  },
  lion: {
    animalId: 'lion',
    modelUrl: '',
    normalizedHeightM: 1.2,
    clips: QUATERNIUS_CLIPS,
    interactions: BASE_INTERACTIONS.filter((i) => i.id !== 'pet'),
    fallbackEmoji: '🦁',
    fallbackColor: '#E76F51',
  },
};

export class StaticAnimalModelRegistry implements AnimalModelRegistry {
  get(animalId: AnimalId): AnimalModelDescriptor | null {
    return DESCRIPTORS[animalId] ?? null;
  }

  list(): readonly AnimalId[] {
    return Object.keys(DESCRIPTORS);
  }

  async preload(_animalId: AnimalId): Promise<void> {
    // M4.5: Filament-movie загрузка здесь. На web — всегда no-op (идём в fallback).
    return Promise.resolve();
  }
}
