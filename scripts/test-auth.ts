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

async function runAuthTests() {
  console.log('🧪 Starting Phase 3 Auth & Backend Foundation Integration Tests...\n');
  
  // Warm up DB connection with retry
  await connectWithRetry();

  const app = createApp();
  const PORT = 5055; // isolated port for test runner
  let server: Server;

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => resolve());
  });

  const BASE_URL = `http://localhost:${PORT}/api/auth`;
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

  // 1. Merchant Login
  let merchantToken = '';
  await assert('Merchant login with valid credentials returns JWT token & role claim', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchant@paypilot.ai', password: 'MerchantPass@123' }),
    });
    const json = await res.json() as any;
    if (res.status === 200 && json.success && json.data?.token && json.data?.user?.role === 'MERCHANT') {
      merchantToken = json.data.token;
      return true;
    }
    return false;
  });

  // 2. Customer Login
  let customerToken = '';
  await assert('Customer login with valid credentials returns JWT token', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@paypilot.ai', password: 'CustomerPass@123' }),
    });
    const json = await res.json() as any;
    if (res.status === 200 && json.success && json.data?.token && json.data?.user?.role === 'CUSTOMER') {
      customerToken = json.data.token;
      return true;
    }
    return false;
  });

  // 3. Authenticated Profile (GET /api/auth/me)
  await assert('GET /api/auth/me with Bearer token returns authenticated user profile', async () => {
    const res = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.user?.email === 'merchant@paypilot.ai';
  });

  // 4. Register new user
  const uniqueEmail = `testbuyer_${Date.now()}@paypilot.ai`;
  await assert('POST /api/auth/register creates new account and returns 201 Created', async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Buyer',
        email: uniqueEmail,
        password: 'Password@123',
        role: 'CUSTOMER',
      }),
    });
    const json = await res.json() as any;
    return res.status === 201 && json.success && json.data?.user?.email === uniqueEmail && !!json.data?.token;
  });

  // 5. Duplicate Email Registration rejection
  await assert('POST /api/auth/register rejects duplicate email with 409 EMAIL_EXISTS', async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Buyer',
        email: uniqueEmail,
        password: 'Password@123',
      }),
    });
    const json = await res.json() as any;
    return res.status === 409 && json.success === false && json.error?.code === 'EMAIL_EXISTS';
  });

  // 6. Invalid Password Login rejection
  await assert('POST /api/auth/login rejects wrong password with 401 INVALID_CREDENTIALS', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@paypilot.ai', password: 'WrongPassword999' }),
    });
    const json = await res.json() as any;
    return res.status === 401 && json.success === false && json.error?.code === 'INVALID_CREDENTIALS';
  });

  // 7. Missing Bearer token rejection
  await assert('GET /api/auth/me rejects unauthenticated request with 401 AUTH_REQUIRED', async () => {
    const res = await fetch(`${BASE_URL}/me`);
    const json = await res.json() as any;
    return res.status === 401 && json.success === false && json.error?.code === 'AUTH_REQUIRED';
  });

  server.close();
  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`Phase 3 Test Results: ${testsPassed}/${testsTotal} tests passed.`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAuthTests();
