/**
 * Role-Based Access Control (RBAC) Utilities for Leora Platform
 *
 * Implements permission checking, role hierarchy, and authorization guards
 * for multi-tenant context with support for system-level and tenant-level roles.
 */

import type { TokenPayload } from './jwt';
import type { PermissionCheck } from './types';

/**
 * Permission categories and their permissions
 */
export const PERMISSION_CATEGORIES = {
  // Portal customer permissions
  PORTAL: {
    VIEW_CATALOG: 'portal.catalog.view',
    VIEW_ORDERS: 'portal.orders.view',
    CREATE_ORDERS: 'portal.orders.create',
    VIEW_INVOICES: 'portal.invoices.view',
    VIEW_ACCOUNT: 'portal.account.view',
    MANAGE_ACCOUNT: 'portal.account.manage',
    VIEW_INSIGHTS: 'portal.insights.view',
    VIEW_REPORTS: 'portal.reports.view',
    EXPORT_REPORTS: 'portal.reports.export',
    MANAGE_CART: 'portal.cart.manage',
    MANAGE_FAVORITES: 'portal.favorites.manage',
    MANAGE_LISTS: 'portal.lists.manage',
    VIEW_NOTIFICATIONS: 'portal.notifications.view',
  },

  // Sales rep permissions
  SALES: {
    VIEW_DASHBOARD: 'sales.dashboard.view',
    VIEW_ACCOUNTS: 'sales.accounts.view',
    MANAGE_ACCOUNTS: 'sales.accounts.manage',
    VIEW_ACTIVITIES: 'sales.activities.view',
    CREATE_ACTIVITIES: 'sales.activities.create',
    VIEW_CALL_PLANS: 'sales.call_plans.view',
    MANAGE_CALL_PLANS: 'sales.call_plans.manage',
    VIEW_HEALTH_SCORES: 'sales.health_scores.view',
    VIEW_SAMPLES: 'sales.samples.view',
    MANAGE_SAMPLES: 'sales.samples.manage',
    APPROVE_SAMPLES: 'sales.samples.approve',
    VIEW_METRICS: 'sales.metrics.view',
  },

  // Product & inventory permissions
  CATALOG: {
    VIEW_PRODUCTS: 'catalog.products.view',
    MANAGE_PRODUCTS: 'catalog.products.manage',
    VIEW_INVENTORY: 'catalog.inventory.view',
    MANAGE_INVENTORY: 'catalog.inventory.manage',
    VIEW_PRICING: 'catalog.pricing.view',
    MANAGE_PRICING: 'catalog.pricing.manage',
  },

  // Order management permissions
  ORDERS: {
    VIEW_ALL_ORDERS: 'orders.all.view',
    MANAGE_ORDERS: 'orders.manage',
    APPROVE_ORDERS: 'orders.approve',
    CANCEL_ORDERS: 'orders.cancel',
    MODIFY_ORDERS: 'orders.modify',
  },

  // Admin permissions
  ADMIN: {
    VIEW_USERS: 'admin.users.view',
    MANAGE_USERS: 'admin.users.manage',
    VIEW_ROLES: 'admin.roles.view',
    MANAGE_ROLES: 'admin.roles.manage',
    VIEW_SETTINGS: 'admin.settings.view',
    MANAGE_SETTINGS: 'admin.settings.manage',
    VIEW_INTEGRATIONS: 'admin.integrations.view',
    MANAGE_INTEGRATIONS: 'admin.integrations.manage',
    VIEW_WEBHOOKS: 'admin.webhooks.view',
    MANAGE_WEBHOOKS: 'admin.webhooks.manage',
  },

  // System-level permissions
  SYSTEM: {
    MANAGE_TENANTS: 'system.tenants.manage',
    VIEW_SYSTEM_LOGS: 'system.logs.view',
    MANAGE_SYSTEM_CONFIG: 'system.config.manage',
  },
} as const;

/**
 * Flatten permissions object to array
 */
export function getAllPermissions(): string[] {
  return Object.values(PERMISSION_CATEGORIES).flatMap((category) =>
    Object.values(category)
  );
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Wildcard permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Category-level wildcard (e.g., "portal.*" grants all portal permissions)
  const [category] = requiredPermission.split('.');
  if (userPermissions.includes(`${category}.*`)) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(userPermissions, permission)
  );
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(userPermissions, permission)
  );
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[], requiredRole: string): boolean {
  return userRoles.includes(requiredRole);
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Comprehensive permission check with detailed result
 */
export function checkPermission(
  user: Pick<TokenPayload, 'permissions' | 'roles'>,
  requiredPermission: string
): PermissionCheck {
  if (hasPermission(user.permissions, requiredPermission)) {
    return {
      granted: true,
    };
  }

  return {
    granted: false,
    reason: 'Insufficient permissions',
    requiredPermission,
    userPermissions: user.permissions,
  };
}

/**
 * Check permission and throw error if denied
 */
export function requirePermission(
  user: Pick<TokenPayload, 'permissions' | 'roles'> | null,
  requiredPermission: string
): void {
  if (!user) {
    throw new Error('Authentication required');
  }

  const check = checkPermission(user, requiredPermission);
  if (!check.granted) {
    throw new Error(
      `Permission denied: ${requiredPermission}. ${check.reason || ''}`
    );
  }
}

/**
 * Check if user can access portal (has any portal permission)
 */
export function canAccessPortal(user: Pick<TokenPayload, 'permissions'>): boolean {
  const portalPermissions = Object.values(PERMISSION_CATEGORIES.PORTAL);
  return hasAnyPermission(user.permissions, portalPermissions);
}

/**
 * Check if user is a sales rep
 */
export function isSalesRep(user: Pick<TokenPayload, 'roles' | 'permissions'>): boolean {
  return (
    hasRole(user.roles, 'sales_rep') ||
    hasAnyPermission(user.permissions, Object.values(PERMISSION_CATEGORIES.SALES))
  );
}

/**
 * Check if user is a manager
 */
export function isManager(user: Pick<TokenPayload, 'roles'>): boolean {
  return hasAnyRole(user.roles, ['sales_manager', 'account_manager']);
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: Pick<TokenPayload, 'roles' | 'permissions'>): boolean {
  return (
    hasRole(user.roles, 'admin') ||
    hasPermission(user.permissions, 'admin.*') ||
    hasPermission(user.permissions, '*')
  );
}

/**
 * Check if user is a system admin
 */
export function isSystemAdmin(user: Pick<TokenPayload, 'roles' | 'permissions'>): boolean {
  return (
    hasRole(user.roles, 'system_admin') ||
    hasAnyPermission(user.permissions, Object.values(PERMISSION_CATEGORIES.SYSTEM))
  );
}

/**
 * Get permission scope (tenant or system)
 */
export function getPermissionScope(permission: string): 'tenant' | 'system' | 'unknown' {
  if (permission.startsWith('system.')) {
    return 'system';
  }
  if (permission === '*') {
    return 'system';
  }
  return 'tenant';
}

/**
 * Filter permissions by scope
 */
export function filterPermissionsByScope(
  permissions: string[],
  scope: 'tenant' | 'system'
): string[] {
  return permissions.filter((permission) => {
    const permScope = getPermissionScope(permission);
    return permScope === scope || permScope === 'unknown';
  });
}

/**
 * Validate permission string format
 */
export function isValidPermission(permission: string): boolean {
  // Wildcard
  if (permission === '*') {
    return true;
  }

  // Category wildcard (e.g., "portal.*")
  if (permission.endsWith('.*')) {
    const category = permission.slice(0, -2);
    return category.length > 0 && /^[a-z_]+$/.test(category);
  }

  // Specific permission (e.g., "portal.orders.view")
  return /^[a-z_]+\.[a-z_]+\.[a-z_]+$/.test(permission);
}

/**
 * Get all permissions for a list of roles
 * (Note: In production, this should query the database)
 */
export function getPermissionsForRoles(roles: string[]): string[] {
  const rolePermissions: Record<string, string[]> = {
    // Portal roles
    portal_customer: [
      PERMISSION_CATEGORIES.PORTAL.VIEW_CATALOG,
      PERMISSION_CATEGORIES.PORTAL.VIEW_ORDERS,
      PERMISSION_CATEGORIES.PORTAL.CREATE_ORDERS,
      PERMISSION_CATEGORIES.PORTAL.VIEW_INVOICES,
      PERMISSION_CATEGORIES.PORTAL.VIEW_ACCOUNT,
      PERMISSION_CATEGORIES.PORTAL.MANAGE_CART,
      PERMISSION_CATEGORIES.PORTAL.MANAGE_FAVORITES,
    ],

    // Sales roles
    sales_rep: [
      PERMISSION_CATEGORIES.SALES.VIEW_DASHBOARD,
      PERMISSION_CATEGORIES.SALES.VIEW_ACCOUNTS,
      PERMISSION_CATEGORIES.SALES.VIEW_ACTIVITIES,
      PERMISSION_CATEGORIES.SALES.CREATE_ACTIVITIES,
      PERMISSION_CATEGORIES.SALES.VIEW_CALL_PLANS,
      PERMISSION_CATEGORIES.SALES.VIEW_HEALTH_SCORES,
      PERMISSION_CATEGORIES.SALES.VIEW_SAMPLES,
      PERMISSION_CATEGORIES.SALES.MANAGE_SAMPLES,
      PERMISSION_CATEGORIES.SALES.VIEW_METRICS,
    ],
    sales_manager: [
      'sales.*',
      PERMISSION_CATEGORIES.SALES.APPROVE_SAMPLES,
      PERMISSION_CATEGORIES.ORDERS.VIEW_ALL_ORDERS,
    ],

    // Admin roles
    admin: ['portal.*', 'sales.*', 'catalog.*', 'orders.*', 'admin.*'],
    system_admin: ['*'],
  };

  const permissions = new Set<string>();
  roles.forEach((role) => {
    const rolePerms = rolePermissions[role] || [];
    rolePerms.forEach((perm) => permissions.add(perm));
  });

  return Array.from(permissions);
}
