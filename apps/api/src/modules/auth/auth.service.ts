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
  walletBalanceInr: number;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  emailVerified: boolean;
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
    const userRole = input.role || UserRole.CUSTOMER;

    const user = await withDbRetry(() => prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: userRole,
        walletBalancePaise: BigInt(1000000), // ₹10,000 default test balance
      },
    }), 'auth.register.createUser');

    let merchantData = null;
    let merchantId: string | undefined;

    if (userRole === UserRole.MERCHANT) {
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
        walletBalanceInr: Number(user.walletBalancePaise) / 100,
        avatarUrl: user.avatarUrl,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
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
        walletBalanceInr: Number(user.walletBalancePaise) / 100,
        avatarUrl: user.avatarUrl,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
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
      walletBalanceInr: Number(user.walletBalancePaise) / 100,
      avatarUrl: user.avatarUrl,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      merchant: user.merchants[0] || null,
    };
  }

  /**
   * Top up customer wallet balance with Razorpay payment simulation
   */
  static async topupWallet(userId: string, amountInr: number, paymentId?: string): Promise<{ success: boolean; walletBalanceInr: number }> {
    if (amountInr <= 0) {
      throw new AppError('Top-up amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    }

    const amountPaise = BigInt(Math.round(amountInr * 100));

    const updatedUser = await withDbRetry(() => prisma.user.update({
      where: { id: userId },
      data: {
        walletBalancePaise: {
          increment: amountPaise,
        },
      },
    }), 'auth.topupWallet');

    // Fetch primary merchant for audit log
    const primaryMerchant = await prisma.merchant.findFirst();
    if (primaryMerchant) {
      await prisma.auditEvent.create({
        data: {
          merchantId: primaryMerchant.id,
          customerId: userId,
          eventType: 'WALLET_TOPUP_SUCCESS',
          actorType: 'CUSTOMER',
          data: {
            amountInr,
            paymentId: paymentId || `pay_topup_${Date.now()}`,
            newBalanceInr: Number(updatedUser.walletBalancePaise) / 100,
          },
        },
      }).catch(() => null);
    }

    return {
      success: true,
      walletBalanceInr: Number(updatedUser.walletBalancePaise) / 100,
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
   * Forgot password: Generate 6-digit OTP, set 5-min expiry in DB, and send via Nodemailer
   */
  static async requestForgotPasswordOtp(email: string): Promise<{ sent: boolean; message: string }> {
    const user = await withDbRetry(() => prisma.user.findUnique({ where: { email } }));
    if (!user) {
      throw new AppError('No account found with this email address.', 404, 'USER_NOT_FOUND');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    const { emailService } = await import('../../integrations/email/email.service.js');
    emailService.sendForgotPasswordOtpEmail({
      toEmail: user.email,
      userName: user.name,
      otpCode,
    }).catch(() => null);

    return { sent: true, message: `Password reset 6-digit OTP code sent to ${email} via Nodemailer. Code is valid for 5 minutes.` };
  }

  /**
   * Reset password using verified 6-digit OTP from PostgreSQL DB
   */
  static async resetPasswordWithOtp(email: string, otpCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('No account found with this email address.', 404, 'USER_NOT_FOUND');
    }

    if (!user.otpCode || user.otpCode !== otpCode.trim()) {
      throw new AppError('Invalid OTP code. Please check your email inbox.', 400, 'OTP_MISMATCH');
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new AppError('OTP code has expired (5-minute limit). Please request a new OTP.', 400, 'OTP_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return { success: true, message: 'Password updated successfully! You can now log in with your new password.' };
  }
}
