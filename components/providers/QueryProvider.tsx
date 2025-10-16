'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * TanStack Query Provider for the Leora Platform
 *
 * Provides client-side data fetching, caching, and synchronization
 * across the application. Configured with sensible defaults for
 * the portal and sales rep hub.
 *
 * Features:
 * - Automatic background refetching
 * - Stale-while-revalidate caching strategy
 * - Error retry with exponential backoff
 * - Optimistic updates support
 */

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a client instance per component tree to avoid sharing state
  // between different users in SSR scenarios
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Consider data stale after 30 seconds
            staleTime: 30 * 1000,

            // Cache data for 5 minutes
            gcTime: 5 * 60 * 1000,

            // Retry failed requests up to 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

            // Refetch on window focus for fresh data
            refetchOnWindowFocus: true,

            // Don't refetch on mount if data is fresh
            refetchOnMount: false,

            // Refetch on reconnect to sync state
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
