import type { ComponentType } from 'react';

import type { ServiceBundle } from '@/services/di/types';

export interface GameMetadata {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly iconAsset?: number;
  readonly minAge: number;
  readonly maxAge: number;
  readonly tags: readonly string[];
  readonly version: string;
}

export interface GameConfig {
  readonly apiBaseUrl: string;
  readonly featureFlags: Readonly<Record<string, boolean>>;
}

export interface GameContext {
  readonly services: ServiceBundle;
  readonly childId: string;
  readonly config: GameConfig;
  readonly abortSignal: AbortSignal;
}

export interface GamePlugin {
  readonly metadata: GameMetadata;
  readonly Screen: ComponentType;
  preload(ctx: GameContext): Promise<void>;
  canResume(ctx: GameContext): boolean;
}
