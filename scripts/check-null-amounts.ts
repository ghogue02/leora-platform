/**
 * Check for NULL monetary fields before migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNullAmounts() {
  console.log('🔍 Checking for NULL monetary fields...\n');

  try {
    // Check orders
    const nullOrders = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM orders
      WHERE "totalAmount" IS NULL
         OR subtotal IS NULL
         OR "taxAmount" IS NULL
         OR "shippingAmount" IS NULL
         OR "discountAmount" IS NULL;
    `;

    // Check order_lines
    const nullOrderLines = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM order_lines
      WHERE "totalAmount" IS NULL
         OR subtotal IS NULL
         OR "taxAmount" IS NULL
         OR "discountAmount" IS NULL;
    `;

    // Check invoices
    const nullInvoices = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE "totalAmount" IS NULL
         OR subtotal IS NULL
         OR "taxAmount" IS NULL
         OR "balanceDue" IS NULL;
    `;

    // Check carts
    const nullCarts = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM carts
      WHERE "totalAmount" IS NULL
         OR subtotal IS NULL
         OR "taxAmount" IS NULL;
    `;

    // Check cart_items
    const nullCartItems = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM cart_items
      WHERE subtotal IS NULL
         OR "unitPrice" IS NULL;
    `;

    console.log('📊 NULL Value Counts:\n');
    console.log(`Orders with NULL amounts:       ${nullOrders[0].count}`);
    console.log(`Order Lines with NULL amounts:  ${nullOrderLines[0].count}`);
    console.log(`Invoices with NULL amounts:     ${nullInvoices[0].count}`);
    console.log(`Carts with NULL amounts:        ${nullCarts[0].count}`);
    console.log(`Cart Items with NULL amounts:   ${nullCartItems[0].count}`);

    const totalNulls = Number(nullOrders[0].count) +
                      Number(nullOrderLines[0].count) +
                      Number(nullInvoices[0].count) +
                      Number(nullCarts[0].count) +
                      Number(nullCartItems[0].count);

    console.log(`\nTotal records with NULL amounts: ${totalNulls}\n`);

    if (totalNulls > 0) {
      console.log('⚠️  NULL values found! Migration needed.');
      console.log('\n💡 Next step: Run the migration:');
      console.log('   npx tsx scripts/apply-null-fix-migration.ts\n');
    } else {
      console.log('✅ No NULL values found! Database is clean.\n');
    }

    // Get sample records with NULLs for debugging
    if (Number(nullOrders[0].count) > 0) {
      const samples = await prisma.$queryRaw<Array<any>>`
        SELECT id, "orderNumber", subtotal, "taxAmount", "totalAmount"
        FROM orders
        WHERE "totalAmount" IS NULL OR subtotal IS NULL
        LIMIT 5;
      `;
      console.log('Sample orders with NULLs:');
      console.table(samples);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNullAmounts();
