'use client';

import { ReactNode } from 'react';
import { PortalProviders } from '@/components/providers/PortalProviders';
import { PortalLayout } from '@/components/portal/layout/PortalLayout';
import { PortalAuthGuard } from '@/components/auth/PortalAuthGuard';

/**
 * Portal Layout
 * Wraps all authenticated portal routes with providers and layout
 *
 * Includes:
 * - React Query provider
 * - Portal session provider
 * - Portal navigation/sidebar
 * - Authentication guard
 */

interface PortalLayoutWrapperProps {
  children: ReactNode;
}

export default function PortalLayoutWrapper({ children }: PortalLayoutWrapperProps) {
  return (
    <PortalProviders>
      <PortalAuthGuard redirectTo="/login">
        <PortalLayout>{children}</PortalLayout>
      </PortalAuthGuard>
    </PortalProviders>
  );
}
