import { Router } from 'express';
import { MerchantController } from './merchant.controller.js';
import { optionalJwt } from '../../middleware/auth.js';

export const merchantRouter = Router();

// Apply optionalJwt to resolve merchant from token or fallback to primary merchant
merchantRouter.use(optionalJwt);

merchantRouter.get('/analytics', MerchantController.getAnalytics);
merchantRouter.get('/policy', MerchantController.getPolicy);
merchantRouter.patch('/policy', MerchantController.updatePolicy);
merchantRouter.get('/orders', MerchantController.getOrders);
