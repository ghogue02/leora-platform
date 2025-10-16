/**
 * JWT utilities unit tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as jwt from 'jsonwebtoken';
import {
  createTestAccessToken,
  createTestRefreshToken,
  verifyTestToken,
  decodeTestToken,
} from '@/tests/helpers/auth';

describe('JWT Utilities', () => {
  const testPayload = {
    userId: 'test-user-123',
    email: 'user@test.com',
    tenantId: 'tenant-123',
    portalUserId: 'portal-user-123',
    role: 'customer',
    permissions: ['portal.read', 'portal.orders.read'],
  };

  describe('createTestAccessToken', () => {
    it('should create a valid access token', () => {
      const token = createTestAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyTestToken(token);
      expect(decoded.sub).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.tenantId).toBe(testPayload.tenantId);
      expect(decoded.type).toBe('access');
    });

    it('should use default values when payload is empty', () => {
      const token = createTestAccessToken({});
      const decoded = verifyTestToken(token);

      expect(decoded.sub).toBe('test-user-id');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.tenantId).toBe('test-tenant-id');
    });

    it('should include expiration time', () => {
      const token = createTestAccessToken(testPayload);
      const decoded = verifyTestToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should include issuer', () => {
      const token = createTestAccessToken(testPayload);
      const decoded = verifyTestToken(token);

      expect(decoded.iss).toBe('leora-test');
    });
  });

  describe('createTestRefreshToken', () => {
    it('should create a valid refresh token', () => {
      const token = createTestRefreshToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyTestToken(token);
      expect(decoded.sub).toBe(testPayload.userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should have longer expiration than access token', () => {
      const accessToken = createTestAccessToken(testPayload);
      const refreshToken = createTestRefreshToken(testPayload);

      const accessDecoded = verifyTestToken(accessToken);
      const refreshDecoded = verifyTestToken(refreshToken);

      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });

  describe('verifyTestToken', () => {
    it('should verify a valid token', () => {
      const token = createTestAccessToken(testPayload);
      const decoded = verifyTestToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(testPayload.userId);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyTestToken('invalid-token')).toThrow();
    });

    it('should throw error for tampered token', () => {
      const token = createTestAccessToken(testPayload);
      const tampered = token.slice(0, -10) + '0000000000';

      expect(() => verifyTestToken(tampered)).toThrow();
    });
  });

  describe('decodeTestToken', () => {
    it('should decode token without verification', () => {
      const token = createTestAccessToken(testPayload);
      const decoded = decodeTestToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('should decode expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-jwt-secret'
      );

      const decoded = decodeTestToken(expiredToken);
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe('user-123');
    });

    it('should return null for completely invalid token', () => {
      const decoded = decodeTestToken('not-a-jwt-token');
      expect(decoded).toBeNull();
    });
  });

  describe('Token Security', () => {
    it('should not include sensitive data in token payload', () => {
      const token = createTestAccessToken({
        ...testPayload,
        // @ts-ignore - testing that password doesn't get included
        password: 'should-not-be-included',
      });

      const decoded = decodeTestToken(token);
      expect(decoded.password).toBeUndefined();
    });

    it('should use different tokens for different users', () => {
      const token1 = createTestAccessToken({ userId: 'user-1' });
      const token2 = createTestAccessToken({ userId: 'user-2' });

      expect(token1).not.toBe(token2);

      const decoded1 = decodeTestToken(token1);
      const decoded2 = decodeTestToken(token2);

      expect(decoded1.sub).not.toBe(decoded2.sub);
    });

    it('should generate unique tokens for same user at different times', () => {
      const token1 = createTestAccessToken(testPayload);

      // Wait a bit
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      return delay(10).then(() => {
        const token2 = createTestAccessToken(testPayload);

        expect(token1).not.toBe(token2);
      });
    });
  });

  describe('Token Permissions', () => {
    it('should include permissions in access token', () => {
      const token = createTestAccessToken({
        permissions: ['portal.read', 'portal.write', 'portal.admin'],
      });

      const decoded = verifyTestToken(token);
      expect(decoded.permissions).toEqual([
        'portal.read',
        'portal.write',
        'portal.admin',
      ]);
    });

    it('should handle empty permissions array', () => {
      const token = createTestAccessToken({ permissions: [] });
      const decoded = verifyTestToken(token);

      expect(decoded.permissions).toEqual([]);
    });

    it('should use default permissions when not provided', () => {
      const token = createTestAccessToken({});
      const decoded = verifyTestToken(token);

      expect(decoded.permissions).toEqual(['portal.read']);
    });
  });
});
