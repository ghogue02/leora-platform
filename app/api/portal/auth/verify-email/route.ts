/**
 * Email Verification Route - POST /api/portal/auth/verify-email
 *
 * Verifies user email address with token from registration email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailVerificationSchema } from '@/lib/auth/types';
import { getRequestMetadata } from '@/lib/auth/middleware';
import { getPermissionsForRoles } from '@/lib/auth/rbac';
import {
  generateTokenPair,
  setAuthCookies,
  type TokenUser,
} from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  // TODO: Implement email verification once schema includes verification token fields
  return NextResponse.json(
    {
      success: false,
      error: 'Email verification not yet implemented',
      code: 'NOT_IMPLEMENTED',
    },
    { status: 501 }
  );

  /* Disabled until schema includes emailVerificationToken and emailVerificationExpiry fields
  try {
    const body = await request.json();
    const validation = emailVerificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { token } = validation.data;
    const { userAgent, ipAddress } = getRequestMetadata(request);

    // Find user with valid verification token
    const user = await prisma.portalUser.findFirst({
      where: {
        // emailVerificationToken: token,
        // emailVerificationExpiry: {
        //   gt: new Date(),
        // },
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
          error: 'Invalid or expired verification token',
        },
        { status: 400 }
      );
    }

    // Update user verification status
    await prisma.portalUser.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
    });

    // TODO: Log verification activity (authActivityLog table not yet implemented)
    // await prisma.authActivityLog.create({
    //   data: {
    //     portalUserId: user.id,
    //     tenantId: user.tenantId,
    //     action: 'email_verified',
    //     ipAddress,
    //     userAgent,
    //     success: true,
    //     metadata: {
    //       email: user.email,
    //     },
    //   },
    // });

    // Auto-login: Create session and issue tokens
    const roles = (user as any).roleAssignments?.map((ra: any) => ra.role.name) || ['portal_customer'];
    const permissions =
      (user as any).roleAssignments?.flatMap((ra: any) =>
        ra.role.rolePermissions?.map((rp: any) => rp.permission.name)
      ) || getPermissionsForRoles(roles);

    const session = await prisma.portalSession.create({
      data: {
        portalUserId: user.id,
        tenantId: user.tenantId,
        accessToken: '',
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActiveAt: new Date(),
      },
    });

    const tokenUser: TokenUser = {
      id: (user as any).userId || user.id,
      portalUserId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: (user as any).tenant?.slug || '',
      roles,
      permissions,
    };

    const { accessToken, refreshToken } = await generateTokenPair(
      tokenUser,
      session.id
    );

    await setAuthCookies(accessToken, refreshToken);

    // Update session with tokens
    await prisma.portalSession.update({
      where: { id: session.id },
      data: {
        accessToken,
        refreshToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: tokenUser.id,
        portalUserId: user.id,
        email: user.email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        displayName: (user as any).displayName,
        tenantId: user.tenantId,
        tenantSlug: (user as any).tenant?.slug || '',
        roles,
        permissions,
        sessionId: session.id,
        emailVerified: true,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred verifying your email',
      },
      { status: 500 }
    );
  }
  */
}
