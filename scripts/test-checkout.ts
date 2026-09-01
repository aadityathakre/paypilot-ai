import { createApp } from '../apps/api/src/app.js';
import { prisma } from '../apps/api/src/config/db.js';
import { RazorpayService } from '../apps/api/src/integrations/razorpay/razorpay.service.js';
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

async function runCheckoutTests() {
  console.log('🧪 Starting Phase 6 Policy Engine, Checkout & Payment Integration Tests...\n');

  await connectWithRetry();

  const app = createApp();
  const PORT = 5058; // isolated port for test runner
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

  // Clear cart and prepare clean cart items
  await fetch(`${BASE_URL}/carts`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  // Fetch a laptop and mouse
  const prodsRes = await fetch(`${BASE_URL}/products?limit=10`);
  const prodsJson = await prodsRes.json() as any;
  const laptop = prodsJson.data.items.find((p: any) => p.sku === 'LAP-DEV-001');
  const mouse = prodsJson.data.items.find((p: any) => p.sku === 'ACC-MOU-001');

  // Add 1 laptop to cart (₹64,990)
  await fetch(`${BASE_URL}/carts/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ productId: laptop.id, quantity: 1 }),
  });

  // 1. Validate Cart Policy (Within ₹80k Limit)
  await assert('POST /api/checkout/validate approves valid cart under policy ceiling', async () => {
    const res = await fetch(`${BASE_URL}/checkout/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ customerConfirmed: true }),
    });
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.policy?.approved === true;
  });

  // 2. Create Checkout Order
  let checkoutOrderId = '';
  let razorpayOrderId = '';
  await assert('POST /api/checkout/create-order creates pending order and Razorpay order payload', async () => {
    const res = await fetch(`${BASE_URL}/checkout/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ customerConfirmed: true }),
    });
    const json = await res.json() as any;
    if (res.status === 201 && json.success && json.data?.orderId && json.data?.razorpayOrderId) {
      checkoutOrderId = json.data.orderId;
      razorpayOrderId = json.data.razorpayOrderId;
      return true;
    }
    return false;
  });

  // 3. Forged HMAC Signature Rejection
  const fakePaymentId = `pay_tampered_${Date.now()}`;
  await assert('POST /api/payments/verify rejects tampered HMAC signature with 400 error', async () => {
    const res = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId: checkoutOrderId,
        razorpayOrderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: 'forged_invalid_signature_string_00000000000',
      }),
    });
    const json = await res.json() as any;
    return res.status === 400 && json.success === false && json.error?.code === 'INVALID_PAYMENT_SIGNATURE';
  });

  // 4. Valid Cryptographic HMAC Signature Verification
  const validPaymentId = `pay_valid_${Date.now()}`;
  const validSignature = RazorpayService.generateTestSignature(razorpayOrderId, validPaymentId);

  await assert('POST /api/payments/verify verifies authentic HMAC SHA256 signature and transitions order to PAID', async () => {
    const res = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId: checkoutOrderId,
        razorpayOrderId,
        razorpayPaymentId: validPaymentId,
        razorpaySignature: validSignature,
      }),
    });
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.orderStatus === 'PAID' && json.data?.verified === true;
  });

  // 5. Explicit Confirmation Requirement Enforcement
  // Create a new cart item
  await fetch(`${BASE_URL}/carts/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ productId: mouse.id, quantity: 1 }),
  });

  await assert('POST /api/checkout/create-order rejects checkout when customerConfirmed is false', async () => {
    const res = await fetch(`${BASE_URL}/checkout/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ customerConfirmed: false }),
    });
    const json = await res.json() as any;
    return res.status === 400 && json.success === false && json.error?.code === 'CONFIRMATION_REQUIRED';
  });

  // 6. Policy Hard Spending Ceiling Enforcement (Add items > ₹80,000)
  const gamingLaptop = prodsJson.data.items.find((p: any) => p.sku === 'LAP-GAM-002') || prodsJson.data.items.find((p: any) => p.priceInr >= 40000) || prodsJson.data.items[0];
  // Add 2 gaming rigs @ ₹79,990 = ₹159,980 (> ₹80,000 ceiling)
  await fetch(`${BASE_URL}/carts/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ productId: gamingLaptop.id, quantity: 2 }),
  });

  await assert('Policy Engine blocks checkout exceeding ₹80,000 merchant limit with POLICY_LIMIT_EXCEEDED', async () => {
    const res = await fetch(`${BASE_URL}/checkout/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ customerConfirmed: true }),
    });
    const json = await res.json() as any;
    return res.status === 400 && json.success === false && json.error?.code === 'POLICY_LIMIT_EXCEEDED';
  });

  server.close();
  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`Phase 6 Test Results: ${testsPassed}/${testsTotal} tests passed.`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCheckoutTests();
