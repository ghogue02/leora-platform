#!/usr/bin/env ts-node
/**
 * Clean test database script
 * Usage: npm run test:clean
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning test database...');

  try {
    const tables = [
      'WebhookDelivery',
      'WebhookEvent',
      'WebhookSubscription',
      'OrderLine',
      'Order',
      'Invoice',
      'Payment',
      'CartItem',
      'Cart',
      'Activity',
      'Task',
      'CallPlan',
      'AccountHealthSnapshot',
      'SalesMetric',
      'Inventory',
      'Sku',
      'Product',
      'PortalSession',
      'PortalUser',
      'Permission',
      'Role',
      'User',
      'TenantSettings',
      'Tenant',
    ];

    for (const table of tables) {
      try {
        const result = await prisma.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE "tenantId" LIKE 'test-%' OR "slug" LIKE 'test-%'`
        );
        console.log(`✓ Cleaned ${table}: ${result} rows deleted`);
      } catch (error: any) {
        if (error.code === 'P2010' || error.code === '42P01') {
          console.log(`  Skipped ${table}: table does not exist`);
        } else {
          console.error(`  Error cleaning ${table}:`, error.message);
        }
      }
    }

    console.log('\nTest database cleaned successfully!');
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
