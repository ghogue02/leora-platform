/**
 * Test database seed data fixtures
 */

export const testTenantData = {
  id: 'test-tenant-seed',
  slug: 'test-tenant',
  name: 'Test Tenant Organization',
  status: 'ACTIVE' as const,
  settings: {
    timezone: 'America/New_York',
    defaultCurrency: 'USD',
    dateFormat: 'MM/DD/YY',
  },
};

export const testPortalUsers = [
  {
    email: 'admin@test.com',
    passwordHash: '$2a$10$test.hash.for.admin.user',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    status: 'ACTIVE' as const,
    emailVerified: true,
  },
  {
    email: 'customer@test.com',
    passwordHash: '$2a$10$test.hash.for.customer.user',
    firstName: 'Customer',
    lastName: 'User',
    role: 'customer' as const,
    status: 'ACTIVE' as const,
    emailVerified: true,
  },
  {
    email: 'manager@test.com',
    passwordHash: '$2a$10$test.hash.for.manager.user',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager' as const,
    status: 'ACTIVE' as const,
    emailVerified: true,
  },
];

export const testProducts = [
  {
    name: 'Cabernet Sauvignon 2021',
    description: 'Full-bodied red wine with notes of blackberry and oak',
    category: 'Wine',
    brand: 'Vineyard Estate',
    status: 'ACTIVE' as const,
    skus: [
      {
        skuCode: 'CAB-2021-750',
        size: '750ml',
        unitPrice: 2500, // $25.00
        cost: 1500, // $15.00
        status: 'ACTIVE' as const,
      },
    ],
  },
  {
    name: 'Chardonnay 2022',
    description: 'Crisp white wine with citrus notes',
    category: 'Wine',
    brand: 'Coastal Winery',
    status: 'ACTIVE' as const,
    skus: [
      {
        skuCode: 'CHAR-2022-750',
        size: '750ml',
        unitPrice: 2200, // $22.00
        cost: 1300, // $13.00
        status: 'ACTIVE' as const,
      },
    ],
  },
  {
    name: 'IPA Craft Beer',
    description: 'Hoppy India Pale Ale',
    category: 'Beer',
    brand: 'Local Brewery',
    status: 'ACTIVE' as const,
    skus: [
      {
        skuCode: 'IPA-001-12OZ',
        size: '12oz',
        unitPrice: 800, // $8.00
        cost: 500, // $5.00
        status: 'ACTIVE' as const,
      },
    ],
  },
];

export const testOrders = [
  {
    orderNumber: 'ORD-TEST-001',
    status: 'delivered' as const,
    subtotal: 5000,
    taxAmount: 450,
    shippingAmount: 1000,
    total: 6450,
    lines: [
      {
        productName: 'Cabernet Sauvignon 2021',
        skuCode: 'CAB-2021-750',
        quantity: 2,
        unitPrice: 2500,
        subtotal: 5000,
      },
    ],
  },
  {
    orderNumber: 'ORD-TEST-002',
    status: 'pending' as const,
    subtotal: 4400,
    taxAmount: 396,
    shippingAmount: 1000,
    total: 5796,
    lines: [
      {
        productName: 'Chardonnay 2022',
        skuCode: 'CHAR-2022-750',
        quantity: 2,
        unitPrice: 2200,
        subtotal: 4400,
      },
    ],
  },
];

export const testActivities = [
  {
    activityType: 'call',
    title: 'Follow-up call',
    description: 'Discussed upcoming order and new products',
    status: 'completed' as const,
    scheduledFor: new Date('2025-01-15T10:00:00Z'),
    completedAt: new Date('2025-01-15T10:30:00Z'),
  },
  {
    activityType: 'tasting',
    title: 'Wine tasting event',
    description: 'Showcase new vintage releases',
    status: 'scheduled' as const,
    scheduledFor: new Date('2025-02-01T14:00:00Z'),
  },
  {
    activityType: 'visit',
    title: 'On-site visit',
    description: 'Review inventory and discuss pricing',
    status: 'scheduled' as const,
    scheduledFor: new Date('2025-01-20T09:00:00Z'),
  },
];

export const testHealthSnapshots = [
  {
    score: 85,
    status: 'excellent' as const,
    ordersLast30Days: 4,
    ordersLast90Days: 12,
    revenueCurrentMonth: 10000,
    revenueAverage: 9500,
    daysSinceLastOrder: 7,
    averageOrderInterval: 10,
    insights: ['Account is healthy and performing well'],
  },
  {
    score: 45,
    status: 'at-risk' as const,
    ordersLast30Days: 0,
    ordersLast90Days: 2,
    revenueCurrentMonth: 0,
    revenueAverage: 5000,
    daysSinceLastOrder: 60,
    averageOrderInterval: 14,
    insights: [
      'No orders in the last 30 days - immediate follow-up recommended',
      'Revenue down 100% from average - investigate cause',
    ],
  },
];

/**
 * Seed function for test database
 */
export async function seedTestData(prisma: any, tenantId: string) {
  // Create portal users
  const users = await Promise.all(
    testPortalUsers.map((user) =>
      prisma.portalUser.create({
        data: {
          ...user,
          tenantId,
        },
      })
    )
  );

  // Create products
  const products = await Promise.all(
    testProducts.map((product) =>
      prisma.product.create({
        data: {
          ...product,
          tenantId,
          skus: {
            create: product.skus.map((sku) => ({
              ...sku,
              tenantId,
            })),
          },
        },
        include: {
          skus: true,
        },
      })
    )
  );

  // Create orders
  const orders = await Promise.all(
    testOrders.map((order, index) =>
      prisma.order.create({
        data: {
          ...order,
          tenantId,
          portalUserId: users[1].id, // Customer user
          lines: {
            create: order.lines.map((line) => ({
              ...line,
              tenantId,
            })),
          },
        },
        include: {
          lines: true,
        },
      })
    )
  );

  return {
    users,
    products,
    orders,
  };
}
