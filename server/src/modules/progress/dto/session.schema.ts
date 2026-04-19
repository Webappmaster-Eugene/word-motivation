import { z } from 'zod';

export const startSessionSchema = z.object({
  gameId: z.string().min(1).max(64),
});
export type StartSessionDto = z.infer<typeof startSessionSchema>;

export const endSessionSchema = z.object({
  summaryStats: z.record(z.unknown()).optional(),
  fsmSnapshot: z.unknown().optional(),
});
export type EndSessionDto = z.infer<typeof endSessionSchema>;

export const recordAttemptSchema = z.object({
  sessionId: z.string().uuid(),
  kind: z.enum(['LETTER', 'WORD']),
  wordId: z.string().min(1).max(64).optional(),
  expected: z.string().min(1).max(64),
  heard: z.string().max(256).default(''),
  correct: z.boolean(),
  latencyMs: z.number().int().nonnegative().max(600_000).optional(),
});
export type RecordAttemptDto = z.infer<typeof recordAttemptSchema>;

export const unlockAnimalSchema = z.object({
  animalId: z.string().min(1).max(64),
});
export type UnlockAnimalDto = z.infer<typeof unlockAnimalSchema>;
