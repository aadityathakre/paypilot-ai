import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().uuid('Valid Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

export const updateItemQuantitySchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemQuantityInput = z.infer<typeof updateItemQuantitySchema>;
