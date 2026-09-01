import { MerchantPolicy } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { FormattedCart } from '../cart/cart.service.js';

export interface PolicyValidationResult {
  approved: boolean;
  code?: string;
  message?: string;
  maxOrderValuePaise?: number;
  policy?: {
    maxOrderValueInr: number;
    paymentConfirmationRequired: boolean;
    upsellEnabled: boolean;
  };
}

export class PolicyService {
  /**
   * Evaluate deterministic policy constraints against an active cart
   */
  static async validateCheckout(
    merchantId: string,
    cart: FormattedCart,
    customerConfirmed = true
  ): Promise<PolicyValidationResult> {
    // 1. Check cart is not empty
    if (!cart.items || cart.items.length === 0) {
      return {
        approved: false,
        code: 'EMPTY_CART',
        message: 'Cannot proceed to checkout with an empty cart.',
      };
    }

    // 2. Load merchant policy from DB
    const policy = await prisma.merchantPolicy.findUnique({
      where: { merchantId },
    });

    if (!policy) {
      return {
        approved: false,
        code: 'POLICY_NOT_FOUND',
        message: 'Merchant governance policy is not configured.',
      };
    }

    const maxOrderValuePaiseNum = Number(policy.maxOrderValuePaise);
    const maxOrderValueInr = maxOrderValuePaiseNum / 100;

    // 3. Spending Ceiling Enforcement (Hard Guardrail)
    if (cart.totalPaise > maxOrderValuePaiseNum) {
      return {
        approved: false,
        code: 'POLICY_LIMIT_EXCEEDED',
        message: `Order total of ₹${cart.totalInr.toLocaleString('en-IN')} exceeds merchant policy ceiling of ₹${maxOrderValueInr.toLocaleString('en-IN')}. Please reduce cart items or request merchant override.`,
        maxOrderValuePaise: maxOrderValuePaiseNum,
        policy: {
          maxOrderValueInr,
          paymentConfirmationRequired: policy.paymentConfirmationRequired,
          upsellEnabled: policy.upsellEnabled,
        },
      };
    }

    // 4. Human Confirmation Gate Enforcement
    if (policy.paymentConfirmationRequired && !customerConfirmed) {
      return {
        approved: false,
        code: 'CONFIRMATION_REQUIRED',
        message: 'Explicit customer payment confirmation is required by merchant policy.',
        policy: {
          maxOrderValueInr,
          paymentConfirmationRequired: policy.paymentConfirmationRequired,
          upsellEnabled: policy.upsellEnabled,
        },
      };
    }

    // 5. Inventory & Product Active Verification
    for (const item of cart.items) {
      if (!item.product.active) {
        return {
          approved: false,
          code: 'INACTIVE_PRODUCT',
          message: `Product '${item.product.name}' is no longer active in the catalog.`,
        };
      }

      if (item.product.stock < item.quantity) {
        return {
          approved: false,
          code: 'OUT_OF_STOCK',
          message: `Product '${item.product.name}' has insufficient stock (Requested: ${item.quantity}, Available: ${item.product.stock}).`,
        };
      }
    }

    return {
      approved: true,
      policy: {
        maxOrderValueInr,
        paymentConfirmationRequired: policy.paymentConfirmationRequired,
        upsellEnabled: policy.upsellEnabled,
      },
    };
  }
}
