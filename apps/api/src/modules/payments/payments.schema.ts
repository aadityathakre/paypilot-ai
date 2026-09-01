import { z } from 'zod';

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid('Valid local Order ID is required'),
  razorpayOrderId: z.string().min(5, 'Razorpay Order ID is required'),
  razorpayPaymentId: z.string().min(5, 'Razorpay Payment ID is required'),
  razorpaySignature: z.string().min(10, 'Razorpay Signature is required'),
  paymentMethod: z.string().optional().default('upi'),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
