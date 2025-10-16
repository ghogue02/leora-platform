import { generateTokenPair, hashToken, isExpired } from '../token-utils';

describe('token-utils', () => {
  it('generates a token pair with hashed token and expiry', () => {
    const { token, hashedToken, expiresAt } = generateTokenPair(10);

    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64); // 32 bytes hex
    expect(hashedToken).toBe(hashToken(token));
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('detects expired timestamps', () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 1000);

    expect(isExpired(past)).toBe(true);
    expect(isExpired(future)).toBe(false);
    expect(isExpired(undefined)).toBe(true);
  });
});
