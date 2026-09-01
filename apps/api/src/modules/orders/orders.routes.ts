import { Router } from 'express';
import { OrdersController } from './orders.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

export const ordersRouter = Router();

ordersRouter.get('/my-orders', authenticateJwt, OrdersController.getMyOrders);
ordersRouter.get('/:id', authenticateJwt, OrdersController.getOrderById);
