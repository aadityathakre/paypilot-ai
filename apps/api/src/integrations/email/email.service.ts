import nodemailer from 'nodemailer';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isSmtpConfigured = false;

  constructor() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        this.isSmtpConfigured = true;
        logger.info({ host: smtpHost, user: smtpUser }, 'Nodemailer SMTP Transporter initialized successfully.');
      } catch (err) {
        logger.warn({ error: err }, 'Failed to initialize Nodemailer SMTP transporter. Operating in console log fallback mode.');
      }
    } else {
      logger.info('SMTP credentials not fully set in .env. EmailService operating in Console Log Fallback Mode.');
    }
  }

  /**
   * Send Order Confirmation Email with HTML layout
   */
  async sendOrderConfirmationEmail(params: {
    toEmail: string;
    customerName: string;
    orderId: string;
    razorpayPaymentId: string;
    totalAmountRupees: number;
    items: Array<{ name: string; quantity: number; unitPriceRupees: number }>;
  }): Promise<boolean> {
    const { toEmail, customerName, orderId, razorpayPaymentId, totalAmountRupees, items } = params;

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #334155; color: #f8fafc;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #334155; color: #cbd5e1; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #334155; color: #38bdf8; text-align: right; font-weight: 600;">₹${item.unitPriceRupees.toLocaleString('en-IN')}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 30px; border: 1px solid #334155; }
          .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #0284c7; }
          .badge { display: inline-block; background: #059669; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-top: 10px; }
          .details { margin: 20px 0; background: #0f172a; border-radius: 8px; padding: 15px; }
          .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { text-align: left; padding: 10px; background: #334155; color: #94a3b8; font-size: 12px; text-transform: uppercase; }
          .total { font-size: 18px; font-weight: 700; color: #10b981; text-align: right; margin-top: 20px; }
          .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #334155; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">⚡ PayPilot AI</div>
            <div class="badge">✓ Payment Confirmed</div>
            <h2 style="margin: 15px 0 5px 0; color: #f8fafc;">Order Confirmation</h2>
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">Hi ${customerName}, thank you for your order!</p>
          </div>

          <div class="details">
            <div class="details-row"><span style="color: #94a3b8;">Order ID:</span> <span style="color: #38bdf8; font-family: monospace;">${orderId}</span></div>
            <div class="details-row"><span style="color: #94a3b8;">Razorpay Payment ID:</span> <span style="color: #34d399; font-family: monospace;">${razorpayPaymentId}</span></div>
            <div class="details-row"><span style="color: #94a3b8;">Verification:</span> <span style="color: #10b981; font-weight: 700;">HMAC SHA256 PASSED</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total">
            Total Paid: ₹${totalAmountRupees.toLocaleString('en-IN')}
          </div>

          <div class="footer">
            <p>PayPilot AI Commerce Agent — Grounded AI & Bounded Razorpay Checkout</p>
            <p>This is an automated receipt generated for order ${orderId}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: toEmail,
      subject: `Order Confirmed #${orderId.slice(0, 8)} — PayPilot AI`,
      html: htmlContent,
      text: `Hi ${customerName}, your PayPilot AI order ${orderId} for ₹${totalAmountRupees} is confirmed! Payment ID: ${razorpayPaymentId}`,
    });
  }

  /**
   * Send Email Verification 6-Digit OTP Code
   */
  async sendVerificationOtpEmail(params: {
    toEmail: string;
    userName: string;
    otpCode: string;
  }): Promise<boolean> {
    const { toEmail, userName, otpCode } = params;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 30px; border: 1px solid #334155; text-align: center; }
          .logo { font-size: 22px; font-weight: 800; color: #38bdf8; margin-bottom: 10px; }
          .otp-box { background: #090d16; border: 2px border #38bdf8; border-radius: 12px; padding: 20px; margin: 20px 0; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #34d399; font-family: monospace; }
          .notice { color: #94a3b8; font-size: 13px; line-height: 1.5; }
          .footer { text-align: center; color: #64748b; font-size: 11px; margin-top: 25px; border-top: 1px solid #334155; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">⚡ PayPilot Commerce</div>
          <h2 style="margin: 10px 0; color: #f8fafc;">Verify Your Email Address</h2>
          <p class="notice">Hi <strong>${userName}</strong>, use the 6-digit OTP code below to verify your email address. This OTP is valid for <strong>5 minutes</strong>.</p>
          
          <div class="otp-box">${otpCode}</div>

          <p class="notice">If you did not request this OTP code, please ignore this email.</p>

          <div class="footer">
            <p>PayPilot AI — Grounded Agentic Commerce & Bounded Payments</p>
            <p>Sent from team.aditya.invincible@gmail.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: toEmail,
      subject: `PayPilot Email Verification OTP: ${otpCode}`,
      html: htmlContent,
      text: `Hi ${userName}, your PayPilot email verification OTP code is: ${otpCode}. It expires in 5 minutes.`,
    });
  }

  /**
   * Send Password Reset 6-Digit OTP Code
   */
  async sendForgotPasswordOtpEmail(params: {
    toEmail: string;
    userName: string;
    otpCode: string;
  }): Promise<boolean> {
    const { toEmail, userName, otpCode } = params;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 30px; border: 1px solid #334155; text-align: center; }
          .logo { font-size: 22px; font-weight: 800; color: #c084fc; margin-bottom: 10px; }
          .otp-box { background: #090d16; border: 2px border #c084fc; border-radius: 12px; padding: 20px; margin: 20px 0; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #c084fc; font-family: monospace; }
          .notice { color: #94a3b8; font-size: 13px; line-height: 1.5; }
          .footer { text-align: center; color: #64748b; font-size: 11px; margin-top: 25px; border-top: 1px solid #334155; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">⚡ PayPilot Security</div>
          <h2 style="margin: 10px 0; color: #f8fafc;">Password Reset OTP</h2>
          <p class="notice">Hi <strong>${userName}</strong>, you requested to reset your password. Use the 6-digit OTP code below to confirm your request. This code is valid for <strong>5 minutes</strong>.</p>
          
          <div class="otp-box">${otpCode}</div>

          <p class="notice">If you did not request a password reset, please secure your account immediately.</p>

          <div class="footer">
            <p>PayPilot AI — Grounded Agentic Commerce & Bounded Payments</p>
            <p>Sent from team.aditya.invincible@gmail.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: toEmail,
      subject: `PayPilot Password Reset OTP: ${otpCode}`,
      html: htmlContent,
      text: `Hi ${userName}, your PayPilot password reset OTP code is: ${otpCode}. It expires in 5 minutes.`,
    });
  }

  /**
   * Internal helper to dispatch mail or log to console fallback
   */
  private async sendMail(options: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
    const from = process.env.SMTP_FROM || 'PayPilot AI <no-reply@paypilot.ai>';

    if (this.isSmtpConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully via SMTP.');
        return true;
      } catch (error) {
        logger.error({ error, to: options.to }, 'SMTP email sending failed. Falling back to logger.');
      }
    }

    // Console Log Fallback Mode
    logger.info(
      {
        to: options.to,
        from,
        subject: options.subject,
        previewText: options.text,
      },
      '📧 [EMAIL SERVICE - CONSOLE FALLBACK] Email Notification Output'
    );
    return true;
  }
}

export const emailService = new EmailService();
