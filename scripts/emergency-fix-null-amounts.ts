/**
 * EMERGENCY: Fix NULL totalAmount values that crash Prisma
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function emergencyFix() {
  console.log('🚨 EMERGENCY: Fixing NULL totalAmount values...\n');

  try {
    // Fix NULL totalAmount in orders
    console.log('1. Fixing orders.totalAmount...');
    const fixedOrders = await prisma.$executeRaw`
      UPDATE orders
      SET "totalAmount" = COALESCE("totalAmount", subtotal, total, 0)
      WHERE "totalAmount" IS NULL;
    `;
    console.log(`   ✅ Fixed ${fixedOrders} orders\n`);

    // Fix NULL subtotal in orders
    console.log('2. Fixing orders.subtotal...');
    const fixedSubtotals = await prisma.$executeRaw`
      UPDATE orders
      SET subtotal = COALESCE(subtotal, "totalAmount", total, 0)
      WHERE subtotal IS NULL;
    `;
    console.log(`   ✅ Fixed ${fixedSubtotals} order subtotals\n`);

    // Fix NULL taxAmount
    console.log('3. Fixing orders.taxAmount...');
    const fixedTax = await prisma.$executeRaw`
      UPDATE orders
      SET "taxAmount" = COALESCE("taxAmount", tax, 0)
      WHERE "taxAmount" IS NULL;
    `;
    console.log(`   ✅ Fixed ${fixedTax} order tax amounts\n`);

    // Fix NULL shippingAmount
    console.log('4. Fixing orders.shippingAmount...');
    const fixedShipping = await prisma.$executeRaw`
      UPDATE orders
      SET "shippingAmount" = COALESCE("shippingAmount", 0)
      WHERE "shippingAmount" IS NULL;
    `;
    console.log(`   ✅ Fixed ${fixedShipping} shipping amounts\n`);

    // Fix NULL discountAmount
    console.log('5. Fixing orders.discountAmount...');
    const fixedDiscount = await prisma.$executeRaw`
      UPDATE orders
      SET "discountAmount" = COALESCE("discountAmount", 0)
      WHERE "discountAmount" IS NULL;
    `;
    console.log(`   ✅ Fixed ${fixedDiscount} discount amounts\n`);

    // Verify no NULLs remain
    const remainingNulls = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM orders
      WHERE "totalAmount" IS NULL
         OR subtotal IS NULL
         OR "taxAmount" IS NULL
         OR "shippingAmount" IS NULL
         OR "discountAmount" IS NULL;
    `;

    console.log('✅ VERIFICATION:');
    console.log(`   Remaining NULL values: ${remainingNulls[0].count}\n`);

    if (Number(remainingNulls[0].count) === 0) {
      console.log('🎉 SUCCESS: All NULL values fixed!\n');
      console.log('Next: Restart your dev server or redeploy to Vercel');
    } else {
      console.log('⚠️  Warning: Some NULL values remain. May need manual review.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

emergencyFix();
