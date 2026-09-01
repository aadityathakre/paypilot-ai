import { Request, Response, NextFunction } from 'express';
import { MerchantService } from './merchant.service.js';

export class MerchantController {
  static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchant = await MerchantService.resolveMerchant(req.user?.id);
      const analytics = await MerchantService.getAnalytics(merchant.id);

      res.status(200).json({
        success: true,
        data: {
          merchant: { id: merchant.id, name: merchant.name, currency: merchant.currency },
          ...analytics,
        },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchant = await MerchantService.resolveMerchant(req.user?.id);
      const policy = await MerchantService.getPolicy(merchant.id);

      res.status(200).json({
        success: true,
        data: { policy },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchant = await MerchantService.resolveMerchant(req.user?.id);
      const policy = await MerchantService.updatePolicy(merchant.id, req.body, req.user?.id);

      res.status(200).json({
        success: true,
        data: { policy },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchant = await MerchantService.resolveMerchant(req.user?.id);
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as any;

      const ordersData = await MerchantService.getOrders(merchant.id, { page, limit, status });

      res.status(200).json({
        success: true,
        data: ordersData,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
