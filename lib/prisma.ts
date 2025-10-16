/**
 * Leora Platform - Prisma Client & Multi-Tenancy Helpers
 *
 * Provides:
 * - Singleton Prisma client with connection pooling
 * - withTenant: Set tenant context for transaction
 * - withTenantFromRequest: Extract tenant from headers/cookies
 * - withPortalUserFromRequest: Extract portal user with RBAC
 */

import { PrismaClient } from '@prisma/client';
import type { NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  type TokenPayload,
  verifyToken,
} from '@/lib/auth/jwt';

// Environment configuration
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'well-crafted';

// Extend Prisma client with custom methods
declare global {
  var prisma: PrismaClient | undefined;
}

// Connection pooling configuration
export const prisma = global.prisma || new PrismaClient({
  log: NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

if (NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Types
export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
}

export interface PortalUserContext extends TenantContext {
  portalUserId: string;
  customerId: string | null;
  email: string;
  roles: string[];
  permissions: string[];
}

// ============================================================================
// MULTI-TENANCY HELPERS
// ============================================================================

/**
 * Execute Prisma operations within tenant context
 * Sets app.current_tenant_id session parameter for RLS enforcement
 *
 * @example
 * const products = await withTenant(tenantId, async (tx) => {
 *   return tx.product.findMany({ where: { status: 'ACTIVE' } });
 * });
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  if (!tenantId) {
    throw new Error('Tenant ID is required for database operations');
  }

  return await prisma.$transaction(async (tx) => {
    // Set tenant context in PostgreSQL session
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${tenantId}'`
    );

    return await callback(tx as PrismaClient);
  });
}

/**
 * Extract tenant context from Next.js request
 * Checks headers, cookies, and falls back to default tenant
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const context = await withTenantFromRequest(request);
 *   const products = await withTenant(context.tenantId, async (tx) => {
 *     return tx.product.findMany();
 *   });
 * }
 */
export async function withTenantFromRequest(
  request: NextRequest
): Promise<TenantContext> {
  // Check tenant slug from header
  let tenantSlug = request.headers.get('x-tenant-slug') ||
                   request.headers.get('x-tenant') ||
                   request.cookies.get('tenant-slug')?.value ||
                   DEFAULT_TENANT_SLUG;

  // Prefer tenant from access token when available
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    const payload = await verifyToken(accessToken);
    if (payload?.type === 'access' && payload.tenantSlug) {
      tenantSlug = payload.tenantSlug;
    }
  }

  // Resolve tenant from database
  const tenant = await prisma.tenant.findFirst({
    where: {
      slug: tenantSlug,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      slug: true,
      status: true,
    },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };
}

/**
 * Extract portal user context with tenant and RBAC
 * Auto-provisions demo portal users in development
 * Enforces role-based access control
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const context = await withPortalUserFromRequest(request);
 *   const orders = await withTenant(context.tenantId, async (tx) => {
 *     return tx.order.findMany({
 *       where: { portalUserId: context.portalUserId }
 *     });
 *   });
 * }
 */
export async function withPortalUserFromRequest(
  request: NextRequest,
  options: {
    requirePermissions?: string[];
    autoProvision?: boolean;
  } = {}
): Promise<PortalUserContext> {
  const { requirePermissions = [], autoProvision = true } = options;

  // Get tenant context first
  const tenantContext = await withTenantFromRequest(request);

  // Attempt to resolve user from JWT access token
  let portalUserId =
    request.headers.get('x-portal-user-id') ||
    request.cookies.get('portal-user-id')?.value;
  let portalUserEmail =
    request.headers.get('x-portal-user-email') ||
    request.headers.get('x-user-email') ||
    request.cookies.get('portal-user-email')?.value ||
    process.env.DEFAULT_PORTAL_USER_EMAIL;

  let tokenPayload: TokenPayload | null = null;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    tokenPayload = await verifyToken(accessToken);
    if (tokenPayload?.type === 'access') {
      portalUserId = tokenPayload.portalUserId || portalUserId;
      portalUserEmail = tokenPayload.email || portalUserEmail;

      // Ensure tenant alignment (defensive)
      if (
        tokenPayload.tenantId &&
        tokenPayload.tenantId !== tenantContext.tenantId
      ) {
        throw new Error('Tenant mismatch for authenticated user');
      }
    }
  }

  if (!portalUserEmail && !portalUserId) {
    throw new Error('Portal user authentication required');
  }

  // Find or create portal user
  let portalUser = await prisma.portalUser.findFirst({
    where: {
      tenantId: tenantContext.tenantId,
      ...(portalUserId ? { id: portalUserId } : { email: portalUserEmail }),
      status: 'ACTIVE',
    },
    include: {
      customer: true,
      roleAssignments: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Auto-provision portal user in development
  if (!portalUser && autoProvision && NODE_ENV === 'development' && portalUserEmail) {
    portalUser = await autoProvisionPortalUser(
      tenantContext.tenantId,
      portalUserEmail
    );
  }

  if (!portalUser) {
    throw new Error('Portal user not found or inactive');
  }

  // Build permissions array
  const permissions = new Set<string>();
  const roles = new Set<string>();

  portalUser.roleAssignments.forEach(assignment => {
    roles.add(assignment.role.name);
    assignment.role.rolePermissions.forEach(rp => {
      permissions.add(rp.permission.name);
    });
  });

  // Check required permissions
  if (requirePermissions.length > 0) {
    const hasPermissions = requirePermissions.every(p => permissions.has(p));
    if (!hasPermissions) {
      throw new Error(`Missing required permissions: ${requirePermissions.join(', ')}`);
    }
  }

  return {
    ...tenantContext,
    portalUserId: portalUser.id,
    customerId: portalUser.customerId,
    email: portalUser.email,
    roles: Array.from(roles),
    permissions: Array.from(permissions),
  };
}

/**
 * Auto-provision portal user for development/demo
 * Creates user with default portal role
 */
async function autoProvisionPortalUser(
  tenantId: string,
  email: string
): Promise<any> {
  console.log(`Auto-provisioning portal user: ${email} for tenant: ${tenantId}`);

  // Find or create default portal role
  let portalRole = await prisma.role.findFirst({
    where: {
      tenantId,
      name: 'Portal User',
    },
  });

  if (!portalRole) {
    portalRole = await prisma.role.create({
      data: {
        tenantId,
        name: 'Portal User',
        description: 'Default customer portal user role',
        roleType: 'PORTAL',
        isDefault: false,
        isSystem: true,
      },
    });
  }

  // Create portal user
  const portalUser = await prisma.portalUser.create({
    data: {
      tenantId,
      email,
      firstName: 'Demo',
      lastName: 'User',
      fullName: 'Demo User',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      roleAssignments: {
        create: {
          roleId: portalRole.id,
        },
      },
    },
    include: {
      roleAssignments: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      customer: true,
    },
  });

  return portalUser;
}

// ============================================================================
// CONNECTION HEALTH & UTILITIES
// ============================================================================

/**
 * Check database connection health
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string) {
  return await prisma.tenant.findFirst({
    where: {
      slug,
      status: 'ACTIVE',
    },
    include: {
      settings: true,
    },
  });
}

/**
 * Get tenant settings
 */
export async function getTenantSettings(tenantId: string) {
  return await prisma.tenantSettings.findUnique({
    where: { tenantId },
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class TenantNotFoundError extends Error {
  constructor(slug: string) {
    super(`Tenant not found: ${slug}`);
    this.name = 'TenantNotFoundError';
  }
}

export class PortalUserNotFoundError extends Error {
  constructor(email: string) {
    super(`Portal user not found: ${email}`);
    this.name = 'PortalUserNotFoundError';
  }
}

export class InsufficientPermissionsError extends Error {
  constructor(required: string[]) {
    super(`Missing required permissions: ${required.join(', ')}`);
    this.name = 'InsufficientPermissionsError';
  }
}

// Export types
export * from '@prisma/client';
