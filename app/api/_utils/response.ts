/**
 * Consistent API Response Helpers
 * Provides standardized response shapes across all API endpoints
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Error response helper with automatic logging
 */
export function errorResponse(
  message: string,
  status = 400,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  // Log error details for debugging
  console.error('[API Error]', {
    timestamp: new Date().toISOString(),
    status,
    code,
    message,
    details: details instanceof Error ? {
      name: details.name,
      message: details.message,
      stack: details.stack,
    } : details,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const Errors = {
  unauthorized: (message = 'Unauthorized') => errorResponse(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => errorResponse(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Resource not found') => errorResponse(message, 404, 'NOT_FOUND'),
  badRequest: (message: string, details?: unknown) => errorResponse(message, 400, 'BAD_REQUEST', details),
  conflict: (message: string) => errorResponse(message, 409, 'CONFLICT'),
  serverError: (message = 'Internal server error') => errorResponse(message, 500, 'INTERNAL_ERROR'),
  validationError: (message: string, details?: unknown) => errorResponse(message, 422, 'VALIDATION_ERROR', details),
};
