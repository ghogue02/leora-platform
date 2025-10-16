/**
 * Session Validation Route - GET /api/portal/auth/me
 *
 * Returns current user session data or 401 if not authenticated.
 * Used by PortalSessionProvider for session hydration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import type { AuthResponse, SessionUser } from '@/lib/auth/types';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get current user from access token
    const tokenPayload = await getCurrentUser();

    if (!tokenPayload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Fetch full user data from database
    const user = await prisma.portalUser.findUnique({
      where: {
        id: tokenPayload.portalUserId,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if user is still active
    if ((user as any).status !== 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Account is not active',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Update session activity
    if (tokenPayload.sessionId) {
      await prisma.portalSession.update({
        where: { id: tokenPayload.sessionId },
        data: { lastActiveAt: new Date() },
      });
    }

    // Build session user response
    const sessionUser: SessionUser = {
      id: tokenPayload.userId,
      portalUserId: tokenPayload.portalUserId || '',
      email: user.email,
      firstName: (user as any).firstName,
      lastName: (user as any).lastName,
      displayName:
        (user as any).displayName ||
        `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() ||
        user.email,
      tenantId: user.tenantId,
      tenantSlug: (user as any).tenant?.slug || tokenPayload.tenantSlug,
      roles: tokenPayload.roles,
      permissions: tokenPayload.permissions,
      sessionId: tokenPayload.sessionId,
      emailVerified: (user as any).emailVerified || false,
      lastLoginAt: (user as any).lastLoginAt,
    };

    const response: AuthResponse = {
      success: true,
      user: sessionUser,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate session',
      },
      { status: 500 }
    );
  }
}
