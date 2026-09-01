import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service.js';

export class PaymentsController {
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
