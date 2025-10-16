// Test Prisma client connectivity
import { PrismaClient } from '@prisma/client';

// Use pooled connection (DIRECT_URL has DNS issues)
// Keep DATABASE_URL as is from .env.local

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('Testing Prisma connection...\n');

    // Test 1: Count tenants
    console.log('1. Counting tenants...');
    const tenantCount = await prisma.tenant.count();
    console.log(`✓ Found ${tenantCount} tenant(s)\n`);

    // Test 2: Count customers
    console.log('2. Counting customers...');
    const customerCount = await prisma.customer.count();
    console.log(`✓ Found ${customerCount} customers\n`);

    // Test 3: Count products
    console.log('3. Counting products...');
    const productCount = await prisma.product.count();
    console.log(`✓ Found ${productCount} products\n`);

    // Test 4: Count orders
    console.log('4. Counting orders...');
    const orderCount = await prisma.order.count();
    console.log(`✓ Found ${orderCount} orders\n`);

    // Test 5: Fetch first tenant
    console.log('5. Fetching first tenant...');
    const tenant = await prisma.tenant.findFirst();
    console.log(`✓ Tenant: ${tenant?.name} (${tenant?.slug})\n`);

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
