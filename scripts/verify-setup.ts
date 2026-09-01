import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Running PayPilot AI environment & database validation check...');

  try {
    // 1. Check database connectivity
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    const merchantCount = await prisma.merchant.count();
    const policyCount = await prisma.merchantPolicy.count();

    console.log('✅ Database Connection: ACTIVE');
    console.log(`📊 Verified Records: ${productCount} products, ${userCount} users, ${merchantCount} merchants, ${policyCount} policies.`);

    if (productCount === 0) {
      console.warn('⚠️ Warning: No products found. Please run "npm run db:seed" to populate demo data.');
    } else {
      console.log('✅ Database Seed: VERIFIED');
    }

    console.log('🎉 Setup verification passed successfully!');
  } catch (error) {
    console.error('❌ Setup verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
