import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function applyMigrations() {
  console.log('🚀 APPLYING DATABASE MIGRATIONS\n');
  console.log('=' .repeat(80));

  try {
    // Test connection first
    console.log('📡 Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to database\n');

    // Migration 1: Portal User Token Columns
    console.log('─'.repeat(80));
    console.log('📝 MIGRATION 1: Portal User Token Columns');
    console.log('─'.repeat(80));

    const tokenMigrationPath = path.join(
      process.cwd(),
      'prisma/migrations/add-portal-user-token-columns.sql'
    );

    if (fs.existsSync(tokenMigrationPath)) {
      console.log('Reading migration file...');
      const tokenSQL = fs.readFileSync(tokenMigrationPath, 'utf8');

      console.log('Executing migration...\n');

      // Execute the migration
      await prisma.$executeRawUnsafe(tokenSQL);

      console.log('✅ Portal user token columns added successfully\n');
    } else {
      console.log('⚠️  Token migration file not found, skipping...\n');
    }

    // Migration 2: Complete Enum Conversion
    console.log('─'.repeat(80));
    console.log('📝 MIGRATION 2: Complete Enum Conversion (28 columns)');
    console.log('─'.repeat(80));
    console.log('This will convert all PostgreSQL enums to TEXT...\n');

    const enumMigrationPath = path.join(
      process.cwd(),
      'prisma/migrations/FINAL-COMPLETE-ENUM-CONVERSION.sql'
    );

    if (fs.existsSync(enumMigrationPath)) {
      console.log('Reading migration file...');
      const enumSQL = fs.readFileSync(enumMigrationPath, 'utf8');

      console.log('Executing migration (this may take 30-60 seconds)...\n');

      // Execute the migration
      await prisma.$executeRawUnsafe(enumSQL);

      console.log('\n✅ Enum conversion completed successfully\n');
    } else {
      console.log('❌ Enum migration file not found!\n');
      process.exit(1);
    }

    // Verification
    console.log('═'.repeat(80));
    console.log('🔍 VERIFICATION');
    console.log('═'.repeat(80));

    // Check for remaining enums
    const remainingEnums = await prisma.$queryRaw<any[]>`
      SELECT
        table_name,
        column_name,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'USER-DEFINED'
      ORDER BY table_name, column_name;
    `;

    if (remainingEnums.length === 0) {
      console.log('\n✅ SUCCESS: All enum columns converted to TEXT!');
      console.log('✅ Database is now fully Prisma-compatible');
    } else {
      console.log(`\n⚠️  WARNING: ${remainingEnums.length} enum columns still remain:\n`);
      remainingEnums.forEach(col => {
        console.log(`   - ${col.table_name}.${col.column_name} (${col.udt_name})`);
      });
    }

    // Check critical columns
    console.log('\n─'.repeat(80));
    console.log('Checking critical authentication columns...');

    const criticalColumns = await prisma.$queryRaw<any[]>`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'portal_users' AND column_name = 'role')
          OR (table_name = 'users' AND column_name = 'role')
        )
      ORDER BY table_name;
    `;

    console.log('');
    criticalColumns.forEach(col => {
      const status = col.data_type === 'text' ? '✅' : '❌';
      console.log(`${status} ${col.table_name}.${col.column_name}: ${col.data_type}`);
    });

    // Check token columns
    console.log('\n─'.repeat(80));
    console.log('Checking portal user token columns...');

    const tokenColumns = await prisma.$queryRaw<any[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portal_users'
        AND column_name IN (
          'emailVerificationToken',
          'emailVerificationExpiry',
          'passwordResetToken',
          'passwordResetExpiry'
        )
      ORDER BY column_name;
    `;

    console.log('');
    const expectedTokenCols = [
      'emailVerificationToken',
      'emailVerificationExpiry',
      'passwordResetToken',
      'passwordResetExpiry'
    ];

    expectedTokenCols.forEach(colName => {
      const exists = tokenColumns.some(c => c.column_name === colName);
      console.log(`${exists ? '✅' : '❌'} ${colName}: ${exists ? 'exists' : 'missing'}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 MIGRATIONS APPLIED SUCCESSFULLY');
    console.log('═'.repeat(80));

    console.log('\nNext Steps:');
    console.log('1. Update prisma/schema.prisma:');
    console.log('   - Remove all enum type definitions');
    console.log('   - Change enum fields to String');
    console.log('   - Fix column name mismatches (subdomain→slug, isActive→status, etc.)');
    console.log('2. Run: npx prisma generate');
    console.log('3. Test authentication and data queries');
    console.log('4. Deploy to production');

    console.log('\n' + '═'.repeat(80));

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migrations
applyMigrations()
  .then(() => {
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
