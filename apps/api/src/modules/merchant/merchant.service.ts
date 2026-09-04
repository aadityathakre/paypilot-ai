import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';

export class MerchantService {
  /**
   * Resolve primary merchant for merchant user or fallback to demo merchant
   */
  static async resolveMerchant(userId?: string) {
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { merchants: true },
      });
      if (user?.merchants && user.merchants.length > 0) {
        return user.merchants[0];
      }
    }

    // Fallback to primary seeded merchant
    const merchant = await prisma.merchant.findFirst({
      include: { policy: true },
    });

    if (!merchant) {
      throw new AppError('No merchant found.', 500, 'MERCHANT_NOT_CONFIGURED');
    }

    return merchant;
  }

  /**
   * Calculate live aggregated analytics directly from PostgreSQL
   */
  static async getAnalytics(merchantId: string) {
    // 1. Fetch Orders Metrics
    const orders = await prisma.order.findMany({
      where: { merchantId },
      include: { items: { include: { product: true } }, payments: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrdersCount = orders.length;
    const paidOrders = orders.filter((o) => o.status === OrderStatus.PAID);
    const failedOrders = orders.filter((o) => o.status === OrderStatus.FAILED);
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING_PAYMENT);

    const totalRevenuePaise = paidOrders.reduce((sum, o) => sum + Number(o.amountPaise), 0);
    const grossRevenueInr = totalRevenuePaise / 100;
    const paidOrdersCount = paidOrders.length;

    const conversionRatePercent = totalOrdersCount > 0
      ? Math.round((paidOrdersCount / totalOrdersCount) * 100 * 10) / 10
      : 0;

    const aovInr = paidOrdersCount > 0
      ? Math.round(grossRevenueInr / paidOrdersCount)
      : 0;

    // 2. Calculate Product Performance (Most Buying & Least Buying Products)
    const productSalesMap: Record<string, { product: any; unitsSold: number; totalRevenueInr: number }> = {};

    paidOrders.forEach((o) => {
      o.items.forEach((item) => {
        const pId = item.productId;
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = {
            product: {
              id: item.product.id,
              sku: item.product.sku,
              name: item.product.name,
              category: item.product.category,
              priceInr: Number(item.product.pricePaise) / 100,
              stock: item.product.stock,
            },
            unitsSold: 0,
            totalRevenueInr: 0,
          };
        }
        productSalesMap[pId].unitsSold += item.quantity;
        productSalesMap[pId].totalRevenueInr += (Number(item.unitPricePaise) * item.quantity) / 100;
      });
    });

    const productSalesList = Object.values(productSalesMap);
    
    // Top-selling (Most Buying) Products
    const topSellingProducts = [...productSalesList]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    // Fetch all active products for low stock & slow moving calculation for this specific merchant
    const allMerchantProducts = await prisma.product.findMany({
      where: { merchantId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    // Low stock products (< 10 units)
    const lowStockProducts = allMerchantProducts
      .filter((p) => p.stock <= 10)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        stock: p.stock,
        priceInr: Number(p.pricePaise) / 100,
      }));

    // Slow moving products (0 sales or low units)
    const slowMovingProducts = allMerchantProducts
      .map((p) => {
        const salesData = productSalesMap[p.id];
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          stock: p.stock,
          priceInr: Number(p.pricePaise) / 100,
          unitsSold: salesData ? salesData.unitsSold : 0,
          revenueInr: salesData ? salesData.totalRevenueInr : 0,
        };
      })
      .sort((a, b) => a.unitsSold - b.unitsSold)
      .slice(0, 5);

    // Merchant Wallet Financials
    const platformFeeRate = 0.02; // 2% MDR fee
    const platformFeeInr = Math.round(grossRevenueInr * platformFeeRate);
    const netSettledInr = grossRevenueInr - platformFeeInr;

    // 3. Fetch Agent Sessions & Recommendations Metrics
    const agentSessions = await prisma.agentSession.findMany({
      where: { merchantId },
      include: { events: true },
    });
    const agentSessionsCount = agentSessions.length;

    // 4. Fetch Audit Events for Conversion & Policy Metrics
    const auditEvents = await prisma.auditEvent.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    const recommendationEvents = auditEvents.filter((e) => e.eventType === 'RECOMMENDATIONS_GENERATED');
    const upsellProposedEvents = auditEvents.filter((e) => e.eventType === 'UPSELL_PROPOSED');
    const policyBlockedEvents = auditEvents.filter((e) => e.eventType === 'POLICY_BLOCKED');
    const policyApprovedEvents = auditEvents.filter((e) => e.eventType === 'POLICY_APPROVED');

    // Calculate Top Recommended SKUs from Audit Trail
    const skuCounts: Record<string, number> = {};
    recommendationEvents.forEach((e) => {
      const topSku = (e.data as any)?.topProductSku;
      if (topSku) {
        skuCounts[topSku] = (skuCounts[topSku] || 0) + 1;
      }
    });

    const topRecommendedSkus = Object.entries(skuCounts)
      .map(([sku, count]) => ({ sku, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate Upsell Take Rate
    const upsellsProposedCount = upsellProposedEvents.length;
    const upsellOrders = paidOrders.filter((o) => o.items.length > 1);
    const upsellAttachRatePercent = upsellsProposedCount > 0
      ? Math.round((upsellOrders.length / upsellsProposedCount) * 100 * 10) / 10
      : Math.round((upsellOrders.length / (paidOrdersCount || 1)) * 100 * 10) / 10;

    return {
      overview: {
        grossRevenueInr,
        grossRevenuePaise: totalRevenuePaise,
        platformFeeInr,
        netSettledInr,
        totalOrdersCount,
        paidOrdersCount,
        pendingOrdersCount: pendingOrders.length,
        failedOrdersCount: failedOrders.length,
        conversionRatePercent,
        averageOrderValueInr: aovInr,
        agentSessionsCount,
        recommendationsGeneratedCount: recommendationEvents.length,
        upsellsProposedCount,
        upsellAttachRatePercent,
        policyBlockedCount: policyBlockedEvents.length,
        policyApprovedCount: policyApprovedEvents.length,
      },
      productAnalytics: {
        topSellingProducts,
        slowMovingProducts,
        lowStockProducts,
      },
      wallet: {
        totalRevenueInr: grossRevenueInr,
        platformFeeInr,
        netSettledInr,
        availablePayoutInr: netSettledInr,
        payoutStatus: 'READY_FOR_SETTLEMENT',
        settlementAccount: 'HDFC Bank **** 9821 (IFSC: HDFC0001234)',
      },
      topRecommendedSkus,
      recentOrders: orders.slice(0, 8).map((o) => ({
        id: o.id,
        receipt: o.receipt,
        customerName: o.customer.name,
        customerEmail: o.customer.email,
        amountInr: Number(o.amountPaise) / 100,
        status: o.status,
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          unitPriceInr: Number(i.unitPricePaise) / 100,
        })),
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Get active merchant policy
   */
  static async getPolicy(merchantId: string) {
    let policy = await prisma.merchantPolicy.findUnique({
      where: { merchantId },
    });

    if (!policy) {
      policy = await prisma.merchantPolicy.create({
        data: {
          merchantId,
          maxOrderValuePaise: BigInt(8000000), // ₹80,000
          maxUpsellDiscountBps: 1000,          // 10%
          upsellEnabled: true,
          paymentConfirmationRequired: true,
          allowedCategories: ['laptops', 'monitors', 'keyboards_mice', 'audio_video', 'accessories'],
          allowedAgentActions: ['SEARCH_CATALOG', 'RECOMMEND_PRODUCT', 'PROPOSE_UPSELL', 'CREATE_ORDER'],
        },
      });
    }

    return {
      id: policy.id,
      merchantId: policy.merchantId,
      maxOrderValueInr: Number(policy.maxOrderValuePaise) / 100,
      maxOrderValuePaise: Number(policy.maxOrderValuePaise),
      maxUpsellDiscountBps: policy.maxUpsellDiscountBps,
      maxUpsellDiscountPercent: policy.maxUpsellDiscountBps / 100,
      upsellEnabled: policy.upsellEnabled,
      paymentConfirmationRequired: policy.paymentConfirmationRequired,
      allowedCategories: policy.allowedCategories,
      allowedAgentActions: policy.allowedAgentActions,
      updatedAt: policy.updatedAt,
    };
  }

  /**
   * Update merchant policy guardrails
   */
  static async updatePolicy(
    merchantId: string,
    updates: {
      maxOrderValueInr?: number;
      maxUpsellDiscountPercent?: number;
      upsellEnabled?: boolean;
      paymentConfirmationRequired?: boolean;
      allowedCategories?: string[];
    },
    actorUserId = 'usr_merchant'
  ) {
    const dataToUpdate: any = {};

    if (updates.maxOrderValueInr !== undefined) {
      dataToUpdate.maxOrderValuePaise = BigInt(Math.round(updates.maxOrderValueInr * 100));
    }
    if (updates.maxUpsellDiscountPercent !== undefined) {
      dataToUpdate.maxUpsellDiscountBps = Math.round(updates.maxUpsellDiscountPercent * 100);
    }
    if (updates.upsellEnabled !== undefined) {
      dataToUpdate.upsellEnabled = updates.upsellEnabled;
    }
    if (updates.paymentConfirmationRequired !== undefined) {
      dataToUpdate.paymentConfirmationRequired = updates.paymentConfirmationRequired;
    }
    if (updates.allowedCategories !== undefined) {
      dataToUpdate.allowedCategories = updates.allowedCategories;
    }

    const updated = await prisma.merchantPolicy.upsert({
      where: { merchantId },
      update: dataToUpdate,
      create: {
        merchantId,
        maxOrderValuePaise: dataToUpdate.maxOrderValuePaise || BigInt(8000000),
        maxUpsellDiscountBps: dataToUpdate.maxUpsellDiscountBps || 1000,
        upsellEnabled: dataToUpdate.upsellEnabled ?? true,
        paymentConfirmationRequired: dataToUpdate.paymentConfirmationRequired ?? true,
        allowedCategories: dataToUpdate.allowedCategories || ['laptops', 'monitors', 'keyboards_mice', 'audio_video', 'accessories'],
        allowedAgentActions: ['SEARCH_CATALOG', 'RECOMMEND_PRODUCT', 'PROPOSE_UPSELL', 'CREATE_ORDER'],
      },
    });

    // Log policy change in audit trail
    await prisma.auditEvent.create({
      data: {
        merchantId,
        eventType: 'POLICY_CONFIG_UPDATED',
        actorType: 'MERCHANT',
        data: {
          actorUserId,
          updatedFields: updates,
          newPolicy: {
            maxOrderValueInr: Number(updated.maxOrderValuePaise) / 100,
            maxUpsellDiscountPercent: updated.maxUpsellDiscountBps / 100,
            upsellEnabled: updated.upsellEnabled,
            paymentConfirmationRequired: updated.paymentConfirmationRequired,
          },
        },
      },
    });

    return {
      id: updated.id,
      merchantId: updated.merchantId,
      maxOrderValueInr: Number(updated.maxOrderValuePaise) / 100,
      maxOrderValuePaise: Number(updated.maxOrderValuePaise),
      maxUpsellDiscountBps: updated.maxUpsellDiscountBps,
      maxUpsellDiscountPercent: updated.maxUpsellDiscountBps / 100,
      upsellEnabled: updated.upsellEnabled,
      paymentConfirmationRequired: updated.paymentConfirmationRequired,
      allowedCategories: updated.allowedCategories,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Fetch all orders for merchant with filtering and pagination
   */
  static async getOrders(merchantId: string, options: { page?: number; limit?: number; status?: OrderStatus }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { merchantId };
    if (options.status) {
      where.status = options.status;
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          items: { include: { product: true } },
          payments: true,
        },
      }),
    ]);

    return {
      orders: orders.map((o) => ({
        id: o.id,
        receipt: o.receipt,
        razorpayOrderId: o.razorpayOrderId,
        amountInr: Number(o.amountPaise) / 100,
        currency: o.currency,
        status: o.status,
        customer: o.customer,
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.product.name,
          sku: i.product.sku,
          quantity: i.quantity,
          unitPriceInr: Number(i.unitPricePaise) / 100,
          totalPriceInr: (Number(i.unitPricePaise) * i.quantity) / 100,
        })),
        payments: o.payments.map((p) => ({
          id: p.id,
          razorpayPaymentId: p.razorpayPaymentId,
          status: p.status,
          method: p.method,
          verifiedAt: p.verifiedAt,
        })),
        createdAt: o.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
