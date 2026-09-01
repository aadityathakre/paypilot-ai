import { createApp } from '../apps/api/src/app.js';
import { prisma } from '../apps/api/src/config/db.js';
import { WebhooksService } from '../apps/api/src/modules/webhooks/webhooks.service.js';
import { Server } from 'http';

async function connectWithRetry(retries = 3, delayMs = 1500) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$connect();
      console.log('✅ Database connection ready.\n');
      return;
    } catch (err) {
      console.warn(`⏳ Connection attempt ${i}/${retries} failed. Retrying in ${delayMs}ms...`);
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function runWebhookTests() {
  console.log('🧪 Starting Phase 7 Webhooks & Idempotency Integration Tests...\n');

  await connectWithRetry();

  const app = createApp();
  const PORT = 5059; // isolated port for test runner
  let server: Server;

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => resolve());
  });

  const BASE_URL = `http://localhost:${PORT}/api`;
  let testsPassed = 0;
  let testsTotal = 0;

  async function assert(name: string, fn: () => Promise<boolean>) {
    testsTotal++;
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✅ [PASS] ${name}`);
        testsPassed++;
      } else {
        console.error(`  ❌ [FAIL] ${name}`);
      }
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name} (Exception: ${err})`);
    }
  }

  // Obtain Customer Token
  let customerToken = '';
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@paypilot.ai', password: 'CustomerPass@123' }),
  });
  const loginJson = await loginRes.json() as any;
  customerToken = loginJson.data?.token;

  // Clear cart and prepare clean order
  await fetch(`${BASE_URL}/carts`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  const prodsRes = await fetch(`${BASE_URL}/products?limit=20`);
  const prodsJson = await prodsRes.json() as any;
  const product = prodsJson.data.items.find((p: any) => p.priceInr <= 65000);

  // Add 1 product to cart
  await fetch(`${BASE_URL}/carts/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
  });

  // Create pending order
  const orderRes = await fetch(`${BASE_URL}/checkout/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ customerConfirmed: true }),
  });
  const orderJson = await orderRes.json() as any;
  const { orderId, razorpayOrderId } = orderJson.data;

  // 1. Process Authentic `payment.captured` Webhook
  const webhookEventId = `evt_test_${Date.now()}`;
  const capturedPaymentId = `pay_hook_${Date.now()}`;
  const capturedPayload = {
    entity: 'event',
    account_id: 'acc_test_demo',
    event: 'payment.captured',
    contains: ['payment'],
    id: webhookEventId,
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: capturedPaymentId,
          entity: 'payment',
          amount: product.pricePaise,
          currency: 'INR',
          status: 'captured',
          order_id: razorpayOrderId,
          method: 'upi',
          notes: { orderId },
        },
      },
    },
  };

  const payloadBuffer = Buffer.from(JSON.stringify(capturedPayload));
  const validSignature = WebhooksService.generateTestWebhookSignature(payloadBuffer);

  await assert('POST /api/webhooks/razorpay processes authentic payment.captured webhook with HMAC signature', async () => {
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': validSignature,
      },
      body: JSON.stringify(capturedPayload),
    });
    const json = await res.json() as any;

    // Check DB record
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    return res.status === 200 && json.success && updatedOrder?.status === 'PAID';
  });

  // 2. Test Webhook Idempotency (Duplicate Event Replay)
  await assert('POST /api/webhooks/razorpay handles duplicate event delivery idempotently without errors', async () => {
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': validSignature,
      },
      body: JSON.stringify(capturedPayload),
    });
    const json = await res.json() as any;
    return res.status === 200 && json.success;
  });

  // 3. Forged Webhook Signature Rejection
  await assert('POST /api/webhooks/razorpay rejects tampered webhook signature with 400 error', async () => {
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'fake_tampered_webhook_signature_0000000',
      },
      body: JSON.stringify(capturedPayload),
    });
    const json = await res.json() as any;
    return res.status === 400 && json.success === false && json.error?.code === 'INVALID_WEBHOOK_SIGNATURE';
  });

  // 4. `payment.failed` Webhook Event
  const failedEventId = `evt_fail_${Date.now()}`;
  const failedPaymentId = `pay_fail_${Date.now()}`;
  const failedPayload = {
    entity: 'event',
    event: 'payment.failed',
    id: failedEventId,
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: failedPaymentId,
          entity: 'payment',
          amount: product.pricePaise,
          currency: 'INR',
          status: 'failed',
          order_id: razorpayOrderId,
          error_description: 'Card declined by issuing bank',
          notes: { orderId },
        },
      },
    },
  };
  const failedBuffer = Buffer.from(JSON.stringify(failedPayload));
  const failedSignature = WebhooksService.generateTestWebhookSignature(failedBuffer);

  await assert('POST /api/webhooks/razorpay records payment.failed event and reason in database', async () => {
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': failedSignature,
      },
      body: JSON.stringify(failedPayload),
    });
    const json = await res.json() as any;

    const failedPayment = await prisma.payment.findUnique({ where: { razorpayPaymentId: failedPaymentId } });
    return res.status === 200 && json.success && failedPayment?.status === 'FAILED';
  });

  server.close();
  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`Phase 7 Test Results: ${testsPassed}/${testsTotal} tests passed.`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runWebhookTests();
