import { z } from 'zod';

export const chatReplySchema = z.object({
  sessionId: z.string().uuid(),
  animalId: z.string().min(1).max(64),
  userText: z.string().trim().min(1, 'Сообщение не может быть пустым').max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(500),
      }),
    )
    .max(20)
    .default([]),
});

export type ChatReplyDto = z.infer<typeof chatReplySchema>;
