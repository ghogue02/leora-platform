import { createHash, randomBytes } from 'crypto';

/**
 * Generate a random token suitable for email verification or password resets.
 * Returns the raw token (for emailing) and a hashed version for storage.
 */
export function generateTokenPair(ttlMinutes: number) {
  const token = randomBytes(32).toString('hex');
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return { token, hashedToken, expiresAt };
}

/**
 * Hash a token using SHA-256 so we never persist raw tokens in the database.
 */
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Determine whether a token expiry is in the past.
 */
export function isExpired(expiry?: Date | null) {
  if (!expiry) return true;
  return expiry.getTime() <= Date.now();
}
