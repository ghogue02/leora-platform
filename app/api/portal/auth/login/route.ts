/**
 * Login API Route - POST /api/portal/auth/login
 *
 * Authenticates portal users with email/password credentials.
 * Implements rate limiting, account lockout, and session management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { loginSchema, type AuthResponse } from '@/lib/auth/types';
import {
  generateTokenPair,
  setAuthCookies,
  type TokenUser,
  REFRESH_TOKEN_MAX_AGE,
} from '@/lib/auth/jwt';
import {
  getSecurityStatus,
  recordSuccessfulLogin,
  recordFailedLogin,
  getClientIP,
} from '@/lib/auth/rate-limit';
import { getPermissionsForRoles } from '@/lib/auth/rbac';
import { getRequestMetadata } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials format',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password, tenantSlug } = validation.data;

    // Get client metadata
    const { userAgent, ipAddress } = getRequestMetadata(request);
    const clientIP = ipAddress || getClientIP(request.headers);

    // Check rate limiting and account lockout
    const emailIdentifier = `login:email:${email.toLowerCase()}`;
    const ipIdentifier = `login:ip:${clientIP}`;
    const securityStatus = getSecurityStatus(ipIdentifier, emailIdentifier);

    if (!securityStatus.canProceed) {
      // Log failed attempt
      await logAuthActivity({
        action: 'login_failed',
        email,
        tenantSlug,
        ipAddress: clientIP,
        userAgent,
        success: false,
        errorMessage: securityStatus.reason,
      });

      return NextResponse.json(
        {
          success: false,
          error: securityStatus.reason,
          lockoutStatus: securityStatus.lockoutStatus,
          rateLimitStatus: securityStatus.rateLimitStatus,
        },
        { status: 429 }
      );
    }

    // Query user from database
    const user = await prisma.portalUser.findFirst({
      where: {
        email: email.toLowerCase(),
        ...(tenantSlug && {
          tenant: {
            slug: tenantSlug,
          },
        }),
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
      // Record failed login
      const { lockoutStatus } = recordFailedLogin(ipIdentifier, emailIdentifier);

      await logAuthActivity({
        action: 'login_failed',
        email,
        tenantSlug,
        ipAddress: clientIP,
        userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
          remainingAttempts: lockoutStatus.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Verify password (assuming user.passwordHash exists)
    const passwordHash = (user as any).passwordHash;
    if (!passwordHash) {
      const { lockoutStatus } = recordFailedLogin(ipIdentifier, emailIdentifier);

      await logAuthActivity({
        action: 'login_failed',
        email,
        tenantSlug,
        ipAddress: clientIP,
        userAgent,
        success: false,
        errorMessage: 'Account missing password hash',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
          remainingAttempts: lockoutStatus.remainingAttempts,
        },
        { status: 401 }
      );
    }

    const isValidPassword = await compare(password, passwordHash);

    if (!isValidPassword) {
      const { lockoutStatus } = recordFailedLogin(ipIdentifier, emailIdentifier);

      await logAuthActivity({
        action: 'login_failed',
        email,
        tenantSlug: user.tenant?.slug,
        ipAddress: clientIP,
        userAgent,
        success: false,
        errorMessage: 'Invalid password',
        userId: user.id,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
          remainingAttempts: lockoutStatus.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Check if account is active
    if ((user as any).status !== 'ACTIVE') {
      await logAuthActivity({
        action: 'login_failed',
        email,
        tenantSlug: user.tenant?.slug,
        ipAddress: clientIP,
        userAgent,
        success: false,
        errorMessage: 'Account inactive',
        userId: user.id,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Account is not active. Please contact support.',
        },
        { status: 403 }
      );
    }

    // Extract roles and permissions
    const roles = user.roleAssignments?.map((ra) => ra.role.name) || ['portal_customer'];
    const permissions =
      user.roleAssignments?.flatMap((ra) =>
        ra.role.rolePermissions?.map((rp) => rp.permission.name)
      ) || getPermissionsForRoles(roles);

    // Generate tokens
    const tokenUser: TokenUser = {
      id: (user as any).userId || user.id,
      portalUserId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug || '',
      roles,
      permissions,
    };

    const sessionId = randomUUID();
    const { accessToken, refreshToken } = await generateTokenPair(
      tokenUser,
      sessionId
    );

    const sessionExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

    await prisma.portalSession.create({
      data: {
        id: sessionId,
        portalUserId: user.id,
        accessToken,
        ipAddress: clientIP,
        userAgent,
        expiresAt: sessionExpiry,
      },
    });

    // Set auth cookies
    await setAuthCookies(accessToken, refreshToken);

    // Update user's last login
    await prisma.portalUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Clear failed attempts
    recordSuccessfulLogin(ipIdentifier, emailIdentifier);

    // Log successful login
    await logAuthActivity({
      action: 'login',
      email,
      tenantSlug: user.tenant?.slug,
      ipAddress: clientIP,
      userAgent,
      success: true,
      userId: user.id,
      sessionId,
    });

    // Return user data
    const response: AuthResponse = {
      success: true,
      user: {
        id: tokenUser.id,
        portalUserId: user.id,
        email: user.email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        displayName: (user as any).displayName || `${(user as any).firstName} ${(user as any).lastName}`,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug || '',
        roles,
        permissions,
        sessionId,
        emailVerified: (user as any).emailVerified || false,
        lastLoginAt: new Date(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during login',
      },
      { status: 500 }
    );
  }
}

/**
 * Log authentication activity
 */
async function logAuthActivity(data: {
  action: string;
  email: string;
  tenantSlug?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
}) {
  // TODO: Implement authActivityLog model in Prisma schema
  // For now, just log to console
  console.log('[Auth Activity]', {
    action: data.action,
    email: data.email,
    success: data.success,
    errorMessage: data.errorMessage,
  });
}
