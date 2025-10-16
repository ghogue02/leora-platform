import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function fixRemainingEnums() {
  console.log('🔧 Fixing Remaining 8 Enum Columns\n');
  console.log('=' .repeat(80));

  try {
    console.log('📡 Connected to database\n');

    // The remaining 8 columns use snake_case in the database, not camelCase
    const remainingConversions = [
      { table: 'account_health_snapshots', column: 'health_status' },
      { table: 'activity_types', column: 'weight_category' },
      { table: 'compliance_transactions', column: 'customer_type' },
      { table: 'compliance_transactions', column: 'wine_type' },
      { table: 'notes', column: 'note_type' },
      { table: 'notification_preferences', column: 'email_frequency' },
      { table: 'state_configurations', column: 'filing_frequency' },
      { table: 'state_tax_rates', column: 'wine_type' },
    ];

    for (const { table, column } of remainingConversions) {
      try {
        console.log(`Converting ${table}.${column}...`);

        await prisma.$executeRaw`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = ${table}
                AND column_name = ${column}
                AND data_type = 'USER-DEFINED'
            ) THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE text USING %I::text', ${table}, ${column}, ${column});
              RAISE NOTICE 'Converted %.%', ${table}, ${column};
            ELSE
              RAISE NOTICE '% already text or does not exist', ${table} || '.' || ${column};
            END IF;
          END $$;
        `;

        console.log(`✅ ${table}.${column} converted`);
      } catch (error: any) {
        console.log(`⚠️  ${table}.${column} - ${error.message}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('🔍 FINAL VERIFICATION');
    console.log('═'.repeat(80));

    const remaining = await prisma.$queryRaw<any[]>`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'USER-DEFINED'
      ORDER BY table_name, column_name;
    `;

    if (remaining.length === 0) {
      console.log('\n✅ SUCCESS: All enum columns converted to TEXT!');
      console.log('✅ Database is now fully Prisma-compatible!\n');
    } else {
      console.log(`\n⚠️  ${remaining.length} enum columns still remain:\n`);
      remaining.forEach(col => {
        console.log(`   - ${col.table_name}.${col.column_name} (${col.udt_name})`);
      });
      console.log('');
    }

    console.log('═'.repeat(80));

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
