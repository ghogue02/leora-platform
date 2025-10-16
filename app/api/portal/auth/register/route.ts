/**
 * Registration API Route - POST /api/portal/auth/register
 *
 * Creates new portal user account with email verification.
 * Implements validation, duplicate checking, and secure password hashing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { registrationSchema, type AuthResponse } from '@/lib/auth/types';
import { getRequestMetadata } from '@/lib/auth/middleware';
import { getClientIP } from '@/lib/auth/rate-limit';
import { ensureDefaultPortalRole, prisma } from '@/lib/prisma';
import { generateTokenPair } from '@/lib/auth/token-utils';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = registrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid registration data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      phoneNumber,
      tenantSlug,
    } = validation.data;

    // Get client metadata
    const { userAgent, ipAddress } = getRequestMetadata(request);
    const clientIP = ipAddress || getClientIP(request.headers);

    // Resolve tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        slug: tenantSlug || process.env.DEFAULT_TENANT_SLUG || 'well-crafted',
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tenant',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.portalUser.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId: tenant.id,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists',
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Generate email verification token (24 hour TTL)
    const { token: verificationToken, hashedToken, expiresAt } = generateTokenPair(24 * 60);

    // Create user
    const user = await prisma.portalUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        tenantId: tenant.id,
        phone: phoneNumber,
        status: 'PENDING',
        emailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: expiresAt,
      },
    });

    // Assign default portal customer role
    const portalRole = await ensureDefaultPortalRole(tenant.id);
    await prisma.portalUserRole.create({
      data: {
        portalUserId: user.id,
        roleId: portalRole.id,
      },
    });

    // TODO: Log registration activity (authActivityLog table not yet implemented)
    // await prisma.authActivityLog.create({
    //   data: {
    //     portalUserId: user.id,
    //     tenantId: tenant.id,
    //     action: 'register',
    //     ipAddress: clientIP,
    //     userAgent,
    //     success: true,
    //     metadata: {
    //       email: user.email,
    //       requiresVerification: true,
    //     },
    //   },
    // });

    // TODO: Send verification email
    // await sendVerificationEmail(user.email, verificationToken);
    if (process.env.NODE_ENV !== 'production') {
      console.info('[Auth] Verification token generated for %s: %s', user.email, verificationToken);
    }

    const response: AuthResponse = {
      success: true,
      requiresVerification: true,
      user: {
        id: user.id,
        portalUserId: user.id,
        email: user.email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        displayName:
          (user as any).displayName ||
          `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() ||
          user.email,
        tenantId: user.tenantId,
        tenantSlug: tenant.slug,
        roles: [portalRole.name],
        permissions: [],
        emailVerified: false,
      },
      verificationToken:
        process.env.NODE_ENV !== 'production' ? verificationToken : undefined,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during registration',
      },
      { status: 500 }
    );
  }
}
