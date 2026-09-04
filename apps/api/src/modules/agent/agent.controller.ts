import { Request, Response, NextFunction } from 'express';
import { AgentService } from './agent.service.js';
import { prisma } from '../../config/db.js';

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
      const { message, language } = req.body;

      const decision = await AgentService.processMessage(sessionId, customerId, message, req.requestId, language);
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

  /**
   * Agent-Readable Catalog Endpoint (UAP / ACP / AP2 / x402 Protocol Compliant)
   */
  static async getAgentReadableCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await prisma.product.findMany({
        where: { active: true, stock: { gt: 0 } },
        include: { merchant: true },
      });

      const catalog = {
        protocolVersion: 'ACP/1.0-UAP-x402',
        agenticCommerceReady: true,
        merchantTrack: 'Track 01 — AI Growth & Agentic Commerce',
        boundedPolicy: {
          maxOrderValueInr: 100000,
          currency: 'INR',
          checkoutGating: 'POSTGRESQL_HMAC_SHA256',
        },
        products: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          description: p.description,
          priceInr: Number(p.pricePaise) / 100,
          pricePaise: Number(p.pricePaise),
          stockAvailable: p.stock,
          merchant: {
            id: p.merchantId,
            name: p.merchant.name,
          },
          actions: {
            addToCart: `/api/carts/items`,
            directCheckout: `/api/checkout/session`,
          },
        })),
      };

      res.status(200).json({
        success: true,
        data: catalog,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}
