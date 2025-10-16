/**
 * Token Refresh Route - POST /api/portal/auth/refresh
 *
 * Issues new access token using valid refresh token.
 * Called automatically by PortalSessionProvider when access token expires.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  generateAccessToken,
  setAccessTokenCookie,
  type TokenUser,
} from '@/lib/auth/jwt';
import { getPermissionsForRoles } from '@/lib/auth/rbac';
import { getRequestMetadata } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify refresh token
    const refreshPayload = await verifyRefreshToken();

    if (!refreshPayload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired refresh token',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Get request metadata
    const { userAgent, ipAddress } = getRequestMetadata(request);

    // Verify session exists and is valid
    if (refreshPayload.sessionId) {
      const session = await prisma.portalSession.findFirst({
        where: {
          id: refreshPayload.sessionId,
          portalUserId: refreshPayload.portalUserId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!session) {
        return NextResponse.json(
          {
            success: false,
            error: 'Session not found or expired',
            code: 'UNAUTHORIZED',
          },
          { status: 401 }
        );
      }

      // Update session activity
      await prisma.portalSession.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      });
    }

    // Fetch current user data
    const user = await prisma.portalUser.findUnique({
      where: {
        id: refreshPayload.portalUserId,
      },
      include: {
        tenant: true,
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

    // Get current roles and permissions
    const roles = (user as any).roleAssignments?.map((ra: any) => ra.role.name) || ['portal_customer'];
    const permissions =
      (user as any).roleAssignments?.flatMap((ra: any) =>
        ra.role.rolePermissions?.map((rp: any) => rp.permission.name)
      ) || getPermissionsForRoles(roles);

    // Generate new access token with fresh permissions
    const tokenUser: TokenUser = {
      id: (user as any).userId || user.id,
      portalUserId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: (user as any).tenant?.slug || '',
      roles,
      permissions,
    };

    const accessToken = await generateAccessToken(
      tokenUser,
      refreshPayload.sessionId
    );

    // Set new access token cookie
    await setAccessTokenCookie(accessToken);

    // TODO: Log refresh activity (authActivityLog table not yet implemented)
    // await prisma.authActivityLog.create({
    //   data: {
    //     userId: tokenUser.id,
    //     portalUserId: user.id,
    //     tenantId: user.tenantId,
    //     action: 'token_refresh',
    //     ipAddress,
    //     userAgent,
    //     success: true,
    //     metadata: {
    //       sessionId: refreshPayload.sessionId,
    //     },
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh token',
      },
      { status: 500 }
    );
  }
}
