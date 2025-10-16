/**
 * Email Verification Route - POST /api/portal/auth/verify-email
 *
 * Verifies user email address with token from registration email.
 */

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { emailVerificationSchema, type AuthResponse } from '@/lib/auth/types';
import { getRequestMetadata } from '@/lib/auth/middleware';
import { getPermissionsForRoles } from '@/lib/auth/rbac';
import {
  generateTokenPair,
  setAuthCookies,
  type TokenUser,
  REFRESH_TOKEN_MAX_AGE,
} from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { hashToken, isExpired } from '@/lib/auth/token-utils';

export async function POST(request: NextRequest) {
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
    const hashedToken = hashToken(token);
    const { userAgent, ipAddress } = getRequestMetadata(request);

    const user = await prisma.portalUser.findFirst({
      where: {
        emailVerificationToken: hashedToken,
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

    if (!user || isExpired(user.emailVerificationExpiry)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired verification token',
        },
        { status: 400 }
      );
    }

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

    const roles =
      user.roleAssignments?.map((assignment) => assignment.role.name) || [];
    const permissions =
      user.roleAssignments?.flatMap((assignment) =>
        assignment.role.rolePermissions?.map((rp) => rp.permission.key)
      ) || getPermissionsForRoles(roles);

    const sessionId = randomUUID();
    const { accessToken, refreshToken } = await generateTokenPair(
      {
        id: (user as any).userId || user.id,
        portalUserId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug || '',
        roles,
        permissions,
      },
      sessionId
    );

    const sessionExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

    await prisma.portalSession.create({
      data: {
        id: sessionId,
        portalUserId: user.id,
        accessToken,
        ipAddress,
        userAgent,
        expiresAt: sessionExpiry,
      },
    });

    await setAuthCookies(accessToken, refreshToken);

    const response: AuthResponse = {
      success: true,
      message: 'Email verified successfully',
      user: {
        id: (user as any).userId || user.id,
        portalUserId: user.id,
        email: user.email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        displayName:
          (user as any).displayName ||
          `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() ||
          user.email,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug || '',
        roles,
        permissions,
        sessionId,
        emailVerified: true,
      },
    };

    return NextResponse.json(response);
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
}
