/**
 * Session management unit tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createAuthenticatedRequest, createAuthCookies } from '@/tests/helpers/auth';

describe('Session Management', () => {
  describe('createAuthenticatedRequest', () => {
    it('should create a mock authenticated request', () => {
      const request = createAuthenticatedRequest({
        userId: 'user-123',
        email: 'user@test.com',
        tenantId: 'tenant-123',
      });

      expect(request.headers).toBeDefined();
      expect(request.cookies).toBeDefined();
      expect(request.headers.get('Authorization')).toContain('Bearer ');
      expect(request.headers.get('x-tenant-id')).toBe('tenant-123');
    });

    it('should include access and refresh tokens in cookies', () => {
      const request = createAuthenticatedRequest({
        userId: 'user-123',
      });

      const accessToken = request.cookies.get('access_token');
      const refreshToken = request.cookies.get('refresh_token');

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken?.value).toBeDefined();
      expect(refreshToken?.value).toBeDefined();
    });

    it('should use default values when no payload provided', () => {
      const request = createAuthenticatedRequest();

      expect(request.headers.get('x-tenant-id')).toBe('test-tenant-id');
      expect(request.cookies.get('access_token')).toBeDefined();
    });
  });

  describe('createAuthCookies', () => {
    it('should create auth cookies with tokens', () => {
      const cookies = createAuthCookies();

      expect(cookies.access_token).toBeDefined();
      expect(cookies.refresh_token).toBeDefined();
      expect(typeof cookies.access_token).toBe('string');
      expect(typeof cookies.refresh_token).toBe('string');
    });

    it('should use provided tokens', () => {
      const accessToken = 'custom-access-token';
      const refreshToken = 'custom-refresh-token';

      const cookies = createAuthCookies(accessToken, refreshToken);

      expect(cookies.access_token).toBe(accessToken);
      expect(cookies.refresh_token).toBe(refreshToken);
    });

    it('should generate tokens when not provided', () => {
      const cookies = createAuthCookies();

      expect(cookies.access_token.length).toBeGreaterThan(50);
      expect(cookies.refresh_token.length).toBeGreaterThan(50);
    });
  });

  describe('Session Validation', () => {
    it('should validate tenant isolation', () => {
      const request1 = createAuthenticatedRequest({ tenantId: 'tenant-1' });
      const request2 = createAuthenticatedRequest({ tenantId: 'tenant-2' });

      expect(request1.headers.get('x-tenant-id')).toBe('tenant-1');
      expect(request2.headers.get('x-tenant-id')).toBe('tenant-2');
      expect(request1.headers.get('x-tenant-id')).not.toBe(
        request2.headers.get('x-tenant-id')
      );
    });

    it('should maintain user context in tokens', () => {
      const payload = {
        userId: 'user-123',
        email: 'user@test.com',
        role: 'admin',
      };

      const request = createAuthenticatedRequest(payload);
      const token = request.cookies.get('access_token')?.value;

      expect(token).toBeDefined();
      expect(token).toContain('.');
    });
  });

  describe('Cookie Management', () => {
    it('should support cookie getter', () => {
      const request = createAuthenticatedRequest();

      expect(request.cookies.get).toBeDefined();
      expect(typeof request.cookies.get).toBe('function');
    });

    it('should support cookie setter', () => {
      const request = createAuthenticatedRequest();

      expect(request.cookies.set).toBeDefined();
      expect(typeof request.cookies.set).toBe('function');
    });

    it('should support cookie deletion', () => {
      const request = createAuthenticatedRequest();

      expect(request.cookies.delete).toBeDefined();
      expect(typeof request.cookies.delete).toBe('function');
    });

    it('should return undefined for non-existent cookies', () => {
      const request = createAuthenticatedRequest();
      const nonExistent = request.cookies.get('non_existent_cookie');

      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Authorization Headers', () => {
    it('should include Bearer token in Authorization header', () => {
      const request = createAuthenticatedRequest();
      const authHeader = request.headers.get('Authorization');

      expect(authHeader).toMatch(/^Bearer .+/);
    });

    it('should include Content-Type header', () => {
      const request = createAuthenticatedRequest();
      const contentType = request.headers.get('Content-Type');

      expect(contentType).toBe('application/json');
    });

    it('should include tenant ID header', () => {
      const request = createAuthenticatedRequest({ tenantId: 'custom-tenant' });
      const tenantId = request.headers.get('x-tenant-id');

      expect(tenantId).toBe('custom-tenant');
    });
  });
});
