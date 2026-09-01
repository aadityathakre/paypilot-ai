import { prisma } from '../../config/db.js';

export interface AuditQueryOptions {
  merchantId?: string;
  eventType?: string;
  actorType?: string;
  orderId?: string;
  sessionId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Search and filter chronological audit trail events
   */
  static async listEvents(options: AuditQueryOptions) {
    const page = options.page || 1;
    const limit = options.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.merchantId) {
      where.merchantId = options.merchantId;
    }
    if (options.eventType) {
      where.eventType = options.eventType;
    }
    if (options.actorType) {
      where.actorType = options.actorType;
    }
    if (options.orderId) {
      where.orderId = options.orderId;
    }
    if (options.sessionId) {
      where.sessionId = options.sessionId;
    }

    if (options.search) {
      where.OR = [
        { eventType: { contains: options.search, mode: 'insensitive' } },
        { actorType: { contains: options.search, mode: 'insensitive' } },
        { requestId: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      events: events.map((e) => ({
        id: e.id,
        merchantId: e.merchantId,
        customerId: e.customerId,
        orderId: e.orderId,
        sessionId: e.sessionId,
        eventType: e.eventType,
        actorType: e.actorType,
        requestId: e.requestId,
        data: e.data,
        createdAt: e.createdAt,
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
