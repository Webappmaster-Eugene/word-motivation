import { z } from 'zod';

export const listAnimalsQuerySchema = z.object({
  minAge: z.coerce.number().int().min(3).max(18).optional(),
  biome: z.enum(['FARM', 'FOREST', 'SAVANNA', 'SEA', 'JUNGLE', 'ARCTIC']).optional(),
});

export type ListAnimalsQueryDto = z.infer<typeof listAnimalsQuerySchema>;

export const listWordsQuerySchema = z.object({
  minAge: z.coerce.number().int().min(3).max(18).optional(),
  animalId: z.string().min(1).max(64).optional(),
});

export type ListWordsQueryDto = z.infer<typeof listWordsQuerySchema>;
