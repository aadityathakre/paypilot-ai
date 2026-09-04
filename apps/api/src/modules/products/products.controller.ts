import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export class ProductsController {
  static async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams: any = { ...req.query };
      if ((queryParams.mine === 'true' || queryParams.mine === true) && req.user?.merchantId) {
        queryParams.merchantId = req.user.merchantId;
      }
      const result = await ProductsService.listProducts(queryParams);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductsService.getProductById(req.params.id);
      res.status(200).json({
        success: true,
        data: { product },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await ProductsService.listCategories();
      res.status(200).json({
        success: true,
        data: { categories },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        throw new AppError('Merchant profile required to create products.', 403, 'FORBIDDEN');
      }

      const product = await ProductsService.createProduct(merchantId, req.body);
      res.status(201).json({
        success: true,
        data: { product },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        throw new AppError('Merchant profile required to update products.', 403, 'FORBIDDEN');
      }

      const product = await ProductsService.updateProduct(merchantId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: { product },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        throw new AppError('Merchant profile required to delete products.', 403, 'FORBIDDEN');
      }

      await ProductsService.deleteProduct(merchantId, req.params.id);
      res.status(200).json({
        success: true,
        data: { message: 'Product deleted successfully.' },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
