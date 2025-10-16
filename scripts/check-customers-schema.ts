/**
 * Check actual customers table schema
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomersSchema() {
  try {
    console.log('Checking customers table schema...\n');

    const result = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'customers'
      ORDER BY ordinal_position;
    `;

    console.log('Customers table columns:');
    console.log('-------------------------');
    result.forEach((col) => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomersSchema();
