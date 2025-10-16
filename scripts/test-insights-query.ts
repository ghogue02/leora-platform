/**
 * Test Insights API Database Queries
 * Run with: npx tsx scripts/test-insights-query.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testInsightsQueries() {
  console.log('🔍 Testing Insights API Database Queries...\n');

  try {
    // Test 1: Check if tenants exist
    console.log('1️⃣ Checking tenants...');
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
      },
    });
    console.log(`   ✅ Found ${tenants.length} tenant(s):`);
    tenants.forEach((t) => {
      console.log(`      - ${t.name} (${t.slug}) [${t.status}]`);
    });

    if (tenants.length === 0) {
      console.error('   ❌ ERROR: No tenants found! Create a tenant first.');
      return;
    }

    const tenant = tenants[0];
    console.log(`\n   Using tenant: ${tenant.name} (${tenant.id})\n`);

    // Test 2: Check customers
    console.log('2️⃣ Checking customers...');
    const customerCount = await prisma.customer.count({
      where: { tenantId: tenant.id },
    });
    // Note: Customer doesn't have 'status' field - it has creditStatus and company.active
    const activeCustomers = await prisma.customer.count({
      where: {
        tenantId: tenant.id,
        company: {
          active: true
        }
      },
    });
    console.log(`   ✅ Total customers: ${customerCount}`);
    console.log(`   ✅ Active customers: ${activeCustomers}`);

    // Test 3: Check orders
    console.log('\n3️⃣ Checking orders...');
    const totalOrders = await prisma.order.count({
      where: { tenantId: tenant.id },
    });
    const recentOrders = await prisma.order.count({
      where: {
        tenantId: tenant.id,
        orderDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });
    console.log(`   ✅ Total orders: ${totalOrders}`);
    console.log(`   ✅ Orders (last 30 days): ${recentOrders}`);

    // Test 4: Check revenue
    console.log('\n4️⃣ Checking revenue...');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const revenueAgg = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        tenantId: tenant.id,
        status: { notIn: ['CANCELLED', 'DRAFT'] },
        orderDate: { gte: startOfMonth, lte: now },
      },
    });

    const revenue = Number(revenueAgg._sum?.totalAmount || 0);
    console.log(`   ✅ Revenue this month: $${revenue.toFixed(2)}`);

    // Test 5: Check products
    console.log('\n5️⃣ Checking products...');
    const productCount = await prisma.product.count({
      where: { tenantId: tenant.id },
    });
    const activeProducts = await prisma.product.count({
      where: {
        tenantId: tenant.id,
        active: true,
      },
    });
    console.log(`   ✅ Total products: ${productCount}`);
    console.log(`   ✅ Active products: ${activeProducts}`);

    // Test 6: Simulate the actual insights query
    console.log('\n6️⃣ Running full insights query...');
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const excludedStatuses = ['CANCELLED', 'DRAFT'];

    const ordersWhereCurrent = {
      tenantId: tenant.id,
      status: { notIn: excludedStatuses },
      orderDate: { gte: startOfMonth, lte: now },
    };

    const [
      ordersThisMonthCount,
      revenueThisMonthAgg,
      activeAccounts,
      atRiskAccounts,
    ] = await Promise.all([
      prisma.order.count({ where: ordersWhereCurrent }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: ordersWhereCurrent,
      }),
      prisma.customer.count({
        where: {
          tenantId: tenant.id,
          company: {
            active: true
          }
        },
      }),
      prisma.customer.count({
        where: {
          tenantId: tenant.id,
          company: {
            active: true
          },
          orders: {
            none: {
              orderDate: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      }),
    ]);

    const revenueThisMonth = Number(revenueThisMonthAgg._sum?.totalAmount || 0);

    console.log('\n   📊 Insights Summary:');
    console.log(`   - Total Revenue: $${revenueThisMonth.toFixed(2)}`);
    console.log(`   - Active Accounts: ${activeAccounts}`);
    console.log(`   - At Risk Accounts: ${atRiskAccounts}`);
    console.log(`   - Orders This Month: ${ordersThisMonthCount}`);

    console.log('\n✅ All database queries completed successfully!');
    console.log('\n💡 If your dashboard still shows mock data, the issue is likely:');
    console.log('   1. Authentication not working (no JWT token)');
    console.log('   2. Tenant not being passed correctly');
    console.log('   3. API error being caught and falling back to demo data');
    console.log('\n   Check the browser console and server logs for errors.');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testInsightsQueries();
