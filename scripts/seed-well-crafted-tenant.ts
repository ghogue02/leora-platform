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
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================================================
// SEED DATA DEFINITIONS
// ============================================================================

const TENANT_SLUG = 'well-crafted';
const TENANT_NAME = 'Well Crafted';

// System roles
const SYSTEM_ROLES = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access',
    isSystemRole: true,
  },
  {
    name: 'sales_manager',
    displayName: 'Sales Manager',
    description: 'Manage sales team and accounts',
    isSystemRole: true,
  },
  {
    name: 'sales_rep',
    displayName: 'Sales Representative',
    description: 'Access to assigned accounts and activities',
    isSystemRole: true,
  },
  {
    name: 'portal_admin',
    displayName: 'Portal Administrator',
    description: 'Customer portal administration',
    isSystemRole: true,
  },
  {
    name: 'portal_user',
    displayName: 'Portal User',
    description: 'Standard customer portal access',
    isSystemRole: true,
  },
];

// System permissions
const SYSTEM_PERMISSIONS = [
  // Product permissions
  { resource: 'products', action: 'view', name: 'products.view', displayName: 'View Products' },
  { resource: 'products', action: 'create', name: 'products.create', displayName: 'Create Products' },
  { resource: 'products', action: 'update', name: 'products.update', displayName: 'Update Products' },
  { resource: 'products', action: 'delete', name: 'products.delete', displayName: 'Delete Products' },

  // Order permissions
  { resource: 'orders', action: 'view', name: 'orders.view', displayName: 'View Orders' },
  { resource: 'orders', action: 'create', name: 'orders.create', displayName: 'Create Orders' },
  { resource: 'orders', action: 'update', name: 'orders.update', displayName: 'Update Orders' },
  { resource: 'orders', action: 'cancel', name: 'orders.cancel', displayName: 'Cancel Orders' },

  // Customer permissions
  { resource: 'customers', action: 'view', name: 'customers.view', displayName: 'View Customers' },
  { resource: 'customers', action: 'create', name: 'customers.create', displayName: 'Create Customers' },
  { resource: 'customers', action: 'update', name: 'customers.update', displayName: 'Update Customers' },

  // Portal permissions
  { resource: 'portal', action: 'access', name: 'portal.access', displayName: 'Access Portal' },
  { resource: 'portal', action: 'cart', name: 'portal.cart', displayName: 'Use Cart' },
  { resource: 'portal', action: 'favorites', name: 'portal.favorites', displayName: 'Manage Favorites' },
  { resource: 'portal', action: 'reports', name: 'portal.reports', displayName: 'View Reports' },

  // Analytics permissions
  { resource: 'analytics', action: 'view', name: 'analytics.view', displayName: 'View Analytics' },
  { resource: 'analytics', action: 'export', name: 'analytics.export', displayName: 'Export Analytics' },
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
    status: 'ACTIVE' as const,
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
    status: 'ACTIVE' as const,
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
    status: 'ACTIVE' as const,
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
  let tenant = await prisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
    include: { settings: true },
  });

  if (!tenant) {
    // Create tenant
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
    console.log(`✅ Created tenant: ${tenant.slug}`);
  } else {
    console.log(`ℹ️  Tenant already exists: ${tenant.slug}`);
  }

  return tenant;
}

async function seedRolesAndPermissions() {
  console.log('🌱 Seeding roles and permissions...');

  // Create permissions
  for (const permData of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permData.name },
      update: {},
      create: permData,
    });
  }
  console.log(`✅ Created ${SYSTEM_PERMISSIONS.length} permissions`);

  // Create roles and assign permissions
  for (const roleData of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });

    // Assign permissions based on role
    const permissionNames = getPermissionsForRole(roleData.name);
    const permissions = await prisma.permission.findMany({
      where: { name: { in: permissionNames } },
    });

    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
  console.log(`✅ Created ${SYSTEM_ROLES.length} roles with permissions`);
}

function getPermissionsForRole(roleName: string): string[] {
  switch (roleName) {
    case 'admin':
      return SYSTEM_PERMISSIONS.map(p => p.name);
    case 'sales_manager':
      return [
        'products.view',
        'orders.view', 'orders.create', 'orders.update', 'orders.cancel',
        'customers.view', 'customers.create', 'customers.update',
        'analytics.view', 'analytics.export',
      ];
    case 'sales_rep':
      return [
        'products.view',
        'orders.view', 'orders.create',
        'customers.view',
        'analytics.view',
      ];
    case 'portal_admin':
      return [
        'portal.access',
        'portal.cart',
        'portal.favorites',
        'portal.reports',
        'products.view',
        'orders.view', 'orders.create',
        'analytics.view',
      ];
    case 'portal_user':
      return [
        'portal.access',
        'portal.cart',
        'portal.favorites',
        'products.view',
        'orders.view', 'orders.create',
      ];
    default:
      return [];
  }
}

async function seedProducts(tenantId: string) {
  console.log('🌱 Seeding products...');

  for (const productData of SAMPLE_PRODUCTS) {
    await prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId,
          sku: productData.sku,
        },
      },
      update: {},
      create: {
        ...productData,
        tenantId,
      },
    });
  }
  console.log(`✅ Created ${SAMPLE_PRODUCTS.length} products`);
}

async function seedCustomers(tenantId: string) {
  console.log('🌱 Seeding customers...');

  for (const customerData of SAMPLE_CUSTOMERS) {
    await prisma.customer.upsert({
      where: {
        tenantId_accountNumber: {
          tenantId,
          accountNumber: customerData.accountNumber!,
        },
      },
      update: {},
      create: {
        ...customerData,
        tenantId,
      },
    });
  }
  console.log(`✅ Created ${SAMPLE_CUSTOMERS.length} customers`);
}

async function seedPortalUsers(tenantId: string) {
  console.log('🌱 Seeding portal users...');

  const portalRole = await prisma.role.findUnique({
    where: { name: 'portal_user' },
  });

  if (!portalRole) {
    console.error('❌ Portal user role not found');
    return;
  }

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
    take: 2,
  });

  const products = await prisma.product.findMany({
    where: { tenantId },
    take: 2,
  });

  if (customers.length === 0 || products.length === 0) {
    console.log('⚠️  Skipping demo orders: insufficient customers or products');
    return;
  }

  // Create sample order
  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: customers[0].id,
      orderNumber: `ORD-${Date.now()}`,
      status: 'DELIVERED',
      orderDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      actualDeliveryDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      subtotal: 1200.00,
      taxAmount: 108.00,
      shippingAmount: 0,
      discountAmount: 0,
      totalAmount: 1308.00,
      currency: 'USD',
      lines: {
        create: [
          {
            productId: products[0].id,
            lineNumber: 1,
            quantity: 12,
            unitPrice: 50.00,
            subtotal: 600.00,
            taxAmount: 54.00,
            totalAmount: 654.00,
          },
          {
            productId: products[1].id,
            lineNumber: 2,
            quantity: 12,
            unitPrice: 50.00,
            subtotal: 600.00,
            taxAmount: 54.00,
            totalAmount: 654.00,
          },
        ],
      },
    },
  });

  // Create sample invoice
  await prisma.invoice.create({
    data: {
      tenantId,
      customerId: customers[0].id,
      orderId: order.id,
      invoiceNumber: `INV-${Date.now()}`,
      status: 'PAID',
      invoiceDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      subtotal: 1200.00,
      taxAmount: 108.00,
      totalAmount: 1308.00,
      paidAmount: 1308.00,
      balanceDue: 0,
      currency: 'USD',
    },
  });

  console.log('✅ Created demo order and invoice');
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🚀 Starting Leora Platform seed...\n');

  try {
    // Seed in order
    const tenant = await seedTenant();
    await seedRolesAndPermissions();
    await seedProducts(tenant.id);
    await seedCustomers(tenant.id);
    await seedPortalUsers(tenant.id);
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
