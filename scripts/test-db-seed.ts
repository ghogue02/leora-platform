#!/usr/bin/env ts-node
/**
 * Test database seeding script
 * Usage: npm run test:seed
 */

import { PrismaClient } from '@prisma/client';
import { testTenantData, seedTestData } from '../tests/fixtures/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting test database seed...');

  try {
    // Create test tenant
    console.log('Creating test tenant...');
    const tenant = await prisma.tenant.upsert({
      where: { slug: testTenantData.slug },
      update: {},
      create: {
        ...testTenantData,
        settings: {
          create: testTenantData.settings,
        },
      },
      include: {
        settings: true,
      },
    });

    console.log(`✓ Created tenant: ${tenant.slug}`);

    // Seed test data
    console.log('Seeding test data...');
    const seeded = await seedTestData(prisma, tenant.id);

    console.log(`✓ Created ${seeded.users.length} users`);
    console.log(`✓ Created ${seeded.products.length} products`);
    console.log(`✓ Created ${seeded.orders.length} orders`);

    console.log('\nTest database seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('  Admin:    admin@test.com / password123');
    console.log('  Customer: customer@test.com / password123');
    console.log('  Manager:  manager@test.com / password123');
    console.log(`\nTenant ID: ${tenant.id}`);
    console.log(`Tenant Slug: ${tenant.slug}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
