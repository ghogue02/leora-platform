'use client';

/**
 * Portal Session Provider for Leora Platform
 *
 * Manages user authentication state with:
 * - Automatic session hydration from cookies
 * - Silent token refresh on expiry
 * - Local storage sync for persistence
 * - React context for global access
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SessionUser } from '@/lib/auth/types';

/**
 * Session context value
 */
interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (updates: Partial<SessionUser>) => void;
}

/**
 * Default session context
 */
const SessionContext = createContext<SessionContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
  updateUser: () => {},
});

/**
 * Hook to access session context
 */
export function usePortalSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('usePortalSession must be used within PortalSessionProvider');
  }
  return context;
}

/**
 * Local storage keys
 */
const STORAGE_KEY_USER = 'leora_portal_user';
const STORAGE_KEY_TENANT = 'leora_portal_tenant';

/**
 * Portal Session Provider Component
 */
export function PortalSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load user from local storage
   */
  const loadUserFromStorage = useCallback((): SessionUser | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
    }
    return null;
  }, []);

  /**
   * Save user to local storage
   */
  const saveUserToStorage = useCallback((user: SessionUser | null) => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_TENANT, user.tenantSlug);
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_TENANT);
      }
    } catch (error) {
      console.error('Failed to save user to storage:', error);
    }
  }, []);

  /**
   * Refresh session from server
   */
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/portal/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          saveUserToStorage(data.user);
          return;
        }
      }

      // If session validation fails, try to refresh token
      if (response.status === 401) {
        const refreshResponse = await fetch('/api/portal/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          // Retry getting user after refresh
          const retryResponse = await fetch('/api/portal/auth/me', {
            method: 'GET',
            credentials: 'include',
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData.success && retryData.user) {
              setUser(retryData.user);
              saveUserToStorage(retryData.user);
              return;
            }
          }
        }
      }

      // Clear session if validation and refresh both fail
      setUser(null);
      saveUserToStorage(null);
    } catch (error) {
      console.error('Session refresh failed:', error);
      setUser(null);
      saveUserToStorage(null);
    }
  }, [saveUserToStorage]);

  /**
   * Login function
   */
  const login = useCallback(
    async (email: string, password: string, tenantSlug?: string) => {
      try {
        const response = await fetch('/api/portal/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password, tenantSlug }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        if (data.success && data.user) {
          setUser(data.user);
          saveUserToStorage(data.user);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    [saveUserToStorage]
  );

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/portal/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      saveUserToStorage(null);
    }
  }, [saveUserToStorage]);

  /**
   * Update user data (for optimistic updates)
   */
  const updateUser = useCallback(
    (updates: Partial<SessionUser>) => {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        saveUserToStorage(updated);
        return updated;
      });
    },
    [saveUserToStorage]
  );

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    const initSession = async () => {
      // Load from storage first for instant hydration
      const storedUser = loadUserFromStorage();
      if (storedUser) {
        setUser(storedUser);
      }

      // Then validate with server
      await refreshSession();
      setIsLoading(false);
    };

    initSession();
  }, [loadUserFromStorage, refreshSession]);

  /**
   * Set up periodic session refresh
   */
  useEffect(() => {
    if (!user) return;

    // Refresh session every 10 minutes
    const refreshInterval = setInterval(() => {
      refreshSession();
    }, 10 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [user, refreshSession]);

  /**
   * Handle visibility change (refresh on tab focus)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, refreshSession]);

  const value: SessionContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshSession,
    updateUser,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Hook to require authentication (redirects if not authenticated)
 */
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = usePortalSession();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login
      window.location.href = '/login';
    }
  }, [isLoading, isAuthenticated]);

  return { user, isLoading, isAuthenticated };
}

/**
 * Hook to check permission
 */
export function usePermission(permission: string): boolean {
  const { user } = usePortalSession();

  if (!user) return false;

  // Check for wildcard
  if (user.permissions.includes('*')) return true;

  // Check exact match
  if (user.permissions.includes(permission)) return true;

  // Check category wildcard
  const [category] = permission.split('.');
  if (user.permissions.includes(`${category}.*`)) return true;

  return false;
}

/**
 * Hook to check role
 */
export function useRole(role: string): boolean {
  const { user } = usePortalSession();
  return user?.roles.includes(role) || false;
}
