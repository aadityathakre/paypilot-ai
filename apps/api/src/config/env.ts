import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from root or local workspace
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to current dir

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional().default('postgresql://postgres:password@localhost:5432/paypilot_db?schema=public'),
  JWT_SECRET: z.string().default('paypilot_default_dev_jwt_secret_must_change_in_prod'),
  AI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().optional().default('gemini-3.6-flash'),
  RAZORPAY_KEY_ID: z.string().optional().default('rzp_test_placeholder'),
  RAZORPAY_KEY_SECRET: z.string().optional().default('placeholder_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default('placeholder_webhook_secret'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
