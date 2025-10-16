/**
 * Database Connection Test Script
 * Tests Prisma connection and basic queries to identify issues
 */

import { prisma } from '../lib/prisma';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Test 2: Check tenant existence
    console.log('2️⃣ Checking tenants...');
    const tenants = await prisma.tenant.findMany({
      select: { id: true, slug: true, name: true },
      take: 5,
    });
    console.log(`✅ Found ${tenants.length} tenants:`);
    tenants.forEach(t => console.log(`   - ${t.slug} (${t.name})`));
    console.log();

    // Test 3: Check portal users
    console.log('3️⃣ Checking portal users...');
    const users = await prisma.portalUser.findMany({
      select: { id: true, email: true, tenantId: true },
      take: 5,
    });
    console.log(`✅ Found ${users.length} portal users`);
    console.log();

    // Test 4: Test well-crafted tenant specifically
    console.log('4️⃣ Testing well-crafted tenant...');
    const wellCrafted = await prisma.tenant.findUnique({
      where: { slug: 'well-crafted' },
      include: {
        _count: {
          select: {
            portalUsers: true,
            products: true,
            customers: true,
          },
        },
      },
    });

    if (wellCrafted) {
      console.log('✅ well-crafted tenant found:');
      console.log(`   - Portal Users: ${wellCrafted._count.portalUsers}`);
      console.log(`   - Products: ${wellCrafted._count.products}`);
      console.log(`   - Customers: ${wellCrafted._count.customers}`);
    } else {
      console.log('⚠️  well-crafted tenant not found');
    }
    console.log();

    // Test 5: Test insights queries individually
    console.log('5️⃣ Testing insights queries...');

    const testTenantId = wellCrafted?.id;
    if (!testTenantId) {
      console.log('⚠️  Cannot test insights without tenant');
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      const ordersThisMonth = await prisma.order.count({
        where: {
          tenantId: testTenantId,
          orderDate: { gte: startOfMonth },
        },
      });
      console.log(`✅ Orders this month: ${ordersThisMonth}`);
    } catch (error: any) {
      console.log(`❌ Orders query failed: ${error.message}`);
    }

    try {
      const totalCustomers = await prisma.customer.count({
        where: { tenantId: testTenantId },
      });
      console.log(`✅ Total customers: ${totalCustomers}`);
    } catch (error: any) {
      console.log(`❌ Customer query failed: ${error.message}`);
    }

    try {
      const totalOrders = await prisma.order.count({
        where: { tenantId: testTenantId },
      });
      console.log(`✅ Total orders: ${totalOrders}`);
    } catch (error: any) {
      console.log(`❌ Order count failed: ${error.message}`);
    }

    console.log();
    console.log('✅ Database connection test complete!');
  } catch (error: any) {
    console.error('❌ Database connection test failed:');
    console.error(error.message);
    if (error.code) console.error(`Error code: ${error.code}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
