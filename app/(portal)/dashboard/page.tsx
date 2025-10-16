'use client';

/**
 * Dashboard Page - Real-time insights connected to live database
 * Uses useInsights hook to fetch real data from /api/portal/insights
 */

import { useInsights } from '@/lib/hooks/useInsights';
import { Loader2 } from 'lucide-react';
import { DashboardOverview } from '@/components/portal/dashboard/DashboardOverview';
import { RecentOrders } from '@/components/portal/dashboard/RecentOrders';
import { TopOpportunities } from '@/components/portal/dashboard/TopOpportunities';
import { AlertsList } from '@/components/portal/dashboard/AlertsList';

export default function DashboardPage() {
  const { data: insights, isLoading, error } = useInsights();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading insights...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            Failed to load insights
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">No insights available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real-time insights and analytics from your account
        </p>
      </div>

      <DashboardOverview insights={insights} />

      <div className="grid gap-6 md:grid-cols-2">
        <RecentOrders orders={insights.recentOrders} />
        <TopOpportunities opportunities={insights.opportunities} />
      </div>

      {insights.alerts && insights.alerts.length > 0 && (
        <AlertsList alerts={insights.alerts} />
      )}
    </div>
  );
}
