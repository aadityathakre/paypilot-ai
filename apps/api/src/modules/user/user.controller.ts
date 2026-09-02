import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service.js';
import { emailService } from '../../integrations/email/email.service.js';

export class UserController {
  /**
   * Upload profile avatar to Cloudinary & save URL to DB
   */
  static async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { avatarData } = req.body;

      if (!avatarData) {
        throw new AppError('Avatar image data is required.', 400, 'AVATAR_REQUIRED');
      }

      // Upload to Cloudinary
      const { url } = await CloudinaryService.uploadAvatar(avatarData);

      // Save URL to PostgreSQL database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: url },
      });

      res.status(200).json({
        success: true,
        data: {
          avatarUrl: updatedUser.avatarUrl,
        },
        message: 'Profile avatar updated successfully via Cloudinary.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove profile avatar from DB
   */
  static async removeAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
      });

      res.status(200).json({
        success: true,
        data: { avatarUrl: null },
        message: 'Profile avatar removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update profile details (Name, Phone Number)
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, phoneNumber } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(phoneNumber !== undefined && { phoneNumber }),
        },
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          avatarUrl: updatedUser.avatarUrl,
        },
        message: 'Profile details updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate 6-digit OTP, save to DB with 5-minute expiry, and dispatch via Nodemailer
   */
  static async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      // Generate random 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      // Save OTP to PostgreSQL DB
      await prisma.user.update({
        where: { id: userId },
        data: {
          otpCode,
          otpExpiresAt,
        },
      });

      // Dispatch real email via Nodemailer from team.aditya.invincible@gmail.com
      emailService.sendVerificationOtpEmail({
        toEmail: user.email,
        userName: user.name,
        otpCode,
      }).catch(() => null);

      res.status(200).json({
        success: true,
        data: { sent: true, email: user.email, expiresAt: otpExpiresAt },
        message: `6-Digit OTP dispatched to ${user.email} via Nodemailer. Code expires in 5 minutes!`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify 6-digit OTP code against PostgreSQL DB
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { otpCode } = req.body;

      if (!otpCode || typeof otpCode !== 'string') {
        throw new AppError('A valid 6-digit OTP code is required.', 400, 'INVALID_OTP');
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      if (!user.otpCode || user.otpCode !== otpCode.trim()) {
        throw new AppError('Invalid OTP code. Please check your email inbox.', 400, 'OTP_MISMATCH');
      }

      if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
        throw new AppError('OTP code has expired (5-minute limit exceeded). Please click Resend OTP.', 400, 'OTP_EXPIRED');
      }

      // Mark email as verified and clear OTP code in DB
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          otpCode: null,
          otpExpiresAt: null,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          emailVerified: updatedUser.emailVerified,
        },
        message: 'Email address verified successfully in PostgreSQL database!',
      });
    } catch (error) {
      next(error);
    }
  }
}
