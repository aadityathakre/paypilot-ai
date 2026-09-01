import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma, withDbRetry } from '../../config/db.js';
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
    const existing = await withDbRetry(() => prisma.user.findUnique({
      where: { email: input.email },
    }), 'auth.register.lookupUser');

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await withDbRetry(() => prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
    }), 'auth.register.createUser');

    let merchantId: string | undefined;
    let merchantData = null;

    // If registered as a merchant, create default Merchant organization and Policy
    if (input.role === UserRole.MERCHANT) {
      const merchant = await withDbRetry(() => prisma.merchant.create({
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
      }), 'auth.register.createMerchant');
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
    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { email: input.email },
      include: {
        merchants: {
          select: { id: true, name: true, currency: true },
          take: 1,
        },
      },
    }), 'auth.login.lookupUser');

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
    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { id: userId },
      include: {
        merchants: {
          select: { id: true, name: true, currency: true },
          take: 1,
        },
      },
    }), 'auth.getMe.lookupUser');

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

  /**
   * Forgot password trigger
   */
  static async forgotPassword(email: string): Promise<{ sent: boolean; message: string }> {
    const user = await withDbRetry(() => prisma.user.findUnique({ where: { email } }));
    if (!user) {
      // Do not reveal email existence for security
      return { sent: true, message: 'If an account exists with this email, a reset link has been dispatched.' };
    }

    // Generate token
    const resetToken = jwt.sign({ id: user.id, purpose: 'PASSWORD_RESET' }, env.JWT_SECRET, { expiresIn: '1h' });

    // Send email asynchronously
    const { emailService } = await import('../../integrations/email/email.service.js');
    emailService.sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetToken,
    }).catch(() => null);

    return { sent: true, message: 'If an account exists with this email, a reset link has been dispatched.' };
  }

  /**
   * Reset password with valid token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      if (decoded.purpose !== 'PASSWORD_RESET') {
        throw new AppError('Invalid or expired reset token.', 400, 'INVALID_TOKEN');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: decoded.id },
        data: { passwordHash },
      });

      return { success: true, message: 'Password updated successfully. You can now login.' };
    } catch {
      throw new AppError('Invalid or expired reset token.', 400, 'INVALID_TOKEN');
    }
  }
}
