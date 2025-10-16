import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

interface AuditResult {
  section: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

async function auditDatabase() {
  const results: AuditResult[] = [];

  console.log('🔍 Starting Comprehensive Database Audit\n');
  console.log('=' .repeat(80));

  try {
    // 1. Connection Test
    console.log('\n📡 1. Testing Database Connection...');
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.push({
        section: 'Connection',
        status: 'success',
        message: 'Database connection successful',
      });
      console.log('✅ Connected to database');
    } catch (error) {
      results.push({
        section: 'Connection',
        status: 'error',
        message: `Failed to connect: ${error}`,
      });
      console.error('❌ Connection failed:', error);
      return results;
    }

    // 2. Tenant Verification
    console.log('\n🏢 2. Verifying Tenants...');
    try {
      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          status: true,
          createdAt: true,
        },
      });

      results.push({
        section: 'Tenants',
        status: tenants.length > 0 ? 'success' : 'warning',
        message: `Found ${tenants.length} tenant(s)`,
        data: tenants,
      });

      console.log(`✅ Found ${tenants.length} tenant(s):`);
      tenants.forEach(t => {
        console.log(`   - ${t.name} (${t.slug || t.domain || 'n/a'}) - ${t.status}`);
      });
    } catch (error) {
      results.push({
        section: 'Tenants',
        status: 'error',
        message: `Failed to query tenants: ${error}`,
      });
      console.error('❌ Tenant query failed:', error);
    }

    // 3. Authentication Tables
    console.log('\n🔐 3. Auditing Authentication System...');

    // Roles
    try {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          roleType: true,
          tenantId: true,
        },
      });

      const roleTypes = [...new Set(roles.map(r => r.roleType))];

      results.push({
        section: 'Roles',
        status: 'success',
        message: `Found ${roles.length} roles with ${roleTypes.length} role types`,
        data: { roles, roleTypes },
      });

      console.log(`✅ Roles: ${roles.length}`);
      console.log(`   Role Types: ${roleTypes.join(', ')}`);
    } catch (error) {
      results.push({
        section: 'Roles',
        status: 'error',
        message: `Failed to query roles: ${error}`,
      });
      console.error('❌ Role query failed:', error);
    }

    // Portal Users
    try {
      const portalUsers = await prisma.portalUser.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          tenantId: true,
          status: true,
          emailVerified: true,
          createdAt: true,
        },
        take: 10,
      });

      results.push({
        section: 'Portal Users',
        status: 'success',
        message: `Found ${portalUsers.length} portal users`,
        data: portalUsers,
      });

      console.log(`✅ Portal Users: ${portalUsers.length}`);
    } catch (error) {
      results.push({
        section: 'Portal Users',
        status: 'error',
        message: `Failed to query portal users: ${error}`,
      });
      console.error('❌ Portal users query failed:', error);
    }

    // 4. Core Business Data
    console.log('\n📊 4. Auditing Core Business Data...');

    // Products
    try {
      const productCount = await prisma.product.count();
      const sampleProducts = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          alcoholType: true,
          active: true,
        },
        take: 5,
      });

      const alcoholTypes = [...new Set(sampleProducts.map(p => p.alcoholType).filter(Boolean))];

      results.push({
        section: 'Products',
        status: 'success',
        message: `Found ${productCount} products`,
        data: { count: productCount, alcoholTypes, sample: sampleProducts },
      });

      console.log(`✅ Products: ${productCount}`);
      console.log(`   Alcohol Types: ${alcoholTypes.join(', ')}`);
    } catch (error) {
      results.push({
        section: 'Products',
        status: 'error',
        message: `Failed to query products: ${error}`,
      });
      console.error('❌ Product query failed:', error);
    }

    // Customers
    try {
      const customerCount = await prisma.customer.count();
      const sampleCustomers = await prisma.customer.findMany({
        select: {
          id: true,
          tenantId: true,
          accountNumber: true,
          company: {
            select: {
              name: true,
              active: true
            }
          }
        },
        take: 5,
      });

      results.push({
        section: 'Customers',
        status: 'success',
        message: `Found ${customerCount} customers`,
        data: { count: customerCount, sample: sampleCustomers },
      });

      console.log(`✅ Customers: ${customerCount}`);
    } catch (error) {
      results.push({
        section: 'Customers',
        status: 'error',
        message: `Failed to query customers: ${error}`,
      });
      console.error('❌ Customer query failed:', error);
    }

    // Orders
    try {
      const orderCount = await prisma.order.count();
      const recentOrders = await prisma.order.findMany({
        select: {
          id: true,
          orderDate: true,
          totalAmount: true,
          tenantId: true,
        },
        orderBy: { orderDate: 'desc' },
        take: 5,
      });

      results.push({
        section: 'Orders',
        status: 'success',
        message: `Found ${orderCount} orders`,
        data: { count: orderCount, recent: recentOrders },
      });

      console.log(`✅ Orders: ${orderCount}`);
      if (recentOrders.length > 0) {
        console.log(`   Most recent: ${recentOrders[0].orderDate.toISOString().split('T')[0]}`);
      }
    } catch (error) {
      results.push({
        section: 'Orders',
        status: 'error',
        message: `Failed to query orders: ${error}`,
      });
      console.error('❌ Order query failed:', error);
    }

    // 5. Database Schema Validation
    console.log('\n📋 5. Checking Schema Configuration...');

    try {
      // Check for enum columns that should be text
      const enumCheck = await prisma.$queryRaw<any[]>`
        SELECT
          table_name,
          column_name,
          data_type,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'USER-DEFINED'
        ORDER BY table_name, column_name;
      `;

      if (enumCheck.length > 0) {
        results.push({
          section: 'Schema - Enum Columns',
          status: 'warning',
          message: `Found ${enumCheck.length} enum columns (should be text for Prisma)`,
          data: enumCheck,
        });

        console.log(`⚠️  Found ${enumCheck.length} PostgreSQL enum columns:`);
        enumCheck.forEach(col => {
          console.log(`   - ${col.table_name}.${col.column_name} (${col.udt_name})`);
        });
        console.log('\n   💡 These should be converted to TEXT for Prisma compatibility');
      } else {
        results.push({
          section: 'Schema - Enum Columns',
          status: 'success',
          message: 'No enum columns found (all converted to text)',
        });
        console.log('✅ All enum columns properly converted to text');
      }
    } catch (error) {
      results.push({
        section: 'Schema - Enum Columns',
        status: 'error',
        message: `Failed to check enum columns: ${error}`,
      });
      console.error('❌ Enum check failed:', error);
    }

    // 6. Critical Column Verification
    console.log('\n🔍 6. Verifying Critical Columns...');

    try {
      const criticalColumns = await prisma.$queryRaw<any[]>`
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'roles' AND column_name = 'roleType')
            OR (table_name = 'products' AND column_name = 'alcoholType')
            OR (table_name = 'portalUsers' AND column_name IN ('email', 'tenantId', 'roleId'))
            OR (table_name = 'orders' AND column_name IN ('orderDate', 'totalAmount'))
          )
        ORDER BY table_name, column_name;
      `;

      results.push({
        section: 'Critical Columns',
        status: 'success',
        message: `Verified ${criticalColumns.length} critical columns`,
        data: criticalColumns,
      });

      console.log(`✅ Critical columns verified (${criticalColumns.length}):`);
      criticalColumns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL';
        console.log(`   - ${col.table_name}.${col.column_name}: ${col.data_type} (${nullable})`);
      });
    } catch (error) {
      results.push({
        section: 'Critical Columns',
        status: 'error',
        message: `Failed to verify critical columns: ${error}`,
      });
      console.error('❌ Critical column verification failed:', error);
    }

    // 7. Data Integrity Checks
    console.log('\n🔗 7. Checking Data Integrity...');

    try {
      // Check for orphaned records
      const orphanedUsers = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM "portalUsers" pu
        LEFT JOIN tenants t ON pu."tenantId" = t.id
        WHERE t.id IS NULL;
      `;

      const orphanedOrders = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM orders o
        LEFT JOIN tenants t ON o."tenantId" = t.id
        WHERE t.id IS NULL;
      `;

      const orphanedUserCount = Number(orphanedUsers[0]?.count || 0);
      const orphanedOrderCount = Number(orphanedOrders[0]?.count || 0);

      if (orphanedUserCount === 0 && orphanedOrderCount === 0) {
        results.push({
          section: 'Data Integrity',
          status: 'success',
          message: 'No orphaned records found',
        });
        console.log('✅ No orphaned records found');
      } else {
        results.push({
          section: 'Data Integrity',
          status: 'warning',
          message: `Found orphaned records - Users: ${orphanedUserCount}, Orders: ${orphanedOrderCount}`,
          data: { orphanedUsers: orphanedUserCount, orphanedOrders: orphanedOrderCount },
        });
        console.log(`⚠️  Found orphaned records:`);
        console.log(`   - Portal Users: ${orphanedUserCount}`);
        console.log(`   - Orders: ${orphanedOrderCount}`);
      }
    } catch (error) {
      results.push({
        section: 'Data Integrity',
        status: 'error',
        message: `Failed to check data integrity: ${error}`,
      });
      console.error('❌ Data integrity check failed:', error);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUDIT SUMMARY');
    console.log('='.repeat(80));

    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`\n✅ Success: ${successCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (warningCount > 0) {
      console.log('\n⚠️  WARNINGS FOUND:');
      results.filter(r => r.status === 'warning').forEach(r => {
        console.log(`   - ${r.section}: ${r.message}`);
      });
    }

    if (errorCount > 0) {
      console.log('\n❌ ERRORS FOUND:');
      results.filter(r => r.status === 'error').forEach(r => {
        console.log(`   - ${r.section}: ${r.message}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    return results;

  } catch (error) {
    console.error('\n❌ Fatal error during audit:', error);
    results.push({
      section: 'Fatal Error',
      status: 'error',
      message: `Audit failed: ${error}`,
    });
    return results;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the audit
auditDatabase()
  .then(results => {
    const hasErrors = results.some(r => r.status === 'error');
    process.exit(hasErrors ? 1 : 0);
  })
  .catch(error => {
    console.error('Failed to run audit:', error);
    process.exit(1);
  });
