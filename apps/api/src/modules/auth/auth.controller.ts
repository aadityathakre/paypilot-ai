import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, Next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.status(200).json({
        success: true,
        data: { user },
        requestId: req.requestId,
      });
    } catch (error) {
      Next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, Next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      Next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, Next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      Next(error);
    }
  }
}
