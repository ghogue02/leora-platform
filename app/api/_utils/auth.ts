/**
 * Authentication & Authorization Utilities
 * Provides RBAC and user context extraction
 */

import { NextRequest } from 'next/server';
import { withPortalUserFromRequest as prismaWithPortalUserFromRequest, type PortalUserContext } from '@/lib/prisma';
import { errorResponse } from './response';

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  customerId?: string | null;
  companyId?: string;
  tenantId: string;
}

export interface AuthContext {
  user: PortalUser;
  tenantId: string;
}

/**
 * Extract portal user from request (JWT or session)
 * Delegates to Prisma helper for actual user resolution with RBAC
 */
export async function withPortalUserFromRequest(
  request: NextRequest,
  options?: {
    requirePermissions?: string[];
    autoProvision?: boolean;
  }
): Promise<PortalUser> {
  try {
    console.log('[Auth] Extracting user from request:', {
      url: request.url,
      method: request.method,
      requiredPermissions: options?.requirePermissions,
    });

    const context = await prismaWithPortalUserFromRequest(request, options);

    console.log('[Auth] User authenticated successfully:', {
      userId: context.portalUserId,
      email: context.email,
      tenantId: context.tenantId,
      roles: context.roles,
      permissionCount: context.permissions.length,
    });

    return {
      id: context.portalUserId,
      email: context.email,
      name: context.email.split('@')[0], // Fallback name
      role: context.roles[0] || 'portal_user',
      permissions: context.permissions,
      customerId: context.customerId,
      tenantId: context.tenantId,
    };
  } catch (error) {
    console.error('[Auth] Failed to extract user:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      url: request.url,
    });
    throw error;
  }
}

/**
 * Require authenticated user or throw error
 */
export async function requireAuth(request: NextRequest): Promise<PortalUser> {
  const user = await withPortalUserFromRequest(request);

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: PortalUser, permission: string): boolean {
  // Check for wildcard permission
  if (user.permissions.includes('portal.*')) {
    return true;
  }

  // Check for exact permission
  if (user.permissions.includes(permission)) {
    return true;
  }

  // Check for parent wildcard (e.g., portal.orders.* matches portal.orders.read)
  const parts = permission.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const wildcardPerm = parts.slice(0, i).join('.') + '.*';
    if (user.permissions.includes(wildcardPerm)) {
      return true;
    }
  }

  return false;
}

/**
 * Require specific permission or throw error
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<PortalUser> {
  const user = await withPortalUserFromRequest(request, {
    requirePermissions: [permission],
  });

  return user;
}
