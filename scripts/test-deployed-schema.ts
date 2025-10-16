/**
 * Test if deployed Prisma schema matches database
 * This simulates what Vercel is seeing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testDeployedSchema() {
  console.log('🧪 Testing Prisma schema against database...\n');

  try {
    // Test 1: Simple tenant query
    console.log('1. Testing tenant query...');
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'well-crafted' }
    });
    console.log(`   ✅ Tenant: ${tenant?.name}\n`);

    if (!tenant) {
      console.log('   ❌ No tenant found!');
      return;
    }

    // Test 2: Customer query with company relation
    console.log('2. Testing customer query with company...');
    const customer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id },
      include: {
        company: {
          select: { name: true }
        }
      }
    });
    console.log(`   ✅ Customer: ${customer?.company?.name}\n`);

    // Test 3: Order query (this is where it's failing)
    console.log('3. Testing order count...');
    const orderCount = await prisma.order.count({
      where: { tenantId: tenant.id }
    });
    console.log(`   ✅ Orders: ${orderCount}\n`);

    // Test 4: OrderLine query (the problem child)
    console.log('4. Testing orderLine query...');
    const orderLine = await prisma.orderLine.findFirst({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        quantity: true,
        cases: true,
        unitPrice: true,
        netPrice: true
      }
    });
    console.log(`   ✅ OrderLine: ${orderLine?.id}`);
    console.log(`      quantity: ${orderLine?.quantity}`);
    console.log(`      netPrice: ${orderLine?.netPrice}\n`);

    // Test 5: Full insights query simulation
    console.log('5. Testing insights query simulation...');
    const orders = await prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        orderDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        lines: {
          select: {
            netPrice: true,
            quantity: true
          }
        }
      },
      take: 5
    });
    console.log(`   ✅ Recent orders: ${orders.length}`);
    orders.forEach(o => {
      const total = o.lines.reduce((sum, l) => sum + Number(l.netPrice || 0), 0);
      console.log(`      Order ${o.orderNumber}: $${total.toFixed(2)}`);
    });

    console.log('\n✅ ALL TESTS PASSED - Schema is correct!\n');

  } catch (error) {
    console.error('\n❌ SCHEMA ERROR:', error);
    if (error instanceof Error) {
      console.error('\nError message:', error.message);
      console.error('\nThis is likely the same error Vercel is seeing.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDeployedSchema();
