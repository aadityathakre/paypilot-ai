import { prisma, withDbRetry } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';

export class OrdersService {
  /**
   * Get all past orders for authenticated customer
   */
  static async getMyOrders(customerId: string) {
    const orders = await withDbRetry(() =>
      prisma.order.findMany({
        where: { customerId },
        include: {
          items: {
            include: { product: true },
          },
          payments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    return orders.map((ord) => ({
      id: ord.id,
      merchantId: ord.merchantId,
      status: ord.status,
      amountRupees: Number(ord.amountPaise) / 100,
      createdAt: ord.createdAt,
      updatedAt: ord.updatedAt,
      itemCount: ord.items.reduce((acc, i) => acc + i.quantity, 0),
      items: ord.items.map((i) => {
        const unitRupees = Number(i.unitPricePaise) / 100;
        return {
          id: i.id,
          productId: i.productId,
          productName: i.product?.name || 'Product',
          quantity: i.quantity,
          unitPriceRupees: unitRupees,
          subtotalRupees: unitRupees * i.quantity,
        };
      }),
      payment: ord.payments[0]
        ? {
            id: ord.payments[0].id,
            razorpayPaymentId: ord.payments[0].razorpayPaymentId,
            status: ord.payments[0].status,
            method: ord.payments[0].method,
            verifiedAt: ord.payments[0].verifiedAt,
          }
        : null,
    }));
  }

  /**
   * Get detailed single order by ID
   */
  static async getOrderById(customerId: string, orderId: string) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })
    );

    if (!order || order.customerId !== customerId) {
      throw new AppError('Order not found or unauthorized access.', 404, 'ORDER_NOT_FOUND');
    }

    return {
      id: order.id,
      merchantId: order.merchantId,
      status: order.status,
      amountRupees: Number(order.amountPaise) / 100,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((i) => {
        const unitRupees = Number(i.unitPricePaise) / 100;
        return {
          id: i.id,
          productId: i.productId,
          productName: i.product?.name || 'Product',
          quantity: i.quantity,
          unitPriceRupees: unitRupees,
          subtotalRupees: unitRupees * i.quantity,
        };
      }),
      payments: order.payments.map((p) => ({
        id: p.id,
        razorpayPaymentId: p.razorpayPaymentId,
        status: p.status,
        method: p.method,
        verifiedAt: p.verifiedAt,
      })),
    };
  }
}
