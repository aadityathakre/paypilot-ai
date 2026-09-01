import { z } from 'zod';

export const validateCheckoutSchema = z.object({
  customerConfirmed: z.boolean().optional().default(true),
});

export const createOrderSchema = z.object({
  customerConfirmed: z.boolean().default(true),
  shippingAddress: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().optional(),
});

export type ValidateCheckoutInput = z.infer<typeof validateCheckoutSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
