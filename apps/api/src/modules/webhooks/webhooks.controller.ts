import { Request, Response, NextFunction } from 'express';
import { WebhooksService } from './webhooks.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export class WebhooksController {
  static async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) {
        throw new AppError('Missing X-Razorpay-Signature header.', 400, 'MISSING_SIGNATURE');
      }

      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const result = await WebhooksService.processRazorpayWebhook(
        rawBody,
        signature,
        req.body,
        req.requestId
      );

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
