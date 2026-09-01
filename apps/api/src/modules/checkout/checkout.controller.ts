import { Request, Response, NextFunction } from 'express';
import { CheckoutService } from './checkout.service.js';

export class CheckoutController {
  static async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const customerConfirmed = req.body?.customerConfirmed ?? true;
      const result = await CheckoutService.validateCart(customerId, customerConfirmed);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const result = await CheckoutService.createCheckoutOrder(customerId, req.body, req.requestId);
      res.status(201).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
