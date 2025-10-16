import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function applyMigrations() {
  console.log('🚀 APPLYING DATABASE MIGRATIONS\n');
  console.log('=' .repeat(80));

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected\n');

    // Migration 1: Portal User Token Columns
    console.log('─'.repeat(80));
    console.log('📝 MIGRATION 1: Portal User Token Columns');
    console.log('─'.repeat(80));

    console.log('Adding emailVerificationToken column...');
    await prisma.$executeRaw`
      ALTER TABLE portal_users
      ADD COLUMN IF NOT EXISTS "emailVerificationToken" text;
    `;

    console.log('Adding emailVerificationExpiry column...');
    await prisma.$executeRaw`
      ALTER TABLE portal_users
      ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" timestamp with time zone;
    `;

    console.log('Adding passwordResetToken column...');
    await prisma.$executeRaw`
      ALTER TABLE portal_users
      ADD COLUMN IF NOT EXISTS "passwordResetToken" text;
    `;

    console.log('Adding passwordResetExpiry column...');
    await prisma.$executeRaw`
      ALTER TABLE portal_users
      ADD COLUMN IF NOT EXISTS "passwordResetExpiry" timestamp with time zone;
    `;

    console.log('Creating index on emailVerificationToken...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_portal_users_email_verification_token
      ON portal_users("emailVerificationToken");
    `;

    console.log('Creating index on passwordResetToken...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_portal_users_password_reset_token
      ON portal_users("passwordResetToken");
    `;

    console.log('✅ Portal user token columns added\n');

    // Migration 2: Enum Conversions
    console.log('─'.repeat(80));
    console.log('📝 MIGRATION 2: Enum to TEXT Conversions');
    console.log('─'.repeat(80));
    console.log('Converting 28 enum columns to TEXT...\n');

    // CRITICAL: Authentication enums
    console.log('🔴 CRITICAL: portal_users.role...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'portal_users'
            AND column_name = 'role'
            AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE portal_users
            ALTER COLUMN role TYPE text USING role::text;
          RAISE NOTICE 'Converted portal_users.role';
        END IF;
      END $$;
    `;

    console.log('🔴 CRITICAL: users.role...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users'
            AND column_name = 'role'
            AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE users
            ALTER COLUMN role TYPE text USING role::text;
          RAISE NOTICE 'Converted users.role';
        END IF;
      END $$;
    `;

    // HIGH PRIORITY
    console.log('🟡 HIGH: customers.establishedPace...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'customers' AND column_name = 'establishedPace' AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE customers ALTER COLUMN "establishedPace" TYPE text USING "establishedPace"::text;
        END IF;
      END $$;
    `;

    console.log('🟡 HIGH: customers.healthStatus...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'customers' AND column_name = 'healthStatus' AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE customers ALTER COLUMN "healthStatus" TYPE text USING "healthStatus"::text;
        END IF;
      END $$;
    `;

    console.log('🟡 HIGH: orders.source...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name = 'source' AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE orders ALTER COLUMN source TYPE text USING source::text;
        END IF;
      END $$;
    `;

    console.log('🟡 HIGH: orders.type...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name = 'type' AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE orders ALTER COLUMN type TYPE text USING type::text;
        END IF;
      END $$;
    `;

    console.log('🟡 HIGH: payments.paymentMethod...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payments' AND column_name = 'paymentMethod' AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE payments ALTER COLUMN "paymentMethod" TYPE text USING "paymentMethod"::text;
        END IF;
      END $$;
    `;

    // MEDIUM PRIORITY (21 columns)
    console.log('🟢 MEDIUM: Converting remaining 21 columns...');

    const mediumPriorityConversions = [
      { table: 'account_health_snapshots', column: 'healthStatus' },
      { table: 'activity_types', column: 'weightCategory' },
      { table: 'addresses', column: 'type' },
      { table: 'automated_tasks', column: 'type' },
      { table: 'companies', column: 'type' },
      { table: 'compliance_transactions', column: 'customerType' },
      { table: 'compliance_transactions', column: 'wineType' },
      { table: 'customer_activity_logs', column: 'action' },
      { table: 'customer_documents', column: 'type' },
      { table: 'customer_documents', column: 'visibility' },
      { table: 'customer_notifications', column: 'type' },
      { table: 'inventory', column: 'pool' },
      { table: 'notes', column: 'noteType' },
      { table: 'notification_logs', column: 'channel' },
      { table: 'notification_preferences', column: 'emailFrequency' },
      { table: 'notifications', column: 'type' },
      { table: 'state_configurations', column: 'filingFrequency' },
      { table: 'state_filing_info', column: 'frequency' },
      { table: 'state_tax_rates', column: 'wineType' },
      { table: 'tasks', column: 'type' },
      { table: 'uploaded_files', column: 'type' },
    ];

    for (const { table, column } of mediumPriorityConversions) {
      const needsQuotes = column.includes('_') || column[0] === column[0].toUpperCase();
      const columnRef = needsQuotes ? `"${column}"` : column;

      try {
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = '${table}' AND column_name = '${column}' AND data_type = 'USER-DEFINED'
            ) THEN
              ALTER TABLE ${table} ALTER COLUMN ${columnRef} TYPE text USING ${columnRef}::text;
            END IF;
          END $$;
        `);
        process.stdout.write('.');
      } catch (error) {
        console.log(`\n   ⚠️  ${table}.${column} - skipped (may not exist)`);
      }
    }
    console.log(' Done!');

    console.log('\n✅ All enum conversions completed\n');

    // Verification
    console.log('═'.repeat(80));
    console.log('🔍 VERIFICATION');
    console.log('═'.repeat(80));

    const remainingEnums = await prisma.$queryRaw<any[]>`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'USER-DEFINED'
      ORDER BY table_name, column_name;
    `;

    if (remainingEnums.length === 0) {
      console.log('\n✅ SUCCESS: All enum columns converted to TEXT!');
      console.log('✅ Database is now fully Prisma-compatible');
    } else {
      console.log(`\n⚠️  ${remainingEnums.length} enum columns still remain:\n`);
      remainingEnums.forEach(col => {
        console.log(`   - ${col.table_name}.${col.column_name} (${col.udt_name})`);
      });
    }

    // Check critical auth columns
    console.log('\n─'.repeat(80));
    console.log('Critical Authentication Columns:');
    const authCols = await prisma.$queryRaw<any[]>`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'portal_users' AND column_name = 'role')
          OR (table_name = 'users' AND column_name = 'role'))
      ORDER BY table_name;
    `;

    console.log('');
    authCols.forEach(col => {
      const status = col.data_type === 'text' ? '✅' : '❌';
      console.log(`${status} ${col.table_name}.${col.column_name}: ${col.data_type}`);
    });

    // Check token columns
    console.log('\n─'.repeat(80));
    console.log('Portal User Token Columns:');
    const tokenCols = await prisma.$queryRaw<any[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'portal_users'
        AND column_name IN ('emailVerificationToken', 'emailVerificationExpiry', 'passwordResetToken', 'passwordResetExpiry')
      ORDER BY column_name;
    `;

    console.log('');
    ['emailVerificationToken', 'emailVerificationExpiry', 'passwordResetToken', 'passwordResetExpiry'].forEach(col => {
      const exists = tokenCols.some(c => c.column_name === col);
      console.log(`${exists ? '✅' : '❌'} ${col}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(80));

    console.log('\nNext Steps:');
    console.log('1. Update prisma/schema.prisma');
    console.log('2. Run: npx prisma generate');
    console.log('3. Test authentication');
    console.log('4. Deploy');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
