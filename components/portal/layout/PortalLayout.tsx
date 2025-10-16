'use client';

import * as React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface PortalLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, className }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-ivory">
      <Header onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

      <div className="flex">
        <Sidebar collapsed={sidebarCollapsed} className="hidden lg:block" />

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[1300] bg-ink/50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <Sidebar className="z-[1400] lg:hidden" />
          </>
        )}

        <main
          className={cn(
            'flex-1 p-6 transition-all duration-300',
            sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
            className
          )}
          style={{ marginTop: '4rem' }}
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
