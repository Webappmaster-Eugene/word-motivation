import { alphabetPlugin } from './alphabet';
import type { GamePlugin } from './types';

const plugins: readonly GamePlugin[] = [alphabetPlugin];

const byId = new Map<string, GamePlugin>(plugins.map((p) => [p.metadata.id, p]));

if (byId.size !== plugins.length) {
  throw new Error('В registry обнаружены дубликаты game id');
}

export const gameRegistry = {
  list(): readonly GamePlugin[] {
    return plugins;
  },
  resolve(id: string): GamePlugin | undefined {
    return byId.get(id);
  },
} as const;
