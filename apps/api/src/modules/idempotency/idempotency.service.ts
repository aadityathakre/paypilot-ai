import crypto from 'crypto';
import { prisma } from '../../config/db.js';

export class IdempotencyService {
  /**
   * Check if an idempotency key was already executed
   */
  static async getRecord(key: string, scope = 'GLOBAL') {
    const record = await prisma.idempotencyRecord.findUnique({
      where: { key: `${scope}:${key}` },
    });

    if (!record) return null;

    if (record.expiresAt && record.expiresAt < new Date()) {
      await prisma.idempotencyRecord.delete({ where: { key: `${scope}:${key}` } }).catch(() => null);
      return null;
    }

    return record;
  }

  /**
   * Record and lock an idempotency key
   */
  static async lockKey(key: string, scope = 'GLOBAL', ttlSeconds = 86400) {
    const fullKey = `${scope}:${key}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
      const record = await prisma.idempotencyRecord.create({
        data: {
          key: fullKey,
          scope,
          expiresAt,
        },
      });
      return { acquired: true, record };
    } catch {
      // Key already exists
      const existing = await this.getRecord(key, scope);
      return { acquired: false, record: existing };
    }
  }

  /**
   * Complete and save response payload for an idempotency key
   */
  static async saveResponse(key: string, scope = 'GLOBAL', responseData: any) {
    const fullKey = `${scope}:${key}`;
    const responseString = JSON.stringify(responseData);
    const responseHash = crypto.createHash('sha256').update(responseString).digest('hex');

    await prisma.idempotencyRecord.update({
      where: { key: fullKey },
      data: {
        response: responseData,
        responseHash,
      },
    }).catch(() => null);
  }
}
