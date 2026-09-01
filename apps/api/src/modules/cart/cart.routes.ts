import { Router } from 'express';
import { CartController } from './cart.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { addItemSchema, updateItemQuantitySchema } from './cart.schema.js';

export const cartRouter = Router();

cartRouter.use(authenticateJwt);

cartRouter.get('/active', CartController.getActiveCart);
cartRouter.post('/items', validateBody(addItemSchema), CartController.addItem);
cartRouter.patch('/items/:itemId', validateBody(updateItemQuantitySchema), CartController.updateQuantity);
cartRouter.delete('/items/:itemId', CartController.removeItem);
cartRouter.delete('/', CartController.clearCart);
