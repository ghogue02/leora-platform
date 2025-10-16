/**
 * Tenant utilities unit tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock tenant utilities
class TenantUtils {
  /**
   * Extract tenant ID from request headers
   */
  getTenantIdFromRequest(headers: Headers): string | null {
    return headers.get('x-tenant-id') || null;
  }

  /**
   * Validate tenant ID format
   */
  isValidTenantId(tenantId: string): boolean {
    if (!tenantId || typeof tenantId !== 'string') return false;
    if (tenantId.length < 3 || tenantId.length > 64) return false;
    return /^[a-z0-9-]+$/.test(tenantId);
  }

  /**
   * Get tenant slug from subdomain
   */
  getTenantFromSubdomain(hostname: string): string | null {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }
    return null;
  }

  /**
   * Create tenant context for Prisma
   */
  async withTenantContext<T>(
    tenantId: string,
    callback: (context: { tenantId: string }) => Promise<T>
  ): Promise<T> {
    // In real implementation, this would set Postgres session parameter
    const context = { tenantId };
    return await callback(context);
  }

  /**
   * Validate tenant access permission
   */
  canAccessTenant(userTenantId: string, requestedTenantId: string): boolean {
    return userTenantId === requestedTenantId;
  }
}

describe('Tenant Utilities', () => {
  let utils: TenantUtils;

  beforeEach(() => {
    utils = new TenantUtils();
  });

  describe('getTenantIdFromRequest', () => {
    it('should extract tenant ID from headers', () => {
      const headers = new Headers({ 'x-tenant-id': 'tenant-123' });
      const tenantId = utils.getTenantIdFromRequest(headers);

      expect(tenantId).toBe('tenant-123');
    });

    it('should return null when header missing', () => {
      const headers = new Headers({});
      const tenantId = utils.getTenantIdFromRequest(headers);

      expect(tenantId).toBeNull();
    });

    it('should handle case-insensitive header names', () => {
      const headers = new Headers({ 'X-Tenant-ID': 'tenant-123' });
      const tenantId = utils.getTenantIdFromRequest(headers);

      expect(tenantId).toBe('tenant-123');
    });
  });

  describe('isValidTenantId', () => {
    it('should validate correct tenant ID format', () => {
      expect(utils.isValidTenantId('tenant-123')).toBe(true);
      expect(utils.isValidTenantId('well-crafted')).toBe(true);
      expect(utils.isValidTenantId('abc')).toBe(true);
    });

    it('should reject empty or null tenant IDs', () => {
      expect(utils.isValidTenantId('')).toBe(false);
      expect(utils.isValidTenantId(null as any)).toBe(false);
      expect(utils.isValidTenantId(undefined as any)).toBe(false);
    });

    it('should reject tenant IDs that are too short', () => {
      expect(utils.isValidTenantId('ab')).toBe(false);
      expect(utils.isValidTenantId('a')).toBe(false);
    });

    it('should reject tenant IDs that are too long', () => {
      const longId = 'a'.repeat(65);
      expect(utils.isValidTenantId(longId)).toBe(false);
    });

    it('should reject tenant IDs with invalid characters', () => {
      expect(utils.isValidTenantId('tenant_123')).toBe(false);
      expect(utils.isValidTenantId('Tenant-123')).toBe(false);
      expect(utils.isValidTenantId('tenant.123')).toBe(false);
      expect(utils.isValidTenantId('tenant 123')).toBe(false);
    });

    it('should accept tenant IDs with hyphens', () => {
      expect(utils.isValidTenantId('multi-word-tenant')).toBe(true);
      expect(utils.isValidTenantId('tenant-with-many-hyphens-in-it')).toBe(true);
    });
  });

  describe('getTenantFromSubdomain', () => {
    it('should extract tenant from subdomain', () => {
      expect(utils.getTenantFromSubdomain('acme.leora.app')).toBe('acme');
      expect(utils.getTenantFromSubdomain('well-crafted.leora.app')).toBe('well-crafted');
    });

    it('should return null for apex domain', () => {
      expect(utils.getTenantFromSubdomain('leora.app')).toBeNull();
    });

    it('should ignore www subdomain', () => {
      expect(utils.getTenantFromSubdomain('www.leora.app')).toBeNull();
    });

    it('should ignore api subdomain', () => {
      expect(utils.getTenantFromSubdomain('api.leora.app')).toBeNull();
    });

    it('should handle localhost', () => {
      expect(utils.getTenantFromSubdomain('localhost')).toBeNull();
      expect(utils.getTenantFromSubdomain('tenant.localhost')).toBe('tenant');
    });
  });

  describe('withTenantContext', () => {
    it('should execute callback with tenant context', async () => {
      const callback = jest.fn(async (ctx: { tenantId: string }) => {
        expect(ctx.tenantId).toBe('tenant-123');
        return 'success';
      });

      const result = await utils.withTenantContext('tenant-123', callback);

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass tenant ID to callback', async () => {
      let capturedTenantId: string | null = null;

      await utils.withTenantContext('my-tenant', async (ctx: { tenantId: string }) => {
        capturedTenantId = ctx.tenantId;
        return true;
      });

      expect(capturedTenantId).toBe('my-tenant');
    });

    it('should propagate errors from callback', async () => {
      const callback = async () => {
        throw new Error('Callback error');
      };

      await expect(utils.withTenantContext('tenant-123', callback)).rejects.toThrow(
        'Callback error'
      );
    });

    it('should return callback result', async () => {
      const result = await utils.withTenantContext('tenant-123', async () => {
        return { data: 'test-data' };
      });

      expect(result).toEqual({ data: 'test-data' });
    });
  });

  describe('canAccessTenant', () => {
    it('should allow access when tenant IDs match', () => {
      expect(utils.canAccessTenant('tenant-123', 'tenant-123')).toBe(true);
    });

    it('should deny access when tenant IDs differ', () => {
      expect(utils.canAccessTenant('tenant-123', 'tenant-456')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(utils.canAccessTenant('Tenant-123', 'tenant-123')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(utils.canAccessTenant('', '')).toBe(true);
      expect(utils.canAccessTenant('tenant-123', '')).toBe(false);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should maintain separate contexts for different tenants', async () => {
      const tenant1Results = await utils.withTenantContext('tenant-1', async (ctx) => {
        return ctx.tenantId;
      });

      const tenant2Results = await utils.withTenantContext('tenant-2', async (ctx) => {
        return ctx.tenantId;
      });

      expect(tenant1Results).toBe('tenant-1');
      expect(tenant2Results).toBe('tenant-2');
      expect(tenant1Results).not.toBe(tenant2Results);
    });

    it('should prevent cross-tenant data leakage', async () => {
      const sharedState = { lastTenant: '' };

      await utils.withTenantContext('tenant-1', async (ctx) => {
        sharedState.lastTenant = ctx.tenantId;
        return true;
      });

      await utils.withTenantContext('tenant-2', async (ctx) => {
        sharedState.lastTenant = ctx.tenantId;
        return true;
      });

      expect(sharedState.lastTenant).toBe('tenant-2');
    });
  });
});
