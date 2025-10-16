/**
 * Rate Limiting and Account Lockout Utilities for Leora Platform
 *
 * Implements security measures for authentication endpoints:
 * - Rate limiting by IP address and email
 * - Progressive account lockout after failed login attempts
 * - Configurable thresholds and cooldown periods
 * - In-memory storage with optional Redis backend
 */

import type { LockoutStatus, RateLimitStatus } from './types';

// Configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5; // per window
const LOCKOUT_THRESHOLD = 10; // failed attempts before lockout
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const PROGRESSIVE_LOCKOUT_MULTIPLIER = 2; // doubles with each lockout

// In-memory storage (replace with Redis in production)
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  resetAt: number;
}

interface LockoutEntry {
  failedAttempts: number;
  lockoutCount: number;
  lockedUntil?: number;
  lastFailedAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const lockoutStore = new Map<string, LockoutEntry>();

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Clean rate limits
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }

  // Clean lockouts
  for (const [key, entry] of lockoutStore.entries()) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      // Reset failed attempts after lockout expires
      entry.failedAttempts = 0;
      entry.lockedUntil = undefined;
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check rate limit for an identifier (IP or email)
 */
export function checkRateLimit(identifier: string): RateLimitStatus {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    return {
      isLimited: false,
      attemptsRemaining: MAX_LOGIN_ATTEMPTS,
      totalAttempts: MAX_LOGIN_ATTEMPTS,
    };
  }

  // Check if window has expired
  if (entry.resetAt < now) {
    rateLimitStore.delete(identifier);
    return {
      isLimited: false,
      attemptsRemaining: MAX_LOGIN_ATTEMPTS,
      totalAttempts: MAX_LOGIN_ATTEMPTS,
    };
  }

  const attemptsRemaining = MAX_LOGIN_ATTEMPTS - entry.attempts;
  const isLimited = attemptsRemaining <= 0;

  return {
    isLimited,
    resetAt: new Date(entry.resetAt),
    attemptsRemaining: Math.max(0, attemptsRemaining),
    totalAttempts: MAX_LOGIN_ATTEMPTS,
  };
}

/**
 * Record a rate limit attempt
 */
export function recordRateLimitAttempt(identifier: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Start new window
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
  } else {
    // Increment existing window
    entry.attempts++;
  }
}

/**
 * Check account lockout status
 */
export function checkAccountLockout(identifier: string): LockoutStatus {
  const now = Date.now();
  const entry = lockoutStore.get(identifier);

  if (!entry) {
    return {
      isLocked: false,
      failedAttempts: 0,
      remainingAttempts: LOCKOUT_THRESHOLD,
    };
  }

  // Check if lockout is active
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      isLocked: true,
      lockoutUntil: new Date(entry.lockedUntil),
      failedAttempts: entry.failedAttempts,
      remainingAttempts: 0,
    };
  }

  // Lockout expired, reset
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.failedAttempts = 0;
    entry.lockedUntil = undefined;
  }

  const remainingAttempts = LOCKOUT_THRESHOLD - entry.failedAttempts;

  return {
    isLocked: false,
    failedAttempts: entry.failedAttempts,
    remainingAttempts: Math.max(0, remainingAttempts),
  };
}

/**
 * Record failed login attempt
 */
export function recordFailedLoginAttempt(identifier: string): LockoutStatus {
  const now = Date.now();
  const entry = lockoutStore.get(identifier) || {
    failedAttempts: 0,
    lockoutCount: 0,
    lastFailedAt: now,
  };

  entry.failedAttempts++;
  entry.lastFailedAt = now;

  // Check if lockout threshold reached
  if (entry.failedAttempts >= LOCKOUT_THRESHOLD) {
    entry.lockoutCount++;
    // Progressive lockout: duration increases with each lockout
    const lockoutDuration =
      LOCKOUT_DURATION * Math.pow(PROGRESSIVE_LOCKOUT_MULTIPLIER, entry.lockoutCount - 1);
    entry.lockedUntil = now + lockoutDuration;

    lockoutStore.set(identifier, entry);

    return {
      isLocked: true,
      lockoutUntil: new Date(entry.lockedUntil),
      failedAttempts: entry.failedAttempts,
      remainingAttempts: 0,
    };
  }

  lockoutStore.set(identifier, entry);

  return {
    isLocked: false,
    failedAttempts: entry.failedAttempts,
    remainingAttempts: LOCKOUT_THRESHOLD - entry.failedAttempts,
  };
}

/**
 * Clear failed login attempts (on successful login)
 */
export function clearFailedLoginAttempts(identifier: string): void {
  const entry = lockoutStore.get(identifier);
  if (entry) {
    entry.failedAttempts = 0;
    entry.lockedUntil = undefined;
  }
}

/**
 * Manually unlock an account (admin action)
 */
export function unlockAccount(identifier: string): void {
  lockoutStore.delete(identifier);
}

/**
 * Get combined security status
 */
export function getSecurityStatus(
  ipIdentifier: string,
  emailIdentifier: string
): {
  rateLimitStatus: RateLimitStatus;
  lockoutStatus: LockoutStatus;
  canProceed: boolean;
  reason?: string;
} {
  const rateLimitStatus = checkRateLimit(ipIdentifier);
  const lockoutStatus = checkAccountLockout(emailIdentifier);

  let canProceed = true;
  let reason: string | undefined;

  if (rateLimitStatus.isLimited) {
    canProceed = false;
    reason = 'Too many login attempts. Please try again later.';
  } else if (lockoutStatus.isLocked) {
    canProceed = false;
    reason = 'Account temporarily locked due to multiple failed login attempts.';
  }

  return {
    rateLimitStatus,
    lockoutStatus,
    canProceed,
    reason,
  };
}

/**
 * Record successful login (clears both rate limit and lockout)
 */
export function recordSuccessfulLogin(
  ipIdentifier: string,
  emailIdentifier: string
): void {
  rateLimitStore.delete(ipIdentifier);
  clearFailedLoginAttempts(emailIdentifier);
}

/**
 * Record failed login (updates both rate limit and lockout)
 */
export function recordFailedLogin(
  ipIdentifier: string,
  emailIdentifier: string
): {
  rateLimitStatus: RateLimitStatus;
  lockoutStatus: LockoutStatus;
} {
  recordRateLimitAttempt(ipIdentifier);
  const lockoutStatus = recordFailedLoginAttempt(emailIdentifier);
  const rateLimitStatus = checkRateLimit(ipIdentifier);

  return { rateLimitStatus, lockoutStatus };
}

/**
 * Get IP address from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback for development
  return 'unknown';
}
