import { z } from 'zod';

export const createSessionSchema = z.object({
  merchantId: z.string().uuid().optional(),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
