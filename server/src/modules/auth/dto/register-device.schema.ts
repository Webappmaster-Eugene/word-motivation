import { z } from 'zod';

export const registerDeviceSchema = z.object({
  deviceId: z.string().min(8, 'deviceId должен быть не короче 8 символов').max(256),
  ageBand: z.enum(['AGE_6_8', 'AGE_9_12']).optional(),
});

export type RegisterDeviceDto = z.infer<typeof registerDeviceSchema>;
