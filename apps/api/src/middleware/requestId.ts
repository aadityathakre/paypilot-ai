import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      rawBody?: Buffer;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'];
  const requestId = (typeof existingId === 'string' && existingId.trim() !== '') 
    ? existingId 
    : `req_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
