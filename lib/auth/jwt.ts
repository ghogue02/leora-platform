/**
 * JWT Authentication Utilities for Leora Platform
 *
 * Implements access/refresh token generation, verification, and cookie management
 * following Blueprint Section 6 (Authentication & Session Flow).
 *
 * Security features:
 * - Separate access (15min) and refresh (7 days) token lifetimes
 * - HTTPOnly, Secure, SameSite cookies
 * - Tenant-aware token payloads
 * - Role-based access control metadata
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

// Environment configuration
const JWT_SECRET = process.env.JWT_SECRET;
const secret = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

function getSecret(): Uint8Array {
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return secret;
}

// Token lifetimes
export const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'leora_access_token';
export const REFRESH_TOKEN_COOKIE = 'leora_refresh_token';

/**
 * JWT token payload structure
 */
export interface TokenPayload extends JWTPayload {
  userId: string;
  portalUserId?: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
  sessionId?: string;
}

/**
 * User data for token generation
 */
export interface TokenUser {
  id: string;
  portalUserId?: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
}

/**
 * Generate access token (short-lived, contains full permission set)
 */
export async function generateAccessToken(
  user: TokenUser,
  sessionId?: string
): Promise<string> {
  const signingKey = getSecret();

  const payload: TokenPayload = {
    userId: user.id,
    portalUserId: user.portalUserId,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    roles: user.roles,
    permissions: user.permissions,
    type: 'access',
    sessionId,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer('leora-platform')
    .setAudience('leora-portal')
    .sign(signingKey);
}

/**
 * Generate refresh token (long-lived, minimal payload)
 */
export async function generateRefreshToken(
  user: TokenUser,
  sessionId?: string
): Promise<string> {
  const signingKey = getSecret();

  const payload: TokenPayload = {
    userId: user.id,
    portalUserId: user.portalUserId,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    roles: [], // Minimal payload for security
    permissions: [],
    type: 'refresh',
    sessionId,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuer('leora-platform')
    .setAudience('leora-portal')
    .sign(signingKey);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const signingKey = getSecret();

    const { payload } = await jwtVerify(token, signingKey, {
      issuer: 'leora-platform',
      audience: 'leora-portal',
    });

    return payload as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Set access token cookie
 */
export async function setAccessTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  });
}

/**
 * Set refresh token cookie
 */
export async function setRefreshTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear authentication cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

/**
 * Get access token from cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ACCESS_TOKEN_COOKIE);
  return cookie?.value || null;
}

/**
 * Get refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(REFRESH_TOKEN_COOKIE);
  return cookie?.value || null;
}

/**
 * Get current user from access token
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'access') return null;

  return payload;
}

/**
 * Verify refresh token and return payload
 */
export async function verifyRefreshToken(): Promise<TokenPayload | null> {
  const token = await getRefreshToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'refresh') return null;

  return payload;
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(
  user: TokenUser,
  sessionId?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user, sessionId),
    generateRefreshToken(user, sessionId),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Set both auth cookies
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await Promise.all([
    setAccessTokenCookie(accessToken),
    setRefreshTokenCookie(refreshToken),
  ]);
}
