/**
 * Logout API Route - POST /api/portal/auth/logout
 *
 * Terminates user session and clears authentication cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, clearAuthCookies } from '@/lib/auth/jwt';
import { getRequestMetadata } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get current user from token
    const user = await getCurrentUser();

    if (!user) {
      // Already logged out, just clear cookies
      await clearAuthCookies();
      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    }

    // Get request metadata
    const { userAgent, ipAddress } = getRequestMetadata(request);

    // Delete session from database
    if (user.sessionId) {
      await prisma.portalSession.deleteMany({
        where: {
          id: user.sessionId,
          portalUserId: user.portalUserId,
        },
      });
    }

    // Clear authentication cookies
    await clearAuthCookies();

    // TODO: Log logout activity (authActivityLog table not yet implemented)
    // await prisma.authActivityLog.create({
    //   data: {
    //     userId: user.userId,
    //     portalUserId: user.portalUserId,
    //     tenantId: user.tenantId,
    //     action: 'logout',
    //     ipAddress,
    //     userAgent,
    //     success: true,
    //     metadata: {
    //       sessionId: user.sessionId,
    //     },
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear cookies even if database operations fail
    await clearAuthCookies();

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during logout',
      },
      { status: 500 }
    );
  }
}

/**
 * Also support GET for convenience
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
