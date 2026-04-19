import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services/di/provider';

import type { AnimalInfo, Biome } from '@/games/alphabet/content/types';

export interface ZooAnimal extends AnimalInfo {
  readonly unlocked: boolean;
  readonly visits: number;
  readonly unlockedAt: string | null;
}

export interface ZooGroup {
  readonly biome: Biome | 'UNKNOWN';
  readonly animals: readonly ZooAnimal[];
}

/**
 * Объединяет content (все животные) + progress (разблокированные).
 * Если бэкенд недоступен — возвращает только животных из локального pack.
 */
export function useZooData() {
  const repo = useService('contentRepo');
  const progress = useService('progressApi');

  return useQuery({
    queryKey: ['zoo-data'],
    queryFn: async (): Promise<readonly ZooGroup[]> => {
      const [content, unlockedResult] = await Promise.all([
        repo.getAlphabetContent(),
        progress.listUnlocked().catch(() => [] as const),
      ]);

      const unlockedMap = new Map(unlockedResult.map((u) => [u.animalId, u]));

      const zooAnimals: ZooAnimal[] = Object.values(content.animals).map((animal) => {
        const rec = unlockedMap.get(animal.id);
        return {
          ...animal,
          unlocked: Boolean(rec),
          visits: rec?.visits ?? 0,
          unlockedAt: rec?.unlockedAt ?? null,
        };
      });

      return groupByBiome(zooAnimals);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

const BIOME_ORDER: readonly (Biome | 'UNKNOWN')[] = [
  'FARM',
  'FOREST',
  'SAVANNA',
  'SEA',
  'JUNGLE',
  'ARCTIC',
  'UNKNOWN',
];

function groupByBiome(animals: readonly ZooAnimal[]): readonly ZooGroup[] {
  const buckets = new Map<Biome | 'UNKNOWN', ZooAnimal[]>();
  for (const a of animals) {
    const key: Biome | 'UNKNOWN' = a.biome ?? 'UNKNOWN';
    const list = buckets.get(key);
    if (list) list.push(a);
    else buckets.set(key, [a]);
  }
  const result: ZooGroup[] = [];
  for (const biome of BIOME_ORDER) {
    const list = buckets.get(biome);
    if (list && list.length > 0) {
      result.push({
        biome,
        animals: [...list].sort((a, b) => a.title.localeCompare(b.title, 'ru')),
      });
    }
  }
  return result;
}
