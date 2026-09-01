import { Request, Response, NextFunction } from 'express';
import { CartService } from './cart.service.js';

export class CartController {
  static async getActiveCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const cart = await CartService.getActiveCart(customerId);
      res.status(200).json({
        success: true,
        data: { cart },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const cart = await CartService.addItem(customerId, req.body);
      res.status(200).json({
        success: true,
        data: { cart },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const cart = await CartService.updateQuantity(customerId, req.params.itemId, req.body);
      res.status(200).json({
        success: true,
        data: { cart },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const cart = await CartService.removeItem(customerId, req.params.itemId);
      res.status(200).json({
        success: true,
        data: { cart },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const cart = await CartService.clearCart(customerId);
      res.status(200).json({
        success: true,
        data: { cart },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
