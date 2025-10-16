/**
 * Password Reset Routes
 *
 * POST /api/portal/auth/reset-password - Request password reset
 * PUT /api/portal/auth/reset-password - Confirm reset with token
 */

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import {
  passwordResetRequestSchema,
  passwordResetSchema,
} from '@/lib/auth/types';
import { prisma } from '@/lib/prisma';
import { generateTokenPair, hashToken, isExpired } from '@/lib/auth/token-utils';

/**
 * Request password reset - POST
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = passwordResetRequestSchema.safeParse(body);

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

    const { email, tenantSlug } = validation.data;
    // Resolve tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        slug: tenantSlug || process.env.DEFAULT_TENANT_SLUG || 'well-crafted',
      },
    });

    if (!tenant) {
      // Don't reveal whether user exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent',
      });
    }

    // Find user
    const user = await prisma.portalUser.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId: tenant.id,
      },
    });

    if (!user) {
      // Don't reveal whether user exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent',
      });
    }

    const { token: resetToken, hashedToken, expiresAt } = generateTokenPair(60);

    // Save token to user
    await prisma.portalUser.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiresAt,
      },
    });

    // TODO: Log activity (authActivityLog table not yet implemented)
    // await prisma.authActivityLog.create({
    //   data: {
    //     portalUserId: user.id,
    //     tenantId: tenant.id,
    //     action: 'password_reset_requested',
    //     ipAddress,
    //     userAgent,
    //     success: true,
    //     metadata: {
    //       email: user.email,
    //     },
    //   },
    // });

    // TODO: Send reset email
    // await sendPasswordResetEmail(user.email, resetToken);
    if (process.env.NODE_ENV !== 'production') {
      console.info('[Auth] Password reset token for %s: %s', user.email, resetToken);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred processing your request',
      },
      { status: 500 }
    );
  }
}

/**
 * Confirm password reset - PUT
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = passwordResetSchema.safeParse(body);

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

    const { token, password } = validation.data;
    const hashedToken = hashToken(token);

    // Find user with valid reset token
    const user = await prisma.portalUser.findFirst({
      where: {
        passwordResetToken: hashedToken,
      },
    });

    if (!user || isExpired(user.passwordResetExpiry)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired reset token',
        },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hash(password, 12);

    // Update user password and clear reset token
    await prisma.portalUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate all existing sessions
    await prisma.portalSession.deleteMany({
      where: { portalUserId: user.id },
    });

    // TODO: Log activity (authActivityLog table not yet implemented)
    // await prisma.authActivityLog.create({
    //   data: {
    //     portalUserId: user.id,
    //     tenantId: user.tenantId,
    //     action: 'password_reset',
    //     ipAddress,
    //     userAgent,
    //     success: true,
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred resetting your password',
      },
      { status: 500 }
    );
  }
}
