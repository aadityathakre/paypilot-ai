import crypto from 'crypto';
import { OrderStatus, PaymentStatus, CartStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../middleware/errorHandler.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';

export class WebhooksService {
  /**
   * Cryptographically verify raw buffer against Razorpay webhook secret
   */
  static verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!signature || !rawBody) return false;
    const secret = env.RAZORPAY_WEBHOOK_SECRET;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(signature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Helper to generate a valid test webhook signature
   */
  static generateTestWebhookSignature(rawBody: Buffer): string {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    return crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
  }

  /**
   * Ingest and process Razorpay webhook events with persistent idempotency
   */
  static async processRazorpayWebhook(
    rawBody: Buffer,
    signature: string,
    eventPayload: any,
    requestId = 'req_webhook'
  ) {
    // 1. Signature Verification
    const isValid = this.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn({ requestId }, 'Invalid webhook HMAC signature rejected');
      throw new AppError('Invalid webhook signature.', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const eventId = eventPayload.id || `evt_${eventPayload.event}_${eventPayload.created_at || Date.now()}`;
    const eventType = eventPayload.event;

    // 2. Idempotency Lock
    const { acquired, record } = await IdempotencyService.lockKey(eventId, 'RAZORPAY_WEBHOOK');
    if (!acquired && record?.response) {
      logger.info({ eventId, eventType }, 'Duplicate webhook event received, returning cached response');
      return record.response;
    }

    let responseResult = { status: 'acknowledged', eventId, event: eventType };

    try {
      // 3. Event Handling
      if (eventType === 'payment.captured') {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        if (paymentEntity) {
          const razorpayOrderId = paymentEntity.order_id;
          const razorpayPaymentId = paymentEntity.id;
          const method = paymentEntity.method || 'upi';

          const order = await prisma.order.findFirst({
            where: {
              OR: [
                { razorpayOrderId },
                { id: paymentEntity.notes?.orderId },
              ],
            },
            include: { items: true },
          });

          if (order) {
            await prisma.$transaction(async (tx) => {
              // Upsert captured payment
              await tx.payment.upsert({
                where: { razorpayPaymentId },
                update: { status: PaymentStatus.CAPTURED, verifiedAt: new Date() },
                create: {
                  orderId: order.id,
                  razorpayPaymentId,
                  amountPaise: order.amountPaise,
                  status: PaymentStatus.CAPTURED,
                  method,
                  verifiedAt: new Date(),
                },
              });

              // Mark Order as PAID if not already
              if (order.status !== OrderStatus.PAID) {
                await tx.order.update({
                  where: { id: order.id },
                  data: { status: OrderStatus.PAID },
                });

                // Decrement inventory stock
                for (const item of order.items) {
                  await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                  });
                }

                // Convert active cart
                if (order.cartId) {
                  await tx.cart.update({
                    where: { id: order.cartId },
                    data: { status: CartStatus.CONVERTED },
                  }).catch(() => null);
                }
              }

              // Record Audit Event
              await tx.auditEvent.create({
                data: {
                  merchantId: order.merchantId,
                  customerId: order.customerId,
                  orderId: order.id,
                  eventType: 'WEBHOOK_PAYMENT_CAPTURED',
                  actorType: 'PAYMENT_ENGINE',
                  requestId,
                  data: {
                    eventId,
                    razorpayOrderId,
                    razorpayPaymentId,
                    amountPaise: Number(order.amountPaise),
                  },
                },
              });
            }, { timeout: 25000, maxWait: 10000 });
            responseResult = { status: 'processed', eventId, event: eventType };
          }
        }
      } else if (eventType === 'payment.failed') {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        if (paymentEntity) {
          const razorpayOrderId = paymentEntity.order_id;
          const razorpayPaymentId = paymentEntity.id;

          const order = await prisma.order.findFirst({
            where: {
              OR: [
                { razorpayOrderId },
                { id: paymentEntity.notes?.orderId },
              ],
            },
          });

          if (order) {
            await prisma.payment.upsert({
              where: { razorpayPaymentId },
              update: {
                status: PaymentStatus.FAILED,
                rawStatus: paymentEntity.error_description || 'Payment Failed',
              },
              create: {
                orderId: order.id,
                razorpayPaymentId,
                amountPaise: order.amountPaise,
                status: PaymentStatus.FAILED,
                rawStatus: paymentEntity.error_description || 'Payment Failed',
              },
            });

            await prisma.auditEvent.create({
              data: {
                merchantId: order.merchantId,
                customerId: order.customerId,
                orderId: order.id,
                eventType: 'WEBHOOK_PAYMENT_FAILED',
                actorType: 'PAYMENT_ENGINE',
                requestId,
                data: {
                  eventId,
                  razorpayOrderId,
                  razorpayPaymentId,
                  errorDescription: paymentEntity.error_description,
                },
              },
            });
            responseResult = { status: 'processed', eventId, event: eventType };
          }
        }
      }

      // Save Idempotency response
      await IdempotencyService.saveResponse(eventId, 'RAZORPAY_WEBHOOK', responseResult);
      return responseResult;
    } catch (err) {
      logger.error({ err, eventId }, 'Error processing webhook event');
      throw err;
    }
  }
}
