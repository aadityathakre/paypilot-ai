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

// Graceful disconnection helper
export const disconnectDb = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed cleanly.');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
  }
};
