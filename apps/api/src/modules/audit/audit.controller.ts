import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';

export class AuditController {
  static async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const eventType = req.query.eventType as string;
      const actorType = req.query.actorType as string;
      const orderId = req.query.orderId as string;
      const sessionId = req.query.sessionId as string;
      const search = req.query.search as string;

      const results = await AuditService.listEvents({
        page,
        limit,
        eventType,
        actorType,
        orderId,
        sessionId,
        search,
      });

      res.status(200).json({
        success: true,
        data: results,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
