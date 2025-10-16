/**
 * Authentication Types and Zod Schemas for Leora Platform
 *
 * Comprehensive type definitions and validation schemas for authentication flows
 */

import { z } from 'zod';

/**
 * Login credentials schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantSlug: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

/**
 * Registration data schema
 */
export const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  phoneNumber: z.string().optional(),
  tenantSlug: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegistrationData = z.infer<typeof registrationSchema>;

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantSlug: z.string().optional(),
});

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset confirmation schema
 */
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type PasswordReset = z.infer<typeof passwordResetSchema>;

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type EmailVerification = z.infer<typeof emailVerificationSchema>;

/**
 * Session user data (returned from /api/portal/auth/me)
 */
export interface SessionUser {
  id: string;
  portalUserId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  success: boolean;
  user?: SessionUser;
  error?: string;
  requiresVerification?: boolean;
}

/**
 * Portal session data
 */
export interface PortalSession {
  id: string;
  portalUserId: string;
  tenantId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

/**
 * Account lockout status
 */
export interface LockoutStatus {
  isLocked: boolean;
  lockoutUntil?: Date;
  failedAttempts: number;
  remainingAttempts: number;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  isLimited: boolean;
  resetAt?: Date;
  attemptsRemaining: number;
  totalAttempts: number;
}

/**
 * Permission check result
 */
export interface PermissionCheck {
  granted: boolean;
  reason?: string;
  requiredPermission?: string;
  userPermissions?: string[];
}

/**
 * Role definition
 */
export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  tenantId: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission definition
 */
export interface Permission {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  isSystemPermission: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auth activity log entry
 */
export interface AuthActivityLog {
  id: string;
  userId?: string;
  portalUserId?: string;
  tenantId: string;
  action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'email_verified' | 'token_refresh';
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Password strength validation result
 */
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-4
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}
