/**
 * Authentication Middleware for Leora Platform
 *
 * Provides middleware and guard functions for protecting routes and API endpoints
 * with tenant-aware authentication and RBAC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, type TokenPayload } from './jwt';
import { hasPermission, requirePermission } from './rbac';

/**
 * Authentication middleware result
 */
export interface AuthMiddlewareResult {
  authenticated: boolean;
  user: TokenPayload | null;
  response?: NextResponse;
}

/**
 * Require authentication middleware
 * Returns 401 if not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthMiddlewareResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authenticated: false,
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      ),
    };
  }

  return {
    authenticated: true,
    user,
  };
}

/**
 * Require specific permission middleware
 * Returns 403 if user lacks permission
 */
export async function requireAuthWithPermission(
  request: NextRequest,
  requiredPermission: string
): Promise<AuthMiddlewareResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  if (!hasPermission(authResult.user.permissions, requiredPermission)) {
    return {
      authenticated: true,
      user: authResult.user,
      response: NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermission,
        },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * Require any of multiple permissions
 */
export async function requireAuthWithAnyPermission(
  request: NextRequest,
  requiredPermissions: string[]
): Promise<AuthMiddlewareResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  const hasAny = requiredPermissions.some((permission) =>
    hasPermission(authResult.user!.permissions, permission)
  );

  if (!hasAny) {
    return {
      authenticated: true,
      user: authResult.user,
      response: NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermissions,
        },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * Tenant validation middleware
 * Ensures request tenant matches user's tenant
 */
export async function validateTenant(
  request: NextRequest,
  expectedTenantSlug?: string
): Promise<AuthMiddlewareResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  // Get tenant from header or query parameter
  const tenantSlug =
    expectedTenantSlug ||
    request.headers.get('x-tenant-slug') ||
    request.nextUrl.searchParams.get('tenantSlug');

  if (tenantSlug && tenantSlug !== authResult.user.tenantSlug) {
    return {
      authenticated: true,
      user: authResult.user,
      response: NextResponse.json(
        {
          success: false,
          error: 'Tenant mismatch',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * Optional authentication middleware
 * Continues even if not authenticated (for public/guest access)
 */
export async function optionalAuth(
  request: NextRequest
): Promise<AuthMiddlewareResult> {
  const user = await getCurrentUser();

  return {
    authenticated: !!user,
    user,
  };
}

/**
 * API response wrapper with authentication
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: (user: TokenPayload) => Promise<T>
): Promise<NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult.response) {
    return authResult.response;
  }

  try {
    const result = await handler(authResult.user!);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * API response wrapper with permission check
 */
export async function withAuthAndPermission<T>(
  request: NextRequest,
  requiredPermission: string,
  handler: (user: TokenPayload) => Promise<T>
): Promise<NextResponse> {
  const authResult = await requireAuthWithPermission(request, requiredPermission);

  if (authResult.response) {
    return authResult.response;
  }

  try {
    const result = await handler(authResult.user!);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Portal-specific middleware (requires portal permissions)
 */
export async function requirePortalAuth(
  request: NextRequest
): Promise<AuthMiddlewareResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  // Ensure user has portalUserId (is a portal user)
  if (!authResult.user.portalUserId) {
    return {
      authenticated: true,
      user: authResult.user,
      response: NextResponse.json(
        {
          success: false,
          error: 'Portal access required',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * Extract tenant context from request
 */
export function getTenantContext(request: NextRequest): {
  tenantSlug?: string;
  tenantId?: string;
} {
  return {
    tenantSlug:
      request.headers.get('x-tenant-slug') ||
      request.nextUrl.searchParams.get('tenantSlug') ||
      undefined,
    tenantId:
      request.headers.get('x-tenant-id') ||
      request.nextUrl.searchParams.get('tenantId') ||
      undefined,
  };
}

/**
 * Extract user agent and IP for logging
 */
export function getRequestMetadata(request: NextRequest): {
  userAgent?: string;
  ipAddress?: string;
} {
  return {
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined,
  };
}
