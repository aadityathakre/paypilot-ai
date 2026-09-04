import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { ProductsController } from './products.controller.js';
import { validateQuery, validateBody } from '../../middleware/validate.js';
import { authenticateJwt, optionalJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';
import { listProductsQuerySchema, createProductSchema, updateProductSchema } from './products.schema.js';

export const productsRouter = Router();

// Public / Merchant Filtered Catalog Queries
productsRouter.get('/', optionalJwt, validateQuery(listProductsQuerySchema), ProductsController.listProducts);
productsRouter.get('/categories', ProductsController.listCategories);
productsRouter.get('/:id', ProductsController.getProductById);

// Merchant-only Catalog Management
productsRouter.post(
  '/',
  authenticateJwt,
  requireRole(UserRole.MERCHANT, UserRole.ADMIN),
  validateBody(createProductSchema),
  ProductsController.createProduct
);

productsRouter.patch(
  '/:id',
  authenticateJwt,
  requireRole(UserRole.MERCHANT, UserRole.ADMIN),
  validateBody(updateProductSchema),
  ProductsController.updateProduct
);

productsRouter.delete(
  '/:id',
  authenticateJwt,
  requireRole(UserRole.MERCHANT, UserRole.ADMIN),
  ProductsController.deleteProduct
);
