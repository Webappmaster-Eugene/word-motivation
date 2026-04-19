export type AnimalId = string;

export type Biome = 'FARM' | 'FOREST' | 'SAVANNA' | 'SEA' | 'JUNGLE' | 'ARCTIC';

export const BIOME_ORDER: readonly Biome[] = [
  'FARM',
  'FOREST',
  'SAVANNA',
  'SEA',
  'JUNGLE',
  'ARCTIC',
];

export const BIOME_RU: Readonly<Record<Biome, string>> = {
  FARM: '🏡 Ферма',
  FOREST: '🌳 Лес',
  SAVANNA: '🦁 Саванна',
  SEA: '🌊 Море',
  JUNGLE: '🌴 Джунгли',
  ARCTIC: '❄️ Арктика',
};

export interface AnimalInfo {
  readonly id: AnimalId;
  readonly title: string;
  readonly emoji: string;
  readonly greeting: string;
  readonly color: string;
  readonly biome?: Biome;
  readonly scriptedReplies?: readonly string[];
}

export interface WordEntry {
  readonly id: string;
  readonly word: string;
  readonly letters: readonly string[];
  readonly animalId: AnimalId;
  /** TTS-подсказка «это буква С» или «это мягкий знак, читается вместе с соседней» */
  readonly letterHints: Readonly<Record<string, string>>;
}
