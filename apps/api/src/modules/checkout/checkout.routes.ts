import { Router } from 'express';
import { CheckoutController } from './checkout.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createOrderSchema } from './checkout.schema.js';

export const checkoutRouter = Router();

checkoutRouter.use(authenticateJwt);

checkoutRouter.post('/validate', CheckoutController.validate);
checkoutRouter.post('/create-order', validateBody(createOrderSchema), CheckoutController.createOrder);
