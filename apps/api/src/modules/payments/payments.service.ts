import { OrderStatus, PaymentStatus, CartStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { RazorpayService } from '../../integrations/razorpay/razorpay.service.js';
import { VerifyPaymentInput } from './payments.schema.js';

export class PaymentsService {
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
        items: true,
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
