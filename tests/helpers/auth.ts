/**
 * Authentication test helpers
 * Utilities for creating test tokens and mocking auth flows
 */

import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

export interface TestTokenPayload {
  userId?: string;
  email?: string;
  tenantId?: string;
  portalUserId?: string;
  role?: string;
  permissions?: string[];
}

/**
 * Create a test JWT access token
 */
export function createTestAccessToken(payload: TestTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.userId || 'test-user-id',
      email: payload.email || 'test@example.com',
      tenantId: payload.tenantId || 'test-tenant-id',
      portalUserId: payload.portalUserId || 'test-portal-user-id',
      role: payload.role || 'customer',
      permissions: payload.permissions || ['portal.read'],
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: '15m',
      issuer: 'leora-test',
    }
  );
}

/**
 * Create a test JWT refresh token
 */
export function createTestRefreshToken(payload: TestTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.userId || 'test-user-id',
      email: payload.email || 'test@example.com',
      tenantId: payload.tenantId || 'test-tenant-id',
      portalUserId: payload.portalUserId || 'test-portal-user-id',
      type: 'refresh',
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'leora-test',
    }
  );
}

/**
 * Decode a test token without verification
 */
export function decodeTestToken(token: string): any {
  return jwt.decode(token);
}

/**
 * Verify a test token
 */
export function verifyTestToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Create mock auth headers for API requests
 */
export function createAuthHeaders(token?: string): Record<string, string> {
  const accessToken = token || createTestAccessToken({});

  return {
    'Authorization': `Bearer ${accessToken}`,
    'x-tenant-id': 'test-tenant-id',
    'Content-Type': 'application/json',
  };
}

/**
 * Create mock cookies for auth testing
 */
export function createAuthCookies(accessToken?: string, refreshToken?: string) {
  return {
    access_token: accessToken || createTestAccessToken({}),
    refresh_token: refreshToken || createTestRefreshToken({}),
  };
}

/**
 * Mock Next.js request with auth
 */
export function createAuthenticatedRequest(payload?: TestTokenPayload) {
  const token = createTestAccessToken(payload || {});

  return {
    headers: new Headers({
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': payload?.tenantId || 'test-tenant-id',
      'Content-Type': 'application/json',
    }),
    cookies: {
      get: jest.fn((name: string) => {
        if (name === 'access_token') return { value: token };
        if (name === 'refresh_token') return { value: createTestRefreshToken(payload || {}) };
        return undefined;
      }),
      set: jest.fn(),
      delete: jest.fn(),
    },
  };
}
