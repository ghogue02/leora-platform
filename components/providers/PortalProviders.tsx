'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { PortalSessionProvider } from './PortalSessionProvider';
import { Toaster } from '@/components/ui/toast';

/**
 * Combined Providers for Leora Portal
 *
 * Wraps the portal application with all necessary context providers:
 * - QueryProvider: TanStack Query for data fetching and caching
 * - PortalSessionProvider: Session management and authentication state
 * - Toaster: Global toast notifications
 *
 * Order matters: QueryProvider must wrap PortalSessionProvider since
 * session hooks may use react-query internally.
 *
 * @example
 * ```tsx
 * // In portal layout
 * export default function PortalLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <PortalProviders>
 *       <PortalAuthGuard>
 *         {children}
 *       </PortalAuthGuard>
 *     </PortalProviders>
 *   );
 * }
 * ```
 */
export function PortalProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <PortalSessionProvider>
        {children}
        <Toaster />
      </PortalSessionProvider>
    </QueryProvider>
  );
}
