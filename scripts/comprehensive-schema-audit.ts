/**
 * Comprehensive Database Schema Audit
 * Compares actual database schema with Prisma models
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function getAllTables(): Promise<string[]> {
  const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  return result.map(r => r.table_name);
}

async function getTableSchema(tableName: string): Promise<ColumnInfo[]> {
  return prisma.$queryRaw<ColumnInfo[]>`
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position;
  `;
}

async function comprehensiveAudit() {
  console.log('🔍 COMPREHENSIVE DATABASE SCHEMA AUDIT\n');
  console.log('=' .repeat(80));

  const tables = await getAllTables();
  console.log(`\n📋 Found ${tables.length} tables in database\n`);

  const auditResults: any[] = [];
  const mismatches: any[] = [];

  for (const table of tables) {
    const columns = await getTableSchema(table);

    console.log(`\n📊 Table: ${table}`);
    console.log('-'.repeat(80));

    const columnInfo: any = {
      tableName: table,
      totalColumns: columns.length,
      columns: columns.map(c => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
        hasDefault: c.column_default !== null
      }))
    };

    auditResults.push(columnInfo);

    // Check for common mismatch patterns
    const hasStatusColumn = columns.some(c => c.column_name === 'status');
    const hasActiveColumn = columns.some(c => c.column_name === 'active');
    const hasCompanyNameColumn = columns.some(c => c.column_name === 'companyName');
    const hasCompanyIdColumn = columns.some(c => c.column_name === 'companyId');

    if (hasActiveColumn && !hasStatusColumn) {
      mismatches.push({
        table,
        issue: 'Has active (boolean) but NOT status (text)',
        action: 'Use active: true instead of status: "ACTIVE"'
      });
      console.log('   ⚠️  Uses active (boolean), not status field');
    }

    if (hasCompanyIdColumn && !hasCompanyNameColumn) {
      mismatches.push({
        table,
        issue: 'Has companyId (FK) but NOT companyName',
        action: 'Use company relation instead of companyName field'
      });
      console.log('   ⚠️  Has companyId FK, no companyName field');
    }

    // List all columns
    columns.forEach(col => {
      const nullInfo = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   - ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullInfo}`);
    });
  }

  // Save comprehensive audit
  const auditReport = {
    auditDate: new Date().toISOString(),
    totalTables: tables.length,
    tables: auditResults,
    potentialMismatches: mismatches,
  };

  fs.writeFileSync(
    'docs/database/COMPREHENSIVE-SCHEMA-AUDIT.json',
    JSON.stringify(auditReport, null, 2)
  );

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal Tables: ${tables.length}`);
  console.log(`Potential Mismatches: ${mismatches.length}\n`);

  if (mismatches.length > 0) {
    console.log('⚠️  POTENTIAL SCHEMA MISMATCHES:\n');
    mismatches.forEach((m, i) => {
      console.log(`${i + 1}. ${m.table}`);
      console.log(`   Issue: ${m.issue}`);
      console.log(`   Action: ${m.action}\n`);
    });
  }

  console.log(`\n✅ Full audit saved to: docs/database/COMPREHENSIVE-SCHEMA-AUDIT.json`);
  console.log(`\n💡 Next: Review the JSON file and compare with prisma/schema.prisma`);
}

comprehensiveAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
