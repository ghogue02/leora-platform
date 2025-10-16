/**
 * Analyze gaps between database and Prisma schema
 */

import * as fs from 'fs';

// All tables in Prisma schema (from schema.prisma)
const prismaModels = [
  'tenants', 'tenant_settings', 'users', 'roles', 'user_roles',
  'permissions', 'role_permissions', 'portal_users', 'portal_user_roles',
  'portal_sessions', 'products', 'skus', 'inventory', 'price_list_entries',
  'companies', 'customers', 'suppliers', 'orders', 'order_lines',
  'invoices', 'payments', 'carts', 'cart_items', 'lists', 'list_items',
  'activities', 'call_plans', 'tasks', 'account_health_snapshots',
  'sales_metrics', 'compliance_filings', 'state_tax_rates',
  'webhook_subscriptions', 'webhook_events', 'webhook_deliveries',
  'integration_tokens', 'notifications'
];

const auditData = JSON.parse(
  fs.readFileSync('docs/database/COMPREHENSIVE-SCHEMA-AUDIT.json', 'utf-8')
);

const dbTables = auditData.tables.map((t: any) => t.tableName);

console.log('📊 SCHEMA GAP ANALYSIS\n');
console.log('='.repeat(80));

// Tables in DB but NOT in Prisma
const missingInPrisma = dbTables.filter((t: string) =>
  !prismaModels.includes(t) && !t.startsWith('_prisma')
);

console.log(`\n❌ TABLES IN DATABASE BUT MISSING FROM PRISMA (${missingInPrisma.length}):\n`);
missingInPrisma.forEach((table: string, i: number) => {
  const tableInfo = auditData.tables.find((t: any) => t.tableName === table);
  console.log(`${(i + 1).toString().padStart(2)}. ${table.padEnd(40)} (${tableInfo.totalColumns} columns)`);
});

// Tables in Prisma but NOT in DB
const missingInDB = prismaModels.filter((t: string) => !dbTables.includes(t));

console.log(`\n✅ TABLES IN PRISMA BUT MISSING FROM DATABASE (${missingInDB.length}):\n`);
if (missingInDB.length > 0) {
  missingInDB.forEach((table: string, i: number) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${table}`);
  });
} else {
  console.log('   None - all Prisma models have corresponding DB tables');
}

// Schema mismatches found by audit
console.log(`\n⚠️  SCHEMA MISMATCHES (${auditData.potentialMismatches.length}):\n`);
auditData.potentialMismatches.forEach((m: any, i: number) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${m.table.padEnd(40)}`);
  console.log(`    Issue:  ${m.issue}`);
  console.log(`    Action: ${m.action}\n`);
});

// Critical tables to prioritize
const criticalTables = ['users', 'portal_users', 'customers', 'products', 'orders'];
const criticalMismatches = auditData.potentialMismatches.filter((m: any) =>
  criticalTables.includes(m.table)
);

console.log(`\n🔴 CRITICAL MISMATCHES IN CORE TABLES (${criticalMismatches.length}):\n`);
criticalMismatches.forEach((m: any, i: number) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${m.table} - ${m.issue}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n💡 RECOMMENDATIONS:\n');
console.log('1. Add missing Prisma models for important tables (see list above)');
console.log('2. Fix critical mismatches in core tables first');
console.log('3. Update DATABASE-SCHEMA-REFERENCE.md with findings');
console.log('4. Search codebase for references to missing fields\n');
