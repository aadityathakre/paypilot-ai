import { OrderStatus, PaymentStatus, CartStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { RazorpayService } from '../../integrations/razorpay/razorpay.service.js';
import { emailService } from '../../integrations/email/email.service.js';
import { VerifyPaymentInput } from './payments.schema.js';

import { env } from '../../config/env.js';

export class PaymentsService {
  /**
   * Return Razorpay Public Key ID for standard checkout SDK initialization
   */
  static async getKey() {
    return {
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_SYAcYi8w0tPFB9',
    };
  }

  /**
   * Create Razorpay order via official API
   */
  static async createRazorpayOrder(amountInr: number, receipt?: string) {
    const amountPaise = Math.round(amountInr * 100);
    const rec = receipt || `rcpt_${Date.now().toString(36)}`;
    const razorpayOrder = await RazorpayService.createOrder(amountPaise, rec);
    return {
      razorpayOrderId: razorpayOrder.id,
      amountPaise: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_SYAcYi8w0tPFB9',
    };
  }

  /**
   * Pay order with PayPilot Prepaid Wallet balance (Strict DB Balance Check)
   */
  static async payWithWallet(customerId: string, orderId: string, requestId = 'req_wallet_pay') {
    // 1. Fetch user & wallet balance from DB
    const user = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!user) {
      throw new AppError('User account not found.', 404, 'USER_NOT_FOUND');
    }

    // 2. Fetch order from DB
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!order || order.customerId !== customerId) {
      throw new AppError('Order not found or unauthorized.', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === OrderStatus.PAID) {
      return {
        verified: true,
        orderId: order.id,
        orderStatus: OrderStatus.PAID,
        amountInr: Number(order.amountPaise) / 100,
        walletBalanceInr: Number(user.walletBalancePaise) / 100,
        message: 'Order was already verified and marked as paid.',
      };
    }

    // 3. STRICT DB BALANCE CHECK: Check if wallet balance in PostgreSQL is sufficient!
    if (user.walletBalancePaise < order.amountPaise) {
      const currentBalanceInr = Number(user.walletBalancePaise) / 100;
      const requiredAmountInr = Number(order.amountPaise) / 100;
      const shortfallInr = requiredAmountInr - currentBalanceInr;
      
      // Record audit log for blocked wallet payment
      await prisma.auditEvent.create({
        data: {
          merchantId: order.merchantId,
          customerId,
          eventType: 'WALLET_PAYMENT_BLOCKED_INSUFFICIENT_FUNDS',
          actorType: 'PAYMENT_ENGINE',
          requestId,
          data: {
            orderId: order.id,
            currentBalanceInr,
            requiredAmountInr,
            shortfallInr,
          },
        },
      }).catch(() => null);

      throw new AppError(
        `Insufficient Wallet Balance! Your wallet balance is ₹${currentBalanceInr.toLocaleString('en-IN')}, but order total is ₹${requiredAmountInr.toLocaleString('en-IN')}. Please top up your wallet via Razorpay by ₹${shortfallInr.toLocaleString('en-IN')} to proceed.`,
        400,
        'INSUFFICIENT_WALLET_BALANCE'
      );
    }

    // 4. ATOMIC DB DEDUCTION & ORDER PAID TRANSITION
    const result = await prisma.$transaction(async (tx) => {
      // Deduct wallet balance from User in DB
      const updatedUser = await tx.user.update({
        where: { id: customerId },
        data: {
          walletBalancePaise: {
            decrement: order.amountPaise,
          },
        },
      });

      // Create captured Payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          razorpayPaymentId: `pay_wallet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          razorpaySignature: 'paypilot_wallet_deduction_verified',
          amountPaise: order.amountPaise,
          status: PaymentStatus.CAPTURED,
          method: 'wallet',
          verifiedAt: new Date(),
        },
      });

      // Update Order to PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
        },
      });

      // Update active customer Cart to CONVERTED
      await tx.cart.updateMany({
        where: {
          customerId,
          status: CartStatus.ACTIVE,
        },
        data: {
          status: CartStatus.CONVERTED,
        },
      });

      // Decrement inventory stock in DB
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Record Audit Event
      await tx.auditEvent.create({
        data: {
          merchantId: order.merchantId,
          customerId,
          eventType: 'WALLET_PAYMENT_SUCCESS',
          actorType: 'PAYMENT_ENGINE',
          requestId,
          data: {
            orderId: order.id,
            paymentId: payment.id,
            amountPaidInr: Number(order.amountPaise) / 100,
            newWalletBalanceInr: Number(updatedUser.walletBalancePaise) / 100,
            status: 'PAID',
          },
        },
      });

      return { payment, updatedOrder, updatedUser };
    });

    return {
      verified: true,
      orderId: result.updatedOrder.id,
      orderStatus: result.updatedOrder.status,
      paymentId: result.payment.id,
      amountInr: Number(order.amountPaise) / 100,
      walletBalanceInr: Number(result.updatedUser.walletBalancePaise) / 100,
      updatedAt: result.updatedOrder.updatedAt,
    };
  }

  /**
   * Cryptographically verify payment and transition order to PAID state
   */
  static async verifyPayment(
    customerId: string,
    input: VerifyPaymentInput,
    requestId = 'req_payment_verify'
  ) {
    // 1. Fetch local order
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order || order.customerId !== customerId) {
      throw new AppError('Order not found or unauthorized.', 404, 'ORDER_NOT_FOUND');
    }

    // Idempotency: If already paid, return success immediately
    if (order.status === OrderStatus.PAID) {
      return {
        verified: true,
        orderId: order.id,
        orderStatus: OrderStatus.PAID,
        razorpayPaymentId: input.razorpayPaymentId,
        amountInr: Number(order.amountPaise) / 100,
        message: 'Order was already verified and marked as paid.',
      };
    }

    // 2. HMAC SHA256 Signature Verification
    const isValidSignature = RazorpayService.verifyPaymentSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    );

    if (!isValidSignature) {
      // Record failed payment attempt safely
      if (input.razorpayPaymentId) {
        await prisma.payment.upsert({
          where: { razorpayPaymentId: input.razorpayPaymentId },
          update: { status: PaymentStatus.FAILED, rawStatus: 'Cryptographic HMAC signature mismatch' },
          create: {
            orderId: order.id,
            razorpayPaymentId: input.razorpayPaymentId,
            amountPaise: order.amountPaise,
            status: PaymentStatus.FAILED,
            method: input.paymentMethod,
            rawStatus: 'Cryptographic HMAC signature mismatch',
          },
        }).catch(() => null);
      }

      await prisma.auditEvent.create({
        data: {
          merchantId: order.merchantId,
          customerId,
          eventType: 'PAYMENT_VERIFICATION_FAILED',
          actorType: 'PAYMENT_ENGINE',
          requestId,
          data: {
            orderId: order.id,
            razorpayOrderId: input.razorpayOrderId,
            razorpayPaymentId: input.razorpayPaymentId,
            reason: 'INVALID_SIGNATURE',
          },
        },
      });

      throw new AppError(
        'Payment signature verification failed. Untrusted or tampered payload.',
        400,
        'INVALID_PAYMENT_SIGNATURE'
      );
    }

    // 3. Atomic State Transition & Stock Decrement
    const result = await prisma.$transaction(async (tx) => {
      // Create captured Payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          amountPaise: order.amountPaise,
          status: PaymentStatus.CAPTURED,
          method: input.paymentMethod,
          verifiedAt: new Date(),
        },
      });

      // Update Order to PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
        },
      });

      // Update active customer Cart to CONVERTED
      await tx.cart.updateMany({
        where: {
          customerId,
          status: CartStatus.ACTIVE,
        },
        data: {
          status: CartStatus.CONVERTED,
        },
      });

      // Decrement inventory stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Record Audit Event
      await tx.auditEvent.create({
        data: {
          merchantId: order.merchantId,
          customerId,
          eventType: 'PAYMENT_VERIFIED',
          actorType: 'PAYMENT_ENGINE',
          requestId,
          data: {
            orderId: order.id,
            paymentId: payment.id,
            razorpayPaymentId: input.razorpayPaymentId,
            amountPaise: Number(order.amountPaise),
            status: 'PAID',
          },
        },
      });

      return { payment, updatedOrder };
    });

    // Trigger async order receipt email
    prisma.user
      .findUnique({ where: { id: customerId } })
      .then((user) => {
        if (user?.email) {
          emailService
            .sendOrderConfirmationEmail({
              toEmail: user.email,
              customerName: user.name || 'Customer',
              orderId: order.id,
              razorpayPaymentId: input.razorpayPaymentId,
              totalAmountRupees: Number(order.amountPaise) / 100,
              items: order.items.map((i) => ({
                name: i.product?.name || 'Product',
                quantity: i.quantity,
                unitPriceRupees: Number(i.unitPricePaise) / 100,
              })),
            })
            .catch(() => null);
        }
      })
      .catch(() => null);

    return {
      verified: true,
      orderId: result.updatedOrder.id,
      orderStatus: result.updatedOrder.status,
      paymentId: result.payment.id,
      razorpayPaymentId: input.razorpayPaymentId,
      amountInr: Number(order.amountPaise) / 100,
      updatedAt: result.updatedOrder.updatedAt,
    };
  }
}
