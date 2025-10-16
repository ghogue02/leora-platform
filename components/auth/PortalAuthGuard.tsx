'use client';

/**
 * Portal Auth Guard for Leora Platform
 *
 * Protects routes and components from unauthorized access.
 * Provides loading states and automatic redirects.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalSession } from '@/components/providers/PortalSessionProvider';

/**
 * Props for PortalAuthGuard
 */
interface PortalAuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requiredRole?: string;
  requiredRoles?: string[];
  requireAny?: boolean; // If true, require any permission/role instead of all
  fallback?: React.ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
}

/**
 * Portal Auth Guard Component
 *
 * Wraps protected content and enforces authentication/authorization.
 *
 * @example
 * <PortalAuthGuard requiredPermission="portal.orders.view">
 *   <OrdersList />
 * </PortalAuthGuard>
 */
export function PortalAuthGuard({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRole,
  requiredRoles,
  requireAny = false,
  fallback,
  redirectTo = '/portal/login',
  onUnauthorized,
}: PortalAuthGuardProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = usePortalSession();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication
    if (!isAuthenticated) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        router.push(redirectTo);
      }
      return;
    }

    // Check permissions
    if (requiredPermission || requiredPermissions) {
      const permissions = requiredPermissions || [requiredPermission!];
      const hasPermission = requireAny
        ? checkAnyPermission(user!.permissions, permissions)
        : checkAllPermissions(user!.permissions, permissions);

      if (!hasPermission) {
        if (onUnauthorized) {
          onUnauthorized();
        } else {
          router.push('/portal/unauthorized');
        }
        return;
      }
    }

    // Check roles
    if (requiredRole || requiredRoles) {
      const roles = requiredRoles || [requiredRole!];
      const hasRole = requireAny
        ? checkAnyRole(user!.roles, roles)
        : checkAllRoles(user!.roles, roles);

      if (!hasRole) {
        if (onUnauthorized) {
          onUnauthorized();
        } else {
          router.push('/portal/unauthorized');
        }
        return;
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requiredPermission,
    requiredPermissions,
    requiredRole,
    requiredRoles,
    requireAny,
    redirectTo,
    onUnauthorized,
    router,
  ]);

  // Show loading state
  if (isLoading) {
    return fallback || <AuthLoadingState />;
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return fallback || null;
  }

  // Render protected content
  return <>{children}</>;
}

/**
 * Permission check helpers
 */
function checkPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(required)) return true;

  const [category] = required.split('.');
  if (userPermissions.includes(`${category}.*`)) return true;

  return false;
}

function checkAnyPermission(userPermissions: string[], required: string[]): boolean {
  return required.some((perm) => checkPermission(userPermissions, perm));
}

function checkAllPermissions(userPermissions: string[], required: string[]): boolean {
  return required.every((perm) => checkPermission(userPermissions, perm));
}

function checkAnyRole(userRoles: string[], required: string[]): boolean {
  return required.some((role) => userRoles.includes(role));
}

function checkAllRoles(userRoles: string[], required: string[]): boolean {
  return required.every((role) => userRoles.includes(role));
}

/**
 * Default loading state
 */
function AuthLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-slate text-lg">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Require Auth HOC
 *
 * Wraps a component with authentication requirement.
 *
 * @example
 * const ProtectedPage = requireAuth(MyPage, { requiredPermission: 'portal.orders.view' });
 */
export function requireAuth<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<PortalAuthGuardProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <PortalAuthGuard {...guardProps}>
        <Component {...props} />
      </PortalAuthGuard>
    );
  };
}

/**
 * Permission-based conditional rendering
 */
interface PermissionGateProps {
  permission: string;
  permissions?: string[];
  requireAny?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAny = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { user } = usePortalSession();

  if (!user) return <>{fallback}</>;

  const perms = permissions || [permission];
  const hasPermission = requireAny
    ? checkAnyPermission(user.permissions, perms)
    : checkAllPermissions(user.permissions, perms);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Role-based conditional rendering
 */
interface RoleGateProps {
  role: string;
  roles?: string[];
  requireAny?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({
  role,
  roles,
  requireAny = false,
  children,
  fallback = null,
}: RoleGateProps) {
  const { user } = usePortalSession();

  if (!user) return <>{fallback}</>;

  const requiredRoles = roles || [role];
  const hasRole = requireAny
    ? checkAnyRole(user.roles, requiredRoles)
    : checkAllRoles(user.roles, requiredRoles);

  return hasRole ? <>{children}</> : <>{fallback}</>;
}
