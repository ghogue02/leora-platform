/**
 * API response utilities unit tests
 */

import { describe, it, expect } from '@jest/globals';
import { NextResponse } from 'next/server';

// Mock response utilities
class ResponseUtils {
  /**
   * Create success response
   */
  success<T>(data: T, status = 200): Response {
    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status }
    );
  }

  /**
   * Create error response
   */
  error(message: string, code?: string, status = 400): Response {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code: code || 'ERROR',
        },
      },
      { status }
    );
  }

  /**
   * Create validation error response
   */
  validationError(errors: Record<string, string[]>): Response {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
      },
      { status: 422 }
    );
  }

  /**
   * Create unauthorized response
   */
  unauthorized(message = 'Unauthorized'): Response {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code: 'UNAUTHORIZED',
        },
      },
      { status: 401 }
    );
  }

  /**
   * Create forbidden response
   */
  forbidden(message = 'Forbidden'): Response {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code: 'FORBIDDEN',
        },
      },
      { status: 403 }
    );
  }

  /**
   * Create not found response
   */
  notFound(resource = 'Resource'): Response {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: `${resource} not found`,
          code: 'NOT_FOUND',
        },
      },
      { status: 404 }
    );
  }

  /**
   * Create rate limit response
   */
  rateLimit(retryAfter?: number): Response {
    const headers: Record<string, string> = {};
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString();
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
        },
      },
      { status: 429, headers }
    );
  }
}

describe('Response Utilities', () => {
  let utils: ResponseUtils;

  beforeEach(() => {
    utils = new ResponseUtils();
  });

  describe('success', () => {
    it('should create success response with data', async () => {
      const response = utils.success({ id: 123, name: 'Test' });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 123, name: 'Test' });
    });

    it('should support custom status codes', async () => {
      const response = utils.success({ created: true }, 201);

      expect(response.status).toBe(201);
    });

    it('should handle null data', async () => {
      const response = utils.success(null);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });

    it('should handle array data', async () => {
      const response = utils.success([1, 2, 3]);
      const body = await response.json();

      expect(body.data).toEqual([1, 2, 3]);
    });
  });

  describe('error', () => {
    it('should create error response', async () => {
      const response = utils.error('Something went wrong');
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Something went wrong');
    });

    it('should include error code', async () => {
      const response = utils.error('Invalid request', 'INVALID_REQUEST');
      const body = await response.json();

      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should support custom status codes', async () => {
      const response = utils.error('Server error', 'INTERNAL_ERROR', 500);

      expect(response.status).toBe(500);
    });

    it('should use default error code', async () => {
      const response = utils.error('Error message');
      const body = await response.json();

      expect(body.error.code).toBe('ERROR');
    });
  });

  describe('validationError', () => {
    it('should create validation error response', async () => {
      const errors = {
        email: ['Email is required', 'Email must be valid'],
        password: ['Password is too short'],
      };

      const response = utils.validationError(errors);
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toEqual(errors);
    });

    it('should include validation error message', async () => {
      const response = utils.validationError({});
      const body = await response.json();

      expect(body.error.message).toBe('Validation failed');
    });
  });

  describe('unauthorized', () => {
    it('should create unauthorized response', async () => {
      const response = utils.unauthorized();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should support custom message', async () => {
      const response = utils.unauthorized('Invalid token');
      const body = await response.json();

      expect(body.error.message).toBe('Invalid token');
    });

    it('should use default message', async () => {
      const response = utils.unauthorized();
      const body = await response.json();

      expect(body.error.message).toBe('Unauthorized');
    });
  });

  describe('forbidden', () => {
    it('should create forbidden response', async () => {
      const response = utils.forbidden();
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should support custom message', async () => {
      const response = utils.forbidden('Insufficient permissions');
      const body = await response.json();

      expect(body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('notFound', () => {
    it('should create not found response', async () => {
      const response = utils.notFound();
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should include resource name in message', async () => {
      const response = utils.notFound('User');
      const body = await response.json();

      expect(body.error.message).toBe('User not found');
    });

    it('should use default resource name', async () => {
      const response = utils.notFound();
      const body = await response.json();

      expect(body.error.message).toContain('Resource');
    });
  });

  describe('rateLimit', () => {
    it('should create rate limit response', async () => {
      const response = utils.rateLimit();
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should include Retry-After header', async () => {
      const response = utils.rateLimit(60);

      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should work without Retry-After', async () => {
      const response = utils.rateLimit();

      expect(response.headers.get('Retry-After')).toBeNull();
    });
  });

  describe('Response Consistency', () => {
    it('should always include success flag', async () => {
      const successResp = utils.success({});
      const errorResp = utils.error('Error');

      const successBody = await successResp.json();
      const errorBody = await errorResp.json();

      expect(successBody).toHaveProperty('success');
      expect(errorBody).toHaveProperty('success');
    });

    it('should use consistent error structure', async () => {
      const responses = await Promise.all([
        utils.error('Error 1').json(),
        utils.unauthorized().json(),
        utils.forbidden().json(),
        utils.notFound().json(),
      ]);

      responses.forEach((body) => {
        expect(body.error).toHaveProperty('message');
        expect(body.error).toHaveProperty('code');
      });
    });
  });
});
