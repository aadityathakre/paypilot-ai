import { createApp } from '../apps/api/src/app.js';
import { prisma } from '../apps/api/src/config/db.js';
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

async function runMerchantTests() {
  console.log('🧪 Starting Phase 8 Merchant Dashboard, Analytics & Audit Explorer Tests...\n');

  await connectWithRetry();

  const app = createApp();
  let server: Server;
  let BASE_URL = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      BASE_URL = `http://127.0.0.1:${addr.port}/api`;
      resolve();
    });
  });
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

  // Obtain Merchant Token
  let merchantToken = '';
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'merchant@paypilot.ai', password: 'MerchantPass@123' }),
  });
  const loginJson = await loginRes.json() as any;
  merchantToken = loginJson.data?.token;

  // 1. Test GET /api/merchant/analytics
  await assert('GET /api/merchant/analytics returns live PostgreSQL metrics', async () => {
    const res = await fetch(`${BASE_URL}/merchant/analytics`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const json = await res.json() as any;
    return (
      res.status === 200 &&
      json.success === true &&
      typeof json.data?.overview?.grossRevenueInr === 'number' &&
      typeof json.data?.overview?.conversionRatePercent === 'number' &&
      Array.isArray(json.data?.topRecommendedSkus)
    );
  });

  // 2. Test GET /api/merchant/policy
  await assert('GET /api/merchant/policy returns active merchant guardrails', async () => {
    const res = await fetch(`${BASE_URL}/merchant/policy`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const json = await res.json() as any;
    return (
      res.status === 200 &&
      json.success === true &&
      typeof json.data?.policy?.maxOrderValueInr === 'number' &&
      typeof json.data?.policy?.maxUpsellDiscountPercent === 'number'
    );
  });

  // 3. Test PATCH /api/merchant/policy (Live Ceiling Update)
  await assert('PATCH /api/merchant/policy updates spending ceiling and logs audit event', async () => {
    const patchRes = await fetch(`${BASE_URL}/merchant/policy`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({
        maxOrderValueInr: 95000,
        maxUpsellDiscountPercent: 15,
      }),
    });
    const patchJson = await patchRes.json() as any;

    const auditCheck = await prisma.auditEvent.findFirst({
      where: { eventType: 'POLICY_CONFIG_UPDATED' },
      orderBy: { createdAt: 'desc' },
    });

    return (
      patchRes.status === 200 &&
      patchJson.data?.policy?.maxOrderValueInr === 95000 &&
      patchJson.data?.policy?.maxUpsellDiscountPercent === 15 &&
      auditCheck !== null
    );
  });

  // 4. Test GET /api/merchant/orders
  await assert('GET /api/merchant/orders returns paginated orders with customer info', async () => {
    const res = await fetch(`${BASE_URL}/merchant/orders?limit=10`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const json = await res.json() as any;
    return (
      res.status === 200 &&
      json.success === true &&
      Array.isArray(json.data?.orders) &&
      typeof json.data?.pagination?.total === 'number'
    );
  });

  // 5. Test GET /api/audit/events
  await assert('GET /api/audit/events returns filtered audit trail events with search', async () => {
    const res = await fetch(`${BASE_URL}/audit/events?limit=15`);
    const json = await res.json() as any;
    return (
      res.status === 200 &&
      json.success === true &&
      Array.isArray(json.data?.events) &&
      json.data.events.length > 0
    );
  });

  // Revert policy to default ₹80,000
  await fetch(`${BASE_URL}/merchant/policy`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${merchantToken}`,
    },
    body: JSON.stringify({
      maxOrderValueInr: 80000,
      maxUpsellDiscountPercent: 10,
    }),
  });

  server.close();
  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`Phase 8 Test Results: ${testsPassed}/${testsTotal} tests passed.`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMerchantTests();
