import type { GamePlugin } from '@/games/types';

import { alphabetMetadata } from './metadata';
import AlphabetScreen from './screen';

export const alphabetPlugin: GamePlugin = {
  metadata: alphabetMetadata,
  Screen: AlphabetScreen,
  async preload() {
    // M4+ — предзагрузить первый биом GLB и Vosk-модель
  },
  canResume() {
    return false;
  },
};
