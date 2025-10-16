import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function fixRemainingEnums() {
  console.log('🔧 Fixing Remaining 8 Enum Columns\n');

  try {
    // These are the actual column names from the verification query
    const remainingConversions = [
      { table: 'account_health_snapshots', column: 'healthStatus' },
      { table: 'activity_types', column: 'weightCategory' },
      { table: 'compliance_transactions', column: 'customerType' },
      { table: 'compliance_transactions', column: 'wineType' },
      { table: 'notes', column: 'noteType' },
      { table: 'notification_preferences', column: 'emailFrequency' },
      { table: 'state_configurations', column: 'filingFrequency' },
      { table: 'state_tax_rates', column: 'wineType' },
    ];

    for (const { table, column } of remainingConversions) {
      try {
        console.log(`Converting ${table}.${column}...`);

        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = '${table}'
                AND column_name = '${column}'
                AND data_type = 'USER-DEFINED'
            ) THEN
              ALTER TABLE ${table}
                ALTER COLUMN "${column}" TYPE text USING "${column}"::text;
              RAISE NOTICE 'Converted ${table}.${column}';
            END IF;
          END $$;
        `);

        console.log(`✅ ${table}.${column}`);
      } catch (error: any) {
        console.log(`⚠️  ${table}.${column} - ${error.code || 'error'}`);
      }
    }

    console.log('\n🔍 Final Verification...\n');

    const remaining = await prisma.$queryRaw<any[]>`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'USER-DEFINED'
      ORDER BY table_name, column_name;
    `;

    if (remaining.length === 0) {
      console.log('✅ SUCCESS: All 28 enum columns converted to TEXT!');
      console.log('✅ Database is now fully Prisma-compatible!\n');
    } else {
      console.log(`⚠️  ${remaining.length} enum columns still remain:\n`);
      remaining.forEach(col => {
        console.log(`   - ${col.table_name}.${col.column_name}`);
      });
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingEnums()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
