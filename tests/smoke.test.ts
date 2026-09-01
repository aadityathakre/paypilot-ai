// PayPilot AI — Smoke Test Suite

async function runSmokeTests() {
  console.log('🧪 Starting Smoke Tests...');
  let failed = false;

  // Test 1: Health endpoint
  try {
    const res = await fetch('http://localhost:5000/health');
    const json = await res.json() as { success: boolean; data?: { status: string } };
    if (res.status === 200 && json.success && json.data?.status === 'healthy') {
      console.log('  ✅ [PASS] GET /health endpoint returns 200 and healthy status');
    } else {
      console.error('  ❌ [FAIL] GET /health returned unexpected payload:', json);
      failed = true;
    }
  } catch (err) {
    console.error('  ❌ [FAIL] Could not connect to API server at http://localhost:5000/health. Ensure backend is running.');
    failed = true;
  }

  // Test 2: 404 handler
  try {
    const res = await fetch('http://localhost:5000/api/unknown-smoke-test-route');
    const json = await res.json() as { success: boolean; error?: { code: string } };
    if (res.status === 404 && json.success === false && json.error?.code === 'NOT_FOUND') {
      console.log('  ✅ [PASS] 404 Route handler returns standardized error payload');
    } else {
      console.error('  ❌ [FAIL] 404 Route returned unexpected payload:', json);
      failed = true;
    }
  } catch (err) {
    console.error('  ❌ [FAIL] Could not verify 404 handler.');
    failed = true;
  }

  if (failed) {
    console.log('\n❌ Smoke tests failed.');
    process.exit(1);
  } else {
    console.log('\n🎉 All smoke tests passed successfully!');
  }
}

runSmokeTests();
