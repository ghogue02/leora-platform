/**
 * Authentication Module - Leora Platform
 *
 * Comprehensive authentication and authorization system with:
 * - JWT-based access/refresh tokens
 * - Multi-tenant support
 * - Role-based access control (RBAC)
 * - Rate limiting and account lockout
 * - Session management
 * - Email verification and password reset
 *
 * @module lib/auth
 */

// JWT utilities
export {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getCurrentUser,
  verifyRefreshToken,
  generateTokenPair,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  setAuthCookies,
  getAccessToken,
  getRefreshToken,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  type TokenPayload,
  type TokenUser,
} from './jwt';

// Types and schemas
export {
  loginSchema,
  registrationSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  emailVerificationSchema,
  type LoginCredentials,
  type RegistrationData,
  type PasswordResetRequest,
  type PasswordReset,
  type EmailVerification,
  type SessionUser,
  type AuthResponse,
  type PortalSession,
  type LockoutStatus,
  type RateLimitStatus,
  type PermissionCheck,
  type Role,
  type Permission,
  type AuthActivityLog,
  type PasswordStrength,
} from './types';

// Rate limiting and security
export {
  checkRateLimit,
  recordRateLimitAttempt,
  checkAccountLockout,
  recordFailedLoginAttempt,
  clearFailedLoginAttempts,
  unlockAccount,
  getSecurityStatus,
  recordSuccessfulLogin,
  recordFailedLogin,
  getClientIP,
} from './rate-limit';

// RBAC utilities
export {
  PERMISSION_CATEGORIES,
  getAllPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  checkPermission,
  requirePermission,
  canAccessPortal,
  isSalesRep,
  isManager,
  isAdmin,
  isSystemAdmin,
  getPermissionScope,
  filterPermissionsByScope,
  isValidPermission,
  getPermissionsForRoles,
} from './rbac';

// Middleware and guards
export {
  requireAuth,
  requireAuthWithPermission,
  requireAuthWithAnyPermission,
  validateTenant,
  optionalAuth,
  withAuth,
  withAuthAndPermission,
  requirePortalAuth,
  getTenantContext,
  getRequestMetadata,
  type AuthMiddlewareResult,
} from './middleware';
