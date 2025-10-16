/**
 * CRITICAL: Find ALL Prisma queries that might fail
 * Compare every query against actual database schema
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function criticalAudit() {
  console.log('🚨 CRITICAL SCHEMA AUDIT - Finding ALL Potential Failures\n');

  const errors: string[] = [];

  try {
    // Test every critical query that insights API uses
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'well-crafted' }
    });

    if (!tenant) throw new Error('No tenant found');

    console.log('Testing insights API queries...\n');

    // 1. Order count
    try {
      await prisma.order.count({ where: { tenantId: tenant.id } });
      console.log('✅ order.count()');
    } catch (e: any) {
      errors.push(`order.count: ${e.message}`);
      console.log(`❌ order.count: ${e.message}`);
    }

    // 2. Order aggregate
    try {
      await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { tenantId: tenant.id }
      });
      console.log('✅ order.aggregate totalAmount');
    } catch (e: any) {
      errors.push(`order.aggregate: ${e.message}`);
      console.log(`❌ order.aggregate: ${e.message}`);
    }

    // 3. Customer count
    try {
      await prisma.customer.count({
        where: { tenantId: tenant.id }
      });
      console.log('✅ customer.count()');
    } catch (e: any) {
      errors.push(`customer.count: ${e.message}`);
      console.log(`❌ customer.count: ${e.message}`);
    }

    // 4. OrderLine findMany (THE CRITICAL ONE)
    try {
      const lines = await prisma.orderLine.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          netPrice: true,
          quantity: true
        },
        take: 1
      });
      console.log(`✅ orderLine.findMany (found ${lines.length})`);
    } catch (e: any) {
      errors.push(`orderLine.findMany: ${e.message}`);
      console.log(`❌ orderLine.findMany: ${e.message}`);
    }

    // 5. Full Order with lines (what insights actually does)
    try {
      const orders = await prisma.order.findMany({
        where: { tenantId: tenant.id },
        include: {
          lines: {
            select: {
              netPrice: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              },
              order: {
                select: {
                  customerId: true
                }
              }
            }
          }
        },
        take: 1
      });
      console.log(`✅ order.findMany with lines (found ${orders.length})`);
    } catch (e: any) {
      errors.push(`order with lines: ${e.message}`);
      console.log(`❌ order with lines: ${e.message}`);
    }

    console.log('\n' + '='.repeat(80));
    if (errors.length === 0) {
      console.log('✅ ALL QUERIES PASS - No schema mismatches!\n');
    } else {
      console.log(`❌ FOUND ${errors.length} ERRORS:\n`);
      errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
      console.log('\n');
    }

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

criticalAudit();
