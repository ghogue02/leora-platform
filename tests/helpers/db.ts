/**
 * Database test helpers
 * Utilities for seeding and managing test database state
 */

import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client for tests
let prisma: PrismaClient | null = null;

export function getPrismaTestClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

/**
 * Clean all test data from the database
 */
export async function cleanDatabase() {
  const client = getPrismaTestClient();

  // Delete in order to respect foreign key constraints
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
      await client.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "tenantId" LIKE 'test-%'`);
    } catch (error) {
      // Table might not exist, ignore
      console.error(`Failed to clean ${table}:`, error);
    }
  }
}

/**
 * Disconnect Prisma client
 */
export async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Create a test tenant
 */
export async function createTestTenant(slug = 'test-tenant') {
  const client = getPrismaTestClient();

  return await client.tenant.create({
    data: {
      id: `test-${Date.now()}`,
      slug,
      name: 'Test Tenant',
      status: 'ACTIVE',
      settings: {
        create: {
          timezone: 'America/New_York',
          defaultCurrency: 'USD',
          dateFormat: 'MM/DD/YY',
        },
      },
    },
    include: {
      settings: true,
    },
  });
}

/**
 * Create a test portal user
 */
export async function createTestPortalUser(tenantId: string, email = 'test@example.com') {
  const client = getPrismaTestClient();

  return await client.portalUser.create({
    data: {
      email,
      passwordHash: '$2a$10$test.hash.for.testing.only',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId,
    },
  });
}

/**
 * Create a test product
 */
export async function createTestProduct(tenantId: string, data?: Partial<any>) {
  const client = getPrismaTestClient();

  return await client.product.create({
    data: {
      sku: data?.skuCode || `TEST-SKU-${Date.now()}`,
      name: data?.name || 'Test Product',
      description: data?.description || 'Test product description',
      category: data?.category || 'Wine',
      brand: data?.brand || 'Test Brand',
      active: data?.active ?? true,
      tenantId,
    },
  });
}

/**
 * Seed test database with common data
 */
export async function seedTestDatabase() {
  const tenant = await createTestTenant();
  const portalUser = await createTestPortalUser(tenant.id);
  const product = await createTestProduct(tenant.id);

  return {
    tenant,
    portalUser,
    product,
  };
}

// Cleanup after all tests
afterAll(async () => {
  await disconnectDatabase();
});
