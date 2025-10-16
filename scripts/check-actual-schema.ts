import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function checkActualSchema() {
  console.log('🔍 CHECKING ACTUAL DATABASE SCHEMA\n');
  console.log('=' .repeat(80));

  try {
    // 1. Check connection
    console.log('\n📡 Testing connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected\n');

    // 2. List all tables
    console.log('📋 TABLES IN DATABASE:');
    const tables = await prisma.$queryRaw<any[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log(`Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.tablename}`));

    // 3. Check specific tables that failed
    console.log('\n\n🔍 CHECKING PROBLEM TABLES:\n');

    // Check tenants table
    console.log('─'.repeat(80));
    console.log('TABLE: tenants');
    console.log('─'.repeat(80));
    try {
      const tenantCols = await prisma.$queryRaw<any[]>`
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
        ORDER BY ordinal_position;
      `;

      console.log('Columns:');
      tenantCols.forEach(col => {
        console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // Get sample data
      const tenants = await prisma.$queryRaw<any[]>`SELECT * FROM tenants LIMIT 1`;
      console.log('\nSample row keys:', Object.keys(tenants[0] || {}));
    } catch (error) {
      console.log('❌ Error:', error);
    }

    // Check portal_users / portalUsers table
    console.log('\n' + '─'.repeat(80));
    console.log('TABLE: portal_users / portalUsers');
    console.log('─'.repeat(80));

    try {
      // Try both naming conventions
      const portalUsersCols = await prisma.$queryRaw<any[]>`
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('portal_users', 'portalUsers')
        ORDER BY ordinal_position;
      `;

      if (portalUsersCols.length > 0) {
        console.log('Columns:');
        portalUsersCols.forEach(col => {
          console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Try to get sample data
        try {
          const users = await prisma.$queryRaw<any[]>`SELECT * FROM portal_users LIMIT 1`;
          console.log('\nSample row keys:', Object.keys(users[0] || {}));
        } catch {
          const users = await prisma.$queryRaw<any[]>`SELECT * FROM "portalUsers" LIMIT 1`;
          console.log('\nSample row keys:', Object.keys(users[0] || {}));
        }
      } else {
        console.log('❌ Table not found');
      }
    } catch (error) {
      console.log('❌ Error:', error);
    }

    // Check products table
    console.log('\n' + '─'.repeat(80));
    console.log('TABLE: products');
    console.log('─'.repeat(80));
    try {
      const productCols = await prisma.$queryRaw<any[]>`
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
        ORDER BY ordinal_position;
      `;

      console.log('Columns:');
      productCols.forEach(col => {
        console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      const products = await prisma.$queryRaw<any[]>`SELECT * FROM products LIMIT 1`;
      console.log('\nSample row keys:', Object.keys(products[0] || {}));
    } catch (error) {
      console.log('❌ Error:', error);
    }

    // Check customers table
    console.log('\n' + '─'.repeat(80));
    console.log('TABLE: customers');
    console.log('─'.repeat(80));
    try {
      const customerCols = await prisma.$queryRaw<any[]>`
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'customers'
        ORDER BY ordinal_position;
      `;

      console.log('Columns:');
      customerCols.forEach(col => {
        console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      const customers = await prisma.$queryRaw<any[]>`SELECT * FROM customers LIMIT 1`;
      console.log('\nSample row keys:', Object.keys(customers[0] || {}));
    } catch (error) {
      console.log('❌ Error:', error);
    }

    // Check roles table for the critical roleType
    console.log('\n' + '─'.repeat(80));
    console.log('TABLE: roles (CRITICAL FOR AUTH)');
    console.log('─'.repeat(80));
    try {
      const roleCols = await prisma.$queryRaw<any[]>`
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'roles'
        ORDER BY ordinal_position;
      `;

      console.log('Columns:');
      roleCols.forEach(col => {
        const enumMarker = col.data_type === 'USER-DEFINED' ? ' ⚠️  ENUM!' : '';
        console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${enumMarker}`);
      });

      const roles = await prisma.$queryRaw<any[]>`SELECT * FROM roles LIMIT 3`;
      console.log('\nSample rows:', roles);
    } catch (error) {
      console.log('❌ Error:', error);
    }

    // Check for ALL enum columns
    console.log('\n\n' + '═'.repeat(80));
    console.log('🔍 ALL ENUM COLUMNS IN DATABASE:');
    console.log('═'.repeat(80));
    const enumCols = await prisma.$queryRaw<any[]>`
      SELECT
        table_name,
        column_name,
        udt_name as enum_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'USER-DEFINED'
      ORDER BY table_name, column_name;
    `;

    if (enumCols.length > 0) {
      console.log(`\n⚠️  Found ${enumCols.length} enum columns that need conversion:\n`);
      enumCols.forEach(col => {
        console.log(`   ${col.table_name.padEnd(30)} ${col.column_name.padEnd(25)} ${col.enum_type}`);
      });
      console.log('\n💡 These must be converted to TEXT for Prisma compatibility!');
    } else {
      console.log('\n✅ No enum columns found - all properly converted to TEXT');
    }

    // Check table counts
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 TABLE ROW COUNTS:');
    console.log('═'.repeat(80));

    const counts = await prisma.$queryRaw<any[]>`
      SELECT
        schemaname,
        tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 20;
    `;

    console.log('');
    counts.forEach(c => {
      console.log(`   ${c.tablename.padEnd(35)} ${c.row_count.toLocaleString().padStart(10)} rows`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Schema audit complete');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualSchema().catch(console.error);
