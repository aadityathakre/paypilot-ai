import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { agentRouter } from './modules/agent/agent.routes.js';
import { checkoutRouter } from './modules/checkout/checkout.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { webhooksRouter } from './modules/webhooks/webhooks.routes.js';
import { merchantRouter } from './modules/merchant/merchant.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { userRouter } from './modules/user/user.routes.js';
import { rateLimiter } from './middleware/rateLimiter.js';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Razorpay-Signature'],
    })
  );

  // Correlation ID
  app.use(requestIdMiddleware);

  // Body parser with raw buffer preservation for Razorpay webhook verification
  app.use(
    express.json({
      verify: (req: Request, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // HTTP Request Logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      }, 'HTTP Request Completed');
    });
    next();
  });

  // Root & Health routes
  app.use('/', healthRouter);
  app.use('/api', healthRouter);

  // Commerce, Agent, Policy, Payment, Webhook, Merchant & Audit routes
  app.use('/api/auth', rateLimiter({ windowMs: 60 * 1000, max: 30 }), authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/carts', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/agent', agentRouter);
  app.use('/api/checkout', rateLimiter({ windowMs: 60 * 1000, max: 40 }), checkoutRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/merchant', merchantRouter);
  app.use('/api/audit', auditRouter);

  // 404 Route Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
