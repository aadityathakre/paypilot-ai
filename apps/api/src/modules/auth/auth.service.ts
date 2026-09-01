import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { AuthUser } from '../../middleware/auth.js';

interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  merchant?: {
    id: string;
    name: string;
    currency: string;
  } | null;
}

interface AuthResponse {
  user: SafeUser;
  token: string;
}

export class AuthService {
  /**
   * Register a new user (CUSTOMER or MERCHANT)
   */
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
    });

    let merchantId: string | undefined;
    let merchantData = null;

    // If registered as a merchant, create default Merchant organization and Policy
    if (input.role === UserRole.MERCHANT) {
      const merchant = await prisma.merchant.create({
        data: {
          ownerUserId: user.id,
          name: input.merchantName || `${input.name}'s Store`,
          currency: 'INR',
          policy: {
            create: {
              maxOrderValuePaise: BigInt(8000000), // ₹80,000 ceiling
              maxUpsellDiscountBps: 1000,          // 10% max bundle discount
              upsellEnabled: true,
              paymentConfirmationRequired: true,
              allowedCategories: ['laptops', 'monitors', 'keyboards_mice', 'audio_video', 'accessories'],
              allowedAgentActions: ['SEARCH_CATALOG', 'RECOMMEND_PRODUCT', 'PROPOSE_UPSELL', 'CREATE_ORDER'],
            },
          },
        },
      });
      merchantId = merchant.id;
      merchantData = { id: merchant.id, name: merchant.name, currency: merchant.currency };
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        merchant: merchantData,
      },
      token,
    };
  }

  /**
   * Authenticate user with email and password
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        merchants: {
          select: { id: true, name: true, currency: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const primaryMerchant = user.merchants[0] || null;
    const merchantId = primaryMerchant ? primaryMerchant.id : undefined;

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        merchant: primaryMerchant,
      },
      token,
    };
  }

  /**
   * Retrieve current authenticated user profile
   */
  static async getMe(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        merchants: {
          select: { id: true, name: true, currency: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      merchant: user.merchants[0] || null,
    };
  }

  /**
   * Helper to sign a JWT token
   */
  private static generateToken(payload: AuthUser): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }
}
