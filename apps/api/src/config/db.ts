import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from './logger.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  operationName = 'database operation',
  retries = 3
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error: any) {
      const message = String(error ?? '');
      const isTransientConnectionFailure =
        error?.code === 'P1017' ||
        error?.code === 'P2024' ||
        /server has closed the connection|connection.*closed|ECONNRESET|connection reset|Can't reach database server/i.test(message);

      if (!isTransientConnectionFailure || attempt === retries) {
        throw error;
      }

      attempt += 1;
      logger.warn({ operationName, attempt, errorCode: error?.code }, 'Transient DB failure detected, retrying');
      try {
        await prisma.$connect();
      } catch {
        // Ignore retry connection failures and continue with the next loop.
      }
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }

  throw new Error(`Database retry loop exhausted for ${operationName}`);
}

// Graceful disconnection helper
export const disconnectDb = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed cleanly.');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
  }
};
