#!/usr/bin/env ts-node
/**
 * Leora Platform - Seed Script for Well Crafted Tenant
 *
 * Provisions initial tenant data including:
 * - Tenant and settings
 * - System roles and permissions
 * - Sample products and customers
 * - Demo portal users
 *
 * Usage:
 *   npx ts-node scripts/seed-well-crafted-tenant.ts
 *   npm run seed
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PORTAL_PASSWORD =
  process.env.DEFAULT_PORTAL_PASSWORD || 'LeoraDemo!2025';

// ============================================================================
// SEED DATA DEFINITIONS
// ============================================================================

const TENANT_SLUG = 'well-crafted';
const TENANT_NAME = 'Well Crafted';

// System roles
const SYSTEM_ROLES = [
  {
    key: 'admin',
    name: 'Administrator',
    description: 'Full system access',
    roleType: 'SYSTEM',
    isSystem: true,
    isDefault: false,
  },
  {
    key: 'sales_manager',
    name: 'Sales Manager',
    description: 'Manage sales team and accounts',
    roleType: 'SYSTEM',
    isSystem: true,
    isDefault: false,
  },
  {
    key: 'sales_rep',
    name: 'Sales Representative',
    description: 'Access to assigned accounts and activities',
    roleType: 'SYSTEM',
    isSystem: true,
    isDefault: false,
  },
  {
    key: 'portal_admin',
    name: 'Portal Administrator',
    description: 'Customer portal administration',
    roleType: 'PORTAL',
    isSystem: true,
    isDefault: false,
  },
  {
    key: 'portal_user',
    name: 'Portal User',
    description: 'Standard customer portal access',
    roleType: 'PORTAL',
    isSystem: true,
    isDefault: true,
  },
];

// System permissions (aligned with RBAC categories)
const SYSTEM_PERMISSIONS = [
  { key: 'portal.access', name: 'Access Portal', category: 'portal' },
  { key: 'portal.catalog.view', name: 'View Catalog', category: 'portal' },
  { key: 'portal.orders.view', name: 'View Orders', category: 'portal' },
  { key: 'portal.orders.create', name: 'Create Orders', category: 'portal' },
  { key: 'portal.cart.manage', name: 'Manage Cart', category: 'portal' },
  { key: 'portal.favorites.manage', name: 'Manage Favorites', category: 'portal' },
  { key: 'portal.lists.manage', name: 'Manage Lists', category: 'portal' },
  { key: 'portal.insights.view', name: 'View Insights', category: 'portal' },
  { key: 'portal.reports.view', name: 'View Reports', category: 'portal' },
  { key: 'portal.reports.export', name: 'Export Reports', category: 'portal' },
  { key: 'portal.notifications.view', name: 'View Notifications', category: 'portal' },

  { key: 'catalog.products.manage', name: 'Manage Products', category: 'catalog' },
  { key: 'orders.manage', name: 'Manage Orders', category: 'orders' },
  { key: 'customers.manage', name: 'Manage Customers', category: 'customers' },
  { key: 'analytics.view', name: 'View Analytics', category: 'analytics' },
  { key: 'analytics.export', name: 'Export Analytics', category: 'analytics' },
];

// Sample products
const SAMPLE_PRODUCTS = [
  {
    sku: 'WC-CAB-001',
    name: 'Estate Reserve Cabernet Sauvignon',
    description: 'Full-bodied Napa Valley Cabernet with notes of blackberry and oak',
    category: 'Wine',
    brand: 'Well Crafted Reserve',
    varietal: 'Cabernet Sauvignon',
    vintage: '2021',
    region: 'Napa Valley',
    alcoholType: 'WINE' as const,
    alcoholPercent: 14.5,
    active: true,
    basePrice: 58.0,
    initialInventory: 180,
  },
  {
    sku: 'WC-CHARD-001',
    name: 'Sonoma Coast Chardonnay',
    description: 'Elegant Chardonnay with citrus and butter notes',
    category: 'Wine',
    brand: 'Well Crafted',
    varietal: 'Chardonnay',
    vintage: '2022',
    region: 'Sonoma Coast',
    alcoholType: 'WINE' as const,
    alcoholPercent: 13.5,
    active: true,
    basePrice: 34.0,
    initialInventory: 220,
  },
  {
    sku: 'WC-PINOT-001',
    name: 'Willamette Valley Pinot Noir',
    description: 'Silky Pinot Noir with cherry and earth flavors',
    category: 'Wine',
    brand: 'Well Crafted',
    varietal: 'Pinot Noir',
    vintage: '2021',
    region: 'Willamette Valley',
    alcoholType: 'WINE' as const,
    alcoholPercent: 13.0,
    active: true,
    basePrice: 49.5,
    initialInventory: 160,
  },
];

// Sample customers
const SAMPLE_CUSTOMERS = [
  {
    accountNumber: 'WC-001',
    companyName: 'Harborview Cellars',
    tradeName: 'Harborview Wine Shop',
    primaryContactName: 'Sarah Johnson',
    primaryContactEmail: 'sarah@harborviewcellars.com',
    primaryContactPhone: '(555) 123-4567',
    status: 'ACTIVE' as const,
    tier: 'premium',
    paymentTerms: 'NET30',
  },
  {
    accountNumber: 'WC-002',
    companyName: 'Downtown Wine & Spirits',
    tradeName: 'Downtown Liquor',
    primaryContactName: 'Michael Chen',
    primaryContactEmail: 'michael@downtownwine.com',
    primaryContactPhone: '(555) 234-5678',
    status: 'ACTIVE' as const,
    tier: 'standard',
    paymentTerms: 'NET30',
  },
  {
    accountNumber: 'WC-003',
    companyName: 'Vineyard Market',
    tradeName: 'The Vineyard',
    primaryContactName: 'Emily Rodriguez',
    primaryContactEmail: 'emily@vineyardmarket.com',
    primaryContactPhone: '(555) 345-6789',
    status: 'ACTIVE' as const,
    tier: 'premium',
    paymentTerms: 'NET15',
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedTenant() {
  console.log('🌱 Seeding tenant: Well Crafted...');

  // Check if tenant exists
  async function findTenant(includeSettings: boolean) {
    return prisma.tenant.findUnique({
      where: { slug: TENANT_SLUG },
      ...(includeSettings ? { include: { settings: true } } : {}),
    });
  }

  let tenant = await findTenant(true).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      console.warn(
        '⚠️  Tenant settings columns are missing expected camelCase fields. Falling back to minimal tenant fetch.'
      );
      return findTenant(false);
    }
    throw error;
  });

  if (!tenant) {
    // Create tenant
    try {
      tenant = await prisma.tenant.create({
        data: {
          slug: TENANT_SLUG,
          name: TENANT_NAME,
          status: 'ACTIVE',
          subscriptionTier: 'enterprise',
          contactEmail: 'admin@wellcrafted.com',
          settings: {
            create: {
              defaultCurrency: 'USD',
              timezone: 'America/Los_Angeles',
              dateFormat: 'MM/DD/YY',
              revenueHealthDropPercent: 15,
              minimumOrdersForHealth: 3,
              defaultSampleAllowancePerRep: 60,
              requireManagerApprovalAbove: 60,
              minimumOrdersForPaceCalc: 3,
              paceRiskThresholdDays: 2,
              portalEnabled: true,
              cartEnabled: true,
              invoiceVisibility: true,
            },
          },
        },
        include: { settings: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
        console.warn(
          '⚠️  Unable to create tenant settings because expected columns are missing. Creating tenant without settings.'
        );
        tenant = await prisma.tenant.create({
          data: {
            slug: TENANT_SLUG,
            name: TENANT_NAME,
            status: 'ACTIVE',
            subscriptionTier: 'enterprise',
            contactEmail: 'admin@wellcrafted.com',
          },
        });
      } else {
        throw error;
      }
    }
    console.log(`✅ Created tenant: ${tenant.slug}`);
  } else {
    console.log(`ℹ️  Tenant already exists: ${tenant.slug}`);
  }

  return tenant;
}

async function seedRolesAndPermissions(tenantId: string) {
  console.log('🌱 Seeding roles and permissions...');

  // Create permissions
  for (const permData of SYSTEM_PERMISSIONS) {
    try {
      await prisma.permission.upsert({
        where: { key: permData.key },
        update: {
          name: permData.name,
          category: permData.category ?? null,
        },
        create: {
          tenantId,
          key: permData.key,
          name: permData.name,
          category: permData.category ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
        console.warn(
          '⚠️  Permission table is missing expected columns. Skipping permission seeding for legacy schema.'
        );
        return;
      } else {
        throw error;
      }
    }
  }
  console.log(`✅ Created ${SYSTEM_PERMISSIONS.length} permissions`);

  // Create roles and assign permissions
  for (const roleData of SYSTEM_ROLES) {
    const role = await (async () => {
      try {
        return await prisma.role.upsert({
          where: {
            tenantId_name: {
              tenantId,
              name: roleData.name,
            },
          },
          update: {
            description: roleData.description,
            roleType: roleData.roleType,
            isDefault: roleData.isDefault ?? false,
            isSystem: roleData.isSystem ?? false,
          },
          create: {
            tenantId,
            name: roleData.name,
            description: roleData.description,
            roleType: roleData.roleType,
            isDefault: roleData.isDefault ?? false,
            isSystem: roleData.isSystem ?? false,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
          console.warn(
            '⚠️  Role table is missing expected columns. Skipping role seeding for legacy schema.'
          );
          return prisma.role.findFirst({
            where: {
              tenantId,
              name: roleData.name,
            },
          });
        }
        throw error;
      }
    })();

    if (!role) {
      continue;
    }

    // Assign permissions based on role
    const permissionKeys = getPermissionsForRole(roleData.key);
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          tenantId_roleId_permissionId: {
            tenantId,
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          tenantId,
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
  console.log(`✅ Created ${SYSTEM_ROLES.length} roles with permissions`);
}

function getPermissionsForRole(roleKey: string): string[] {
  switch (roleKey) {
    case 'admin':
      return SYSTEM_PERMISSIONS.map((p) => p.key);
    case 'sales_manager':
      return [
        'portal.access',
        'portal.catalog.view',
        'portal.orders.view',
        'portal.orders.create',
        'portal.insights.view',
        'portal.reports.view',
        'portal.reports.export',
        'portal.notifications.view',
        'catalog.products.manage',
        'orders.manage',
        'customers.manage',
        'analytics.view',
        'analytics.export',
      ];
    case 'sales_rep':
      return [
        'portal.access',
        'portal.catalog.view',
        'portal.orders.view',
        'portal.orders.create',
        'portal.insights.view',
        'portal.reports.view',
        'portal.notifications.view',
      ];
    case 'portal_admin':
      return [
        'portal.access',
        'portal.catalog.view',
        'portal.orders.view',
        'portal.orders.create',
        'portal.cart.manage',
        'portal.favorites.manage',
        'portal.lists.manage',
        'portal.reports.view',
        'portal.reports.export',
        'portal.notifications.view',
        'portal.insights.view',
      ];
    case 'portal_user':
      return [
        'portal.access',
        'portal.catalog.view',
        'portal.orders.view',
        'portal.orders.create',
        'portal.cart.manage',
        'portal.favorites.manage',
        'portal.insights.view',
        'portal.reports.view',
      ];
    default:
      return [];
  }
}

async function seedProducts(tenantId: string) {
  console.log('🌱 Seeding products...');

  for (const productData of SAMPLE_PRODUCTS) {
    const { basePrice, initialInventory, ...productInput } = productData;

    const product = await prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId,
          sku: productInput.sku,
        },
      },
      update: {
        active: productInput.active,
        description: productInput.description,
      },
      create: {
        ...productInput,
        tenantId,
      },
    });

    const existingSku = await prisma.sku.findFirst({
      where: {
        tenantId,
        productId: product.id,
      },
    });

    if (!existingSku) {
      await prisma.sku.create({
        data: {
          tenantId,
          productId: product.id,
          skuCode: `${productInput.sku}-CS`,
          variantName: 'Case (12x750ml)',
          caseQuantity: 12,
          basePrice,
          active: true,
        },
      });
    }

    const existingInventory = await prisma.inventory.findFirst({
      where: {
        tenantId,
        productId: product.id,
      },
    });

    if (!existingInventory) {
      await prisma.inventory.create({
        data: {
          tenantId,
          productId: product.id,
          warehouseLocation: 'Main Warehouse',
          quantityOnHand: initialInventory,
          quantityAvailable: initialInventory,
        },
      });
    }
  }
  console.log(`✅ Created ${SAMPLE_PRODUCTS.length} products`);
}

async function seedCustomers(tenantId: string) {
  console.log('🌱 Seeding customers...');

  for (const customerData of SAMPLE_CUSTOMERS) {
    const { companyName, status, ...customerFields } = customerData;

    // Create or get company
    let company = await prisma.company.findFirst({
      where: {
        tenantId,
        name: companyName,
      },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          tenantId,
          name: companyName,
          active: true,
        },
      });
    }

    // Create customer linked to company
    await prisma.customer.upsert({
      where: {
        tenantId_accountNumber: {
          tenantId,
          accountNumber: customerFields.accountNumber!,
        },
      },
      update: {},
      create: {
        ...customerFields,
        tenantId,
        companyId: company.id,
      },
    });
  }
  console.log(`✅ Created ${SAMPLE_CUSTOMERS.length} customers`);
}

async function seedPortalUsers(tenantId: string) {
  console.log('🌱 Seeding portal users...');

  const portalRole = await prisma.role.findFirst({
    where: {
      tenantId,
      name: {
        in: ['Portal User', 'Portal Buyer'],
      },
    },
  });

  if (!portalRole) {
    console.error('❌ Portal user role not found');
    return;
  }

  const passwordHash = hashSync(DEFAULT_PORTAL_PASSWORD, 10);
  console.log(`ℹ️  Portal user default password: ${DEFAULT_PORTAL_PASSWORD}`);

  const customers = await prisma.customer.findMany({
    where: { tenantId },
  });

  for (const customer of customers) {
    const email = customer.primaryContactEmail || `${customer.accountNumber}@example.com`;

    await prisma.portalUser.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
      update: {},
      create: {
        tenantId,
        customerId: customer.id,
        email,
        firstName: customer.primaryContactName?.split(' ')[0] || 'Portal',
        lastName: customer.primaryContactName?.split(' ')[1] || 'User',
        fullName: customer.primaryContactName || 'Portal User',
        phone: customer.primaryContactPhone,
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        passwordHash,
        roleAssignments: {
          create: {
            roleId: portalRole.id,
          },
        },
      },
    });
  }
  console.log(`✅ Created ${customers.length} portal users`);
}

async function seedDemoData(tenantId: string) {
  console.log('🌱 Seeding demo orders and invoices...');

  const customers = await prisma.customer.findMany({
    where: { tenantId },
  });

  const products = await prisma.product.findMany({
    where: { tenantId },
    include: {
      skus: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  const portalUser = await prisma.portalUser.findFirst({
    where: { tenantId },
  });

  if (customers.length === 0 || products.length === 0) {
    console.log('⚠️  Skipping demo orders: insufficient customers or products');
    return;
  }

  const now = new Date();
  const taxRate = 0.09;

  const orderConfigs = [
    { status: 'DELIVERED', daysAgo: 30, deliveredDaysAgo: 25, customerIndex: 0 },
    { status: 'IN_PROGRESS', daysAgo: 14, deliveredDaysAgo: null, customerIndex: 1 },
    { status: 'PENDING', daysAgo: 3, deliveredDaysAgo: null, customerIndex: 0 },
  ] as const;

  let orderSequence = 1;

  for (const config of orderConfigs) {
    const customer = customers[config.customerIndex % customers.length];
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - config.daysAgo);

    const actualDeliveryDate =
      config.deliveredDaysAgo !== null
        ? new Date(now.getTime() - config.deliveredDaysAgo * 24 * 60 * 60 * 1000)
        : null;

    const selectedProducts = products.slice(0, Math.min(products.length, 2));
    const quantityPerLine = config.status === 'PENDING' ? 6 : 12;

    const lines = selectedProducts.map((product, index) => {
      const unitPrice = Number(product.skus[0]?.basePrice || 45);
      const lineNetPrice = unitPrice * quantityPerLine;
      const cases = Math.ceil(quantityPerLine / 12);
      const liters = quantityPerLine * 0.75; // 750ml bottles

      return {
        tenantId,
        productId: product.id,
        quantity: quantityPerLine,
        cases,
        liters,
        unitPrice,
        netPrice: Number(lineNetPrice.toFixed(2)),
        appliedPricingRules: JSON.stringify({ source: 'seed' }),
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.netPrice, 0);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const orderNumber = `ORD-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${orderSequence.toString().padStart(3, '0')}`;
    orderSequence += 1;

    const order = await prisma.order.create({
      data: {
        tenantId,
        customerId: customer.id,
        portalUserId: portalUser?.id ?? null,
        orderNumber,
        status: config.status,
        orderDate,
        requestedDeliveryDate: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        actualDeliveryDate,
        subtotal: Number(subtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        shippingAmount: 0,
        discountAmount: 0,
        totalAmount: Number(totalAmount.toFixed(2)),
        currency: 'USD',
        lines: {
          create: lines,
        },
      },
    });

    if (config.status === 'DELIVERED') {
      await prisma.invoice.create({
        data: {
          tenantId,
          customerId: customer.id,
          orderId: order.id,
          invoiceNumber: orderNumber.replace('ORD', 'INV'),
          status: 'PAID',
          invoiceDate: actualDeliveryDate ?? orderDate,
          dueDate: new Date(orderDate.getTime() + 20 * 24 * 60 * 60 * 1000),
          paidDate: new Date(orderDate.getTime() + 25 * 24 * 60 * 60 * 1000),
          subtotal: Number(subtotal.toFixed(2)),
          taxAmount: Number(taxAmount.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          paidAmount: Number(totalAmount.toFixed(2)),
          balanceDue: 0,
          currency: 'USD',
        },
      });
    }
  }

  console.log('✅ Created demo orders and invoices');
}

async function seedPortalUserAssets(tenantId: string) {
  console.log('🌱 Seeding portal user favorites, templates, and notifications...');

  const portalUser = await prisma.portalUser.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
  });

  if (!portalUser) {
    console.log('⚠️  Skipping portal user assets: no portal users found');
    return;
  }

  const products = await prisma.product.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    take: 3,
  });

  if (products.length === 0) {
    console.log('⚠️  Skipping favorites/templates seeding: no products found');
  } else {
    let favoritesList = await prisma.list.findFirst({
      where: {
        tenantId,
        portalUserId: portalUser.id,
        isDefault: true,
      },
    });

    if (!favoritesList) {
      favoritesList = await prisma.list.create({
        data: {
          tenantId,
          portalUserId: portalUser.id,
          name: 'Favorites',
          description: 'Saved favorite products',
          isDefault: true,
        },
      });
    }

    const existingFavorites = await prisma.listItem.count({
      where: { listId: favoritesList.id },
    });

    if (existingFavorites === 0) {
      await prisma.listItem.createMany({
        data: products.slice(0, 2).map((product, index) => ({
          listId: favoritesList!.id,
          productId: product.id,
          sortOrder: index,
        })),
      });
    }

    const existingTemplate = await prisma.list.findFirst({
      where: {
        tenantId,
        portalUserId: portalUser.id,
        isDefault: false,
        name: 'Weekly Restock Template',
      },
    });

    if (!existingTemplate) {
      await prisma.list.create({
        data: {
          tenantId,
          portalUserId: portalUser.id,
          name: 'Weekly Restock Template',
          description: 'Baseline restock order for top movers',
          isDefault: false,
          isShared: false,
          items: {
            create: products.map((product, index) => ({
              productId: product.id,
              sortOrder: index,
              notes: JSON.stringify({ quantity: index === 0 ? 6 : 3 }),
            })),
          },
        },
      });
    }
  }

  const referenceOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderDate: 'desc' },
  });

  const existingNotifications = await prisma.notification.count({
    where: {
      tenantId,
      portalUserId: portalUser.id,
    },
  });

  if (existingNotifications === 0) {
    await prisma.notification.createMany({
      data: [
        {
          tenantId,
          portalUserId: portalUser.id,
          type: 'order_update',
          title: referenceOrder
            ? `Order ${referenceOrder.orderNumber} delivered`
            : 'Order delivered',
          message: referenceOrder
            ? `Order ${referenceOrder.orderNumber} has been delivered.`
            : 'A recent order has been delivered.',
          priority: 'NORMAL',
          isRead: false,
          metadata: referenceOrder
            ? { orderId: referenceOrder.id, orderNumber: referenceOrder.orderNumber }
            : Prisma.JsonNull,
        },
        {
          tenantId,
          portalUserId: portalUser.id,
          type: 'product_alert',
          title: 'Top product back in stock',
          message: 'Your favorite catalog item is available again.',
          priority: 'HIGH',
          isRead: false,
          metadata: products[0] ? { productId: products[0].id } : Prisma.JsonNull,
        },
      ],
    });
  }

  console.log('✅ Portal user favorites, templates, and notifications seeded');
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🚀 Starting Leora Platform seed...\n');

  try {
    // Seed in order
    const tenant = await seedTenant();
    await seedRolesAndPermissions(tenant.id);
    await seedProducts(tenant.id);
    await seedCustomers(tenant.id);
    await seedPortalUsers(tenant.id);
    await seedPortalUserAssets(tenant.id);
    await seedDemoData(tenant.id);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nTenant Details:');
    console.log(`  Slug: ${tenant.slug}`);
    console.log(`  Name: ${tenant.name}`);
    console.log(`  ID: ${tenant.id}`);
    console.log('\nDefault Environment Variables:');
    console.log(`  DEFAULT_TENANT_SLUG=${tenant.slug}`);
    console.log(`  DEFAULT_TENANT_ID=${tenant.id}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
