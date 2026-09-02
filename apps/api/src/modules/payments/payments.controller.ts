import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service.js';

export class PaymentsController {
  static async getKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PaymentsService.getKey();
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
      const { amountInr, receipt } = req.body;
      const result = await PaymentsService.createRazorpayOrder(amountInr, receipt);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async payWithWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { orderId } = req.body;
      const result = await PaymentsService.payWithWallet(customerId, orderId, req.requestId);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const result = await PaymentsService.verifyPayment(customerId, req.body, req.requestId);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
