import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(['price_asc', 'price_desc', 'score_desc', 'newest']).default('score_desc'),
});

export const createProductSchema = z.object({
  sku: z.string().min(3).max(50).toUpperCase(),
  name: z.string().min(2).max(200),
  description: z.string().min(5),
  category: z.string().min(2).max(50).toLowerCase(),
  pricePaise: z.coerce.bigint().positive('Price must be greater than 0'),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  attributes: z.record(z.unknown()).optional(),
  imageUrl: z.string().url().optional(),
  merchantScore: z.number().min(0).max(1).default(1.0),
});

export const updateProductSchema = createProductSchema.partial();

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
