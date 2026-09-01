import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  redact: {
    paths: [
      'password',
      'password_hash',
      'req.headers.authorization',
      'headers.authorization',
      'razorpayKeySecret',
      'key_secret',
      'webhook_secret',
      'card',
      'cvv',
      'token',
    ],
    censor: '[REDACTED_SECRET]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
