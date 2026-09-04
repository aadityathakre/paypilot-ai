import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  merchantId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticateJwt = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please provide a valid Bearer token.', 401, 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    let decoded: AuthUser;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    } catch {
      decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      merchantId: decoded.merchantId,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token has expired. Please login again.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token.', 401, 'AUTH_INVALID'));
  }
};

// Optional auth helper (attaches user if token present, but doesn't block guests)
export const optionalJwt = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    let decoded: AuthUser;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    } catch {
      decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    }
    req.user = decoded;
  } catch {
    // Ignore invalid token in optional mode
  }
  next();
};
