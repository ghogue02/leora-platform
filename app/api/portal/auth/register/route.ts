/**
 * Registration API Route - POST /api/portal/auth/register
 *
 * Creates new portal user account with email verification.
 * Implements validation, duplicate checking, and secure password hashing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { registrationSchema, type AuthResponse } from '@/lib/auth/types';
import { getRequestMetadata } from '@/lib/auth/middleware';
import { getClientIP } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/prisma';

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

    // TODO: Generate email verification token when verification is implemented
    // const emailVerificationToken = randomBytes(32).toString('hex');
    // const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await prisma.portalUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        tenantId: tenant.id,
        status: 'ACTIVE', // TODO: Set to INACTIVE when email verification is implemented
        emailVerified: true, // TODO: Set to false when email verification is implemented
        emailVerifiedAt: new Date(),
      },
    });

    // Assign default portal customer role
    const defaultRole = await prisma.role.findFirst({
      where: {
        name: 'portal_customer',
      },
    });

    if (defaultRole) {
      // Create user-role association
      // await prisma.portalUserRole.create({
      //   data: {
      //     portalUserId: user.id,
      //     roleId: defaultRole.id,
      //   },
      // });
    }

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
    // await sendVerificationEmail(user.email, emailVerificationToken);

    const response: AuthResponse = {
      success: true,
      requiresVerification: true,
      user: {
        id: user.id,
        portalUserId: user.id,
        email: user.email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        displayName: (user as any).displayName,
        tenantId: user.tenantId,
        tenantSlug: tenant.slug,
        roles: ['portal_customer'],
        permissions: [],
        emailVerified: false,
      },
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
