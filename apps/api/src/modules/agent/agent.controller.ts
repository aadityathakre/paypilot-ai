import { Request, Response, NextFunction } from 'express';
import { AgentService } from './agent.service.js';

export class AgentController {
  static async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const session = await AgentService.createOrGetSession(customerId, req.body.merchantId);
      res.status(200).json({
        success: true,
        data: { session },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const sessionId = req.params.id;
      const { message } = req.body;

      const decision = await AgentService.processMessage(sessionId, customerId, message, req.requestId);
      res.status(200).json({
        success: true,
        data: decision,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const session = await AgentService.getSession(req.params.id, customerId);
      res.status(200).json({
        success: true,
        data: { session },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
