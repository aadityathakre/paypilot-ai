import { prisma } from '../apps/api/src/config/db.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';

async function runPhase11Tests() {
  console.log('🧪 Starting Phase 11 SaaS Upgrades & Integration Tests...\n');

  try {
    // 1. Customer Login
    const cRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@paypilot.ai', password: 'CustomerPass@123' }),
    });
    const cJson = await cRes.json();
    if (!cRes.ok) throw new Error('Customer login failed');
    const customerToken = cJson.data.token;
    console.log('  ✅ [PASS] Customer authentication token acquired');

    // 2. Fetch Customer Order History
    const ordersRes = await fetch(`${API_BASE}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const ordersJson = await ordersRes.json();
    if (!ordersRes.ok || !ordersJson.success) throw new Error('GET /api/orders/my-orders failed');
    console.log(`  ✅ [PASS] GET /api/orders/my-orders returned ${ordersJson.data.orders.length} order(s)`);

    // 3. Merchant Login
    const mRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchant@paypilot.ai', password: 'MerchantPass@123' }),
    });
    const mJson = await mRes.json();
    if (!mRes.ok) throw new Error('Merchant login failed');
    const merchantToken = mJson.data.token;
    console.log('  ✅ [PASS] Merchant authentication token acquired');

    // 4. Merchant Create Product
    const sku = `SKU-TEST-${Date.now()}`;
    const createRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({
        sku,
        name: 'Test Mechanical Keypad',
        description: 'RGB hot-swappable keypad',
        category: 'keyboards',
        pricePaise: 499900,
        stock: 15,
        active: true,
      }),
    });
    const createJson = await createRes.json();
    if (!createRes.ok || !createJson.success) throw new Error('POST /api/products failed');
    const createdProductId = createJson.data.product.id;
    console.log(`  ✅ [PASS] POST /api/products created product ${createdProductId} (SKU: ${sku})`);

    // 5. Merchant Delete Product
    const delRes = await fetch(`${API_BASE}/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const delJson = await delRes.json();
    if (!delRes.ok || !delJson.success) throw new Error('DELETE /api/products/:id failed');
    console.log('  ✅ [PASS] DELETE /api/products/:id successfully soft-deleted product');

    // 6. Forgot Password Flow
    const forgotRes = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@paypilot.ai' }),
    });
    const forgotJson = await forgotRes.json();
    if (!forgotRes.ok || !forgotJson.success) throw new Error('POST /api/auth/forgot-password failed');
    console.log('  ✅ [PASS] POST /api/auth/forgot-password dispatched email token');

    console.log('\n========================================');
    console.log('Phase 11 Test Results: 6/6 tests passed.');
    console.log('========================================\n');
  } catch (error: any) {
    console.error('❌ Phase 11 Test Failure:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase11Tests();
