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

async function runCommerceTests() {
  console.log('🧪 Starting Phase 4 Commerce Core & Cart Integration Tests...\n');
  
  await connectWithRetry();

  const app = createApp();
  const PORT = 5056; // isolated port for test runner
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

  // Login as Customer to obtain JWT
  let customerToken = '';
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@paypilot.ai', password: 'CustomerPass@123' }),
  });
  const loginJson = await loginRes.json() as any;
  customerToken = loginJson.data?.token;

  let sampleLaptop: any = await prisma.product.findFirst({ where: { category: 'laptops' } });
  let sampleMouse: any = await prisma.product.findFirst({ where: { sku: 'ACC-MOU-001' } });

  // 1. List Products
  await assert('GET /api/products returns seeded catalog with pagination', async () => {
    const res = await fetch(`${BASE_URL}/products?limit=20`);
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.items?.length >= 10;
  });

  // 2. Search Products
  await assert('GET /api/products?search=developer searches by keyword', async () => {
    const res = await fetch(`${BASE_URL}/products?search=developer`);
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.items?.length >= 1 && json.data.items[0].sku === 'LAP-DEV-001';
  });

  // 3. Filter by Category
  await assert('GET /api/products?category=monitors filters by category', async () => {
    const res = await fetch(`${BASE_URL}/products?category=monitors`);
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.items?.every((p: any) => p.category === 'monitors');
  });

  // 4. Filter by Max Price (<= ₹50,000)
  await assert('GET /api/products?maxPrice=50000 filters within budget constraint', async () => {
    const res = await fetch(`${BASE_URL}/products?maxPrice=50000`);
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.items?.every((p: any) => p.priceInr <= 50000);
  });

  // 5. List Categories
  await assert('GET /api/products/categories returns active product categories with counts', async () => {
    const res = await fetch(`${BASE_URL}/products/categories`);
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.categories?.length >= 5;
  });

  // 6. Get Product by ID
  await assert('GET /api/products/:id returns detailed verified product', async () => {
    const res = await fetch(`${BASE_URL}/products/${sampleLaptop.id}`);
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.product?.sku === sampleLaptop.sku;
  });

  // 7. Clear & Get Active Cart
  await fetch(`${BASE_URL}/carts`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  await assert('GET /api/carts/active initializes or returns customer active cart', async () => {
    const res = await fetch(`${BASE_URL}/carts/active`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.cart?.status === 'ACTIVE';
  });

  // 8. Add Item to Cart (Laptop)
  let cartItemId = '';
  await assert('POST /api/carts/items adds product with authoritative server-side price', async () => {
    const res = await fetch(`${BASE_URL}/carts/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        productId: sampleLaptop.id,
        quantity: 1,
      }),
    });
    const json = await res.json() as any;
    const addedItem = json.data?.cart?.items?.find((i: any) => i.productId === sampleLaptop.id);
    if (res.status === 200 && json.success && addedItem && Number(json.data.cart.subtotalPaise) === Number(sampleLaptop.pricePaise)) {
      cartItemId = addedItem.id;
      return true;
    }
    return false;
  });

  // 9. Add Complementary Mouse to Cart
  await assert('POST /api/carts/items correctly aggregates multi-item cart totals', async () => {
    const res = await fetch(`${BASE_URL}/carts/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        productId: sampleMouse.id,
        quantity: 1,
      }),
    });
    const json = await res.json() as any;
    const expectedSubtotal = Number(sampleLaptop.pricePaise) + Number(sampleMouse.pricePaise);
    return res.status === 200 && json.success && json.data?.cart?.items?.length === 2 && Number(json.data.cart.subtotalPaise) === Number(expectedSubtotal);
  });

  // 10. Out of stock inventory check rejection
  await assert('POST /api/carts/items rejects excessive quantity with 400 OUT_OF_STOCK', async () => {
    const res = await fetch(`${BASE_URL}/carts/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        productId: sampleLaptop.id,
        quantity: 9999, // exceeds 25 in stock
      }),
    });
    const json = await res.json() as any;
    return res.status === 400 && json.success === false && json.error?.code === 'OUT_OF_STOCK';
  });

  // 11. Update Item Quantity
  await assert('PATCH /api/carts/items/:itemId updates item quantity and recalculates totals', async () => {
    const res = await fetch(`${BASE_URL}/carts/items/${cartItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ quantity: 2 }),
    });
    const json = await res.json() as any;
    const expectedSubtotal = (Number(sampleLaptop.pricePaise) * 2) + Number(sampleMouse.pricePaise);
    return res.status === 200 && json.success && Number(json.data?.cart?.subtotalPaise) === Number(expectedSubtotal);
  });

  // 12. Remove Item from Cart
  await assert('DELETE /api/carts/items/:itemId removes line item', async () => {
    const res = await fetch(`${BASE_URL}/carts/items/${cartItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.cart?.items?.length === 1;
  });

  // 13. Clear Cart
  await assert('DELETE /api/carts empties all items in active cart', async () => {
    const res = await fetch(`${BASE_URL}/carts`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const json = await res.json() as any;
    return res.status === 200 && json.success && json.data?.cart?.items?.length === 0 && Number(json.data.cart.subtotalPaise) === 0;
  });

  server.close();
  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`Phase 4 Test Results: ${testsPassed}/${testsTotal} tests passed.`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCommerceTests();
