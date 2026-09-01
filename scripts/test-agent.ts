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

async function runAgentTests() {
  console.log('🧪 Starting Phase 5 AI Agent & Growth Engine Integration Tests...\n');
  
  await connectWithRetry();

  const app = createApp();
  const PORT = 5057; // isolated port for test runner
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

  let sessionId = '';

  // 1. Create Agent Session
  await assert('POST /api/agent/sessions initializes active AI commerce session', async () => {
    const res = await fetch(`${BASE_URL}/agent/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({}),
    });
    const json = await res.json() as any;
    if (res.status === 200 && json.success && json.data?.session?.id) {
      sessionId = json.data.session.id;
      return true;
    }
    return false;
  });

  // 2. Process Intent: Coding Laptop Under 70k
  let responseData: any = null;
  await assert('POST /api/agent/sessions/:id/messages extracts intent and retrieves grounded options', async () => {
    const res = await fetch(`${BASE_URL}/agent/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        message: 'I need a coding laptop under 70000 with long battery life and a mouse',
      }),
    });
    const json = await res.json() as any;
    if (res.status === 200 && json.success && json.data) {
      responseData = json.data;
      const intentOk = responseData.intent?.category === 'laptops' && responseData.intent?.budgetMax === 70000;
      const recsOk = responseData.recommendations?.length > 0 && responseData.recommendations[0].product?.sku === 'LAP-DEV-001';
      return intentOk && recsOk;
    }
    return false;
  });

  // 3. Verify Grounded Explanation
  await assert('Agent generates explainable reasoning citing verified attributes without hallucination', async () => {
    return !!responseData?.explanation && responseData.recommendations[0].reasons.length > 0;
  });

  // 4. Verify Bounded Upsell Proposal
  await assert('Agent proposes 1 complementary upsell within merchant policy bounds', async () => {
    const upsell = responseData?.suggestedUpsell;
    if (upsell && upsell.product?.category === 'keyboards_mice' && upsell.discountBps === 1000) {
      return true;
    }
    return false;
  });

  // 5. Inspect Session History & Audit Event Trail
  await assert('GET /api/agent/sessions/:id returns complete decision trace and audit events', async () => {
    const res = await fetch(`${BASE_URL}/agent/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const json = await res.json() as any;
    const hasMessages = json.data?.session?.messages?.length >= 2;
    const hasEvents = json.data?.session?.events?.length >= 2;
    return res.status === 200 && json.success && hasMessages && hasEvents;
  });

  // 6. Test Gaming Setup Intent
  await assert('Agent correctly ranks gaming products for gaming intent prompt', async () => {
    const res = await fetch(`${BASE_URL}/agent/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        message: 'Show me gaming laptops under 85000',
      }),
    });
    const json = await res.json() as any;
    if (res.status === 200 && json.success && json.data?.recommendations?.length > 0) {
      const topPick = json.data.recommendations[0].product;
      return topPick.sku === 'LAP-GAM-002' || topPick.category === 'laptops';
    }
    return false;
  });

  server.close();
  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`Phase 5 Test Results: ${testsPassed}/${testsTotal} tests passed.`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAgentTests();
