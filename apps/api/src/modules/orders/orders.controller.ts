import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service.js';

export class OrdersController {
  static async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const orders = await OrdersService.getMyOrders(customerId);
      res.status(200).json({
        success: true,
        data: { orders },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { id } = req.params;
      const order = await OrdersService.getOrderById(customerId, id);
      res.status(200).json({
        success: true,
        data: { order },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
