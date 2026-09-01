import { OrderStatus, OrderSource } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { CartService } from '../cart/cart.service.js';
import { PolicyService } from '../policy/policy.service.js';
import { RazorpayService } from '../../integrations/razorpay/razorpay.service.js';
import { CreateOrderInput } from './checkout.schema.js';

export class CheckoutService {
  /**
   * Evaluate active cart against merchant policy rules
   */
  static async validateCart(customerId: string, customerConfirmed = true) {
    const cart = await CartService.getActiveCart(customerId);
    const policyResult = await PolicyService.validateCheckout(
      cart.merchantId,
      cart,
      customerConfirmed
    );

    return {
      cart,
      policy: policyResult,
    };
  }

  /**
   * Create pending order and generate Razorpay payment order
   */
  static async createCheckoutOrder(customerId: string, input: CreateOrderInput, requestId = 'req_checkout') {
    const cart = await CartService.getActiveCart(customerId);

    // 1. Policy Gate Evaluation
    const policyResult = await PolicyService.validateCheckout(
      cart.merchantId,
      cart,
      input.customerConfirmed
    );

    if (!policyResult.approved) {
      // Record blocked audit event
      await prisma.auditEvent.create({
        data: {
          merchantId: cart.merchantId,
          customerId,
          eventType: 'POLICY_BLOCKED',
          actorType: 'POLICY_ENGINE',
          requestId,
          data: {
            reason: policyResult.code,
            message: policyResult.message,
            cartTotalPaise: cart.totalPaise,
            maxAllowedPaise: policyResult.maxOrderValuePaise,
          },
        },
      });

      throw new AppError(
        policyResult.message || 'Checkout rejected by merchant governance policy.',
        400,
        policyResult.code || 'POLICY_REJECTED'
      );
    }

    // 2. Record Approved Audit Event
    await prisma.auditEvent.create({
      data: {
        merchantId: cart.merchantId,
        customerId,
        eventType: 'POLICY_APPROVED',
        actorType: 'POLICY_ENGINE',
        requestId,
        data: {
          cartId: cart.id,
          totalPaise: cart.totalPaise,
          itemCount: cart.itemCount,
        },
      },
    });

    // 3. Generate Unique Receipt & Razorpay Order
    const receipt = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const rzpOrder = await RazorpayService.createOrder(cart.totalPaise, receipt, {
      customerId,
      cartId: cart.id,
    });

    // 4. Create Order & OrderItems in DB Transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId,
          merchantId: cart.merchantId,
          cartId: cart.id,
          status: OrderStatus.PENDING_PAYMENT,
          source: OrderSource.AI_ASSISTED,
          currency: 'INR',
          amountPaise: BigInt(cart.totalPaise),
          razorpayOrderId: rzpOrder.id,
          receipt,
        },
      });

      // Create OrderItems
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPricePaise: BigInt(item.unitPricePaise),
            discountPaise: BigInt(0),
          },
        });
      }

      return newOrder;
    });

    return {
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise: cart.totalPaise,
      amountInr: cart.totalInr,
      currency: 'INR',
      receipt,
      keyId: env.RAZORPAY_KEY_ID,
      items: cart.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        priceInr: i.totalPriceInr,
      })),
    };
  }
}
