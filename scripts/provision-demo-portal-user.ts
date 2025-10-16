#!/usr/bin/env ts-node
/**
 * Provision Demo Portal User (Raw SQL version)
 *
 * This script is intentionally light-weight so it can run against legacy
 * production schemas where Prisma's model metadata may be out-of-sync.
 *
 * What it ensures:
 *   1. Tenant with slug `well-crafted` exists.
 *   2. `Portal User` role exists for that tenant.
 *   3. Required portal permissions exist and are linked to the role.
 *   4. Demo portal user (`demo@wellcrafted.com` / `password123`) exists and
 *      is assigned the Portal User role.
 *
 * Run with: `source .env && npx ts-node scripts/provision-demo-portal-user.ts`
 */

import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'well-crafted';
const DEMO_EMAIL = (process.env.DEMO_PORTAL_EMAIL || 'demo@wellcrafted.com').toLowerCase();
const DEMO_PASSWORD = process.env.DEMO_PORTAL_PASSWORD || 'password123';

const REQUIRED_PERMISSIONS: Array<{
  key: string;
  name: string;
  description: string;
  category: string;
}> = [
  {
    key: 'portal.access',
    name: 'Access Portal',
    description: 'Ability to sign in to the customer portal.',
    category: 'portal',
  },
  {
    key: 'portal.catalog.view',
    name: 'View Catalog',
    description: 'Browse available catalog products.',
    category: 'portal',
  },
  {
    key: 'portal.orders.view',
    name: 'View Orders',
    description: 'View historical and in-flight orders.',
    category: 'portal',
  },
  {
    key: 'portal.insights.view',
    name: 'View Insights',
    description: 'Access analytics dashboard insights.',
    category: 'portal',
  },
  {
    key: 'portal.reports.view',
    name: 'View Reports',
    description: 'Access generated business reports.',
    category: 'portal',
  },
];

async function ensureTenant(): Promise<string> {
  const result = (await prisma.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM tenants WHERE slug = ${TENANT_SLUG} LIMIT 1`);

  if (result.length > 0) {
    console.log(`ℹ️  Tenant '${TENANT_SLUG}' already exists`);
    return result[0].id;
  }

  const tenantId = randomUUID();
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO tenants (id, name, slug, status, "createdAt", "updatedAt", "subscriptionTier")
    VALUES (${tenantId}, ${'Well Crafted'}, ${TENANT_SLUG}, ${'ACTIVE'}, ${now}, ${now}, ${'starter'})
  `;

  console.log(`✅ Created tenant '${TENANT_SLUG}' (id=${tenantId})`);
  return tenantId;
}

async function ensurePortalRole(tenantId: string): Promise<string> {
  const existingRole = (await prisma.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM roles WHERE "tenantId" = ${tenantId} AND name = ${'Portal User'} LIMIT 1`);

  if (existingRole.length > 0) {
    console.log('ℹ️  Portal User role already exists');
    return existingRole[0].id;
  }

  const roleId = randomUUID();
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO roles (id, "tenantId", name, description, "roleType", "isDefault", "isSystem", "createdAt", "updatedAt")
    VALUES (${roleId}, ${tenantId}, ${'Portal User'}, ${'Default customer portal user role'}, ${'PORTAL'}, ${true}, ${true}, ${now}, ${now})
  `;

  console.log(`✅ Created Portal User role (id=${roleId})`);
  return roleId;
}

async function ensurePermissions(tenantId: string, roleId: string) {
  const now = new Date();

  for (const perm of REQUIRED_PERMISSIONS) {
    const existing = (await prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM permissions WHERE "tenantId" = ${tenantId} AND key = ${perm.key} LIMIT 1`);

    let permissionId: string;
    if (existing.length > 0) {
      permissionId = existing[0].id;
    } else {
      permissionId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO permissions (id, "tenantId", key, name, description, category, "createdAt", "updatedAt")
        VALUES (${permissionId}, ${tenantId}, ${perm.key}, ${perm.name}, ${perm.description}, ${perm.category}, ${now}, ${now})
      `;
      console.log(`✅ Created permission ${perm.key}`);
    }

    const rolePermission = await prisma.$queryRaw<
      Array<{ exists: boolean }>
    >`SELECT true as exists FROM role_permissions WHERE "roleId" = ${roleId} AND "permissionId" = ${permissionId} LIMIT 1`;

    if (rolePermission.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO role_permissions ("roleId", "permissionId", "assignedAt", "tenantId")
        VALUES (${roleId}, ${permissionId}, ${now}, ${tenantId})
      `;
    }
  }
}

async function ensurePortalUser(tenantId: string, roleId: string) {
  const existing = (await prisma.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM portal_users WHERE email = ${DEMO_EMAIL} LIMIT 1`);

  if (existing.length > 0) {
    console.log(`ℹ️  Portal user ${DEMO_EMAIL} already exists`);
    const linkExists = await prisma.$queryRaw<
      Array<{ exists: boolean }>
    >`SELECT true as exists FROM portal_user_roles WHERE "portalUserId" = ${existing[0].id} AND "roleId" = ${roleId} LIMIT 1`;

    if (linkExists.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO portal_user_roles (id, "portalUserId", "roleId", "assignedAt")
        VALUES (${randomUUID()}, ${existing[0].id}, ${roleId}, ${new Date()})
      `;
    }
    return;
  }

  const now = new Date();
  const userId = randomUUID();
  const passwordHash = hashSync(DEMO_PASSWORD, 10);

  await prisma.$executeRaw`
    INSERT INTO portal_users (
      id, "tenantId", email, "passwordHash", status, active,
      "emailVerified", "emailVerifiedAt", "firstName", "lastName", "fullName",
      role, "createdAt", "updatedAt", "failedLoginAttempts"
    )
    VALUES (
      ${userId}, ${tenantId}, ${DEMO_EMAIL}, ${passwordHash}, ${'ACTIVE'}, ${true},
      ${true}, ${now}, ${'Demo'}, ${'User'}, ${'Demo User'},
      CAST(${ 'PURCHASER' } AS "PortalUserRole"), ${now}, ${now}, ${0}
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO portal_user_roles (id, "portalUserId", "roleId", "assignedAt")
    VALUES (${randomUUID()}, ${userId}, ${roleId}, ${now})
  `;

  console.log(`✅ Created portal user ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
}

async function main() {
  console.log('🚀 Provisioning demo portal user…');
  const tenantId = await ensureTenant();
  const roleId = await ensurePortalRole(tenantId);
  await ensurePermissions(tenantId, roleId);
  await ensurePortalUser(tenantId, roleId);
  console.log('✅ Demo portal user provisioning complete.');
}

main()
  .catch((error) => {
    console.error('❌ Provisioning failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
