/**
 * Tenant Isolation Middleware
 * Ensures all API requests are properly scoped to a tenant
 */

import { NextRequest } from 'next/server';
import { withTenantFromRequest as prismaWithTenantFromRequest, type TenantContext } from '@/lib/prisma';
import { errorResponse } from './response';

export type { TenantContext };

/**
 * Extract tenant from request headers
 * Delegates to Prisma helper for actual tenant resolution
 */
export async function withTenantFromRequest(
  request: NextRequest
): Promise<TenantContext> {
  return await prismaWithTenantFromRequest(request);
}

/**
 * Require tenant context or throw error
 */
export async function requireTenant(request: NextRequest): Promise<TenantContext> {
  const tenant = await withTenantFromRequest(request);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
}

/**
 * Set tenant context for Prisma queries
 * This should be called before any database operations
 */
export function setTenantContext(tenantId: string) {
  // This will be used with Prisma middleware
  // Example: await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`
  return tenantId;
}
