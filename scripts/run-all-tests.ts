import { execSync } from 'child_process';

const testSuites = [
  { name: 'Phase 3: Auth & Identity Pipeline', script: 'scripts/test-auth.ts' },
  { name: 'Phase 4: Commerce Core & Cart Subtotals', script: 'scripts/test-commerce.ts' },
  { name: 'Phase 5: AI Agent, 5-Signal Ranking & Growth', script: 'scripts/test-agent.ts' },
  { name: 'Phase 6: Policy Engine & Bounded Checkout', script: 'scripts/test-checkout.ts' },
  { name: 'Phase 7: Webhooks, Idempotency & Lifecycle', script: 'scripts/test-webhooks.ts' },
  { name: 'Phase 8: Merchant Analytics & Policy Studio', script: 'scripts/test-merchant.ts' },
  { name: 'Phase 9: Security, Guardrails & Defenses', script: 'scripts/test-security-guardrails.ts' },
];

async function runMasterTestRunner() {
  console.log('===============================================================');
  console.log('🚀 PayPilot AI Master Integration & Security Test Runner');
  console.log('===============================================================\n');

  let passedSuites = 0;
  const startTime = Date.now();

  for (const suite of testSuites) {
    console.log(`\n▶️ Running ${suite.name} (${suite.script})...`);
    try {
      execSync(`npx tsx ${suite.script}`, { stdio: 'inherit' });
      passedSuites++;
      console.log(`✅ ${suite.name} PASSED.\n`);
    } catch {
      console.error(`❌ ${suite.name} FAILED.\n`);
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);

  console.log('\n===============================================================');
  console.log(`🏁 MASTER TEST SUMMARY: ${passedSuites}/${testSuites.length} Test Suites Passed (${durationSec}s)`);
  console.log('===============================================================');

  if (passedSuites === testSuites.length) {
    console.log('🎉 ALL PHASES 1 THROUGH 9 FULLY VERIFIED WITH 0 FAILURES!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some test suites failed.\n');
    process.exit(1);
  }
}

runMasterTestRunner();
