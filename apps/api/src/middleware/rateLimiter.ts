import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitStore>();

/**
 * Clean up expired entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, store] of ipMap.entries()) {
    if (now > store.resetTime) {
      ipMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(options: { windowMs?: number; max?: number; message?: string }) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 60;                  // 60 requests per minute
  const message = options.message || 'Too many requests, please try again later.';

  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown_ip';
    const now = Date.now();

    const record = ipMap.get(ip);

    if (!record || now > record.resetTime) {
      ipMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    }

    record.count++;
    next();
  };
}
