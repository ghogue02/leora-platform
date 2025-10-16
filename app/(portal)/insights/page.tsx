'use client';

import { useInsights } from '@/lib/hooks/useInsights';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { BarChart3, TrendingUp, TrendingDown, AlertCircle, PieChart } from 'lucide-react';

/**
 * Insights & Analytics Page
 *
 * Comprehensive analytics dashboard with:
 * - Revenue trends and forecasts
 * - Account health metrics
 * - Product performance
 * - Sample conversion rates
 * - Pace tracking (ARPDD)
 *
 * Data source:
 * - /api/portal/insights
 * - Aggregated analytics from multiple models
 */
export default function InsightsPage() {
  const { data: insights, isLoading, error } = useInsights();

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load insights"
          description="We encountered an error loading your analytics data. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-heading-xl font-semibold">Insights & Analytics</h1>
        <p className="text-muted">
          Deep dive into your performance metrics and trends.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Total Revenue</p>
                <p className="text-heading-lg font-semibold">
                  {formatCurrency(insights?.summary.totalRevenue || 0)}
                </p>
                {insights?.summary.revenueChange !== undefined && (
                  <p className={`text-body-sm flex items-center gap-1 mt-1 ${
                    insights.summary.revenueChange >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {insights.summary.revenueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercentage(Math.abs(insights.summary.revenueChange))} vs last month
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Active Accounts</p>
                <p className="text-heading-lg font-semibold">
                  {insights?.summary.activeAccounts || 0}
                </p>
                <p className="text-body-sm text-muted mt-1">
                  {insights?.summary.atRiskAccounts || 0} at risk
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-20" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Sample Conversion</p>
                <p className="text-heading-lg font-semibold">
                  {insights?.samples.conversionRate || 0}%
                </p>
                <p className="text-body-sm text-muted mt-1">
                  {insights?.samples.used || 0} of {insights?.samples.allowance || 60} used
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Orders</p>
                <p className="text-heading-lg font-semibold">
                  {insights?.summary.ordersThisMonth || 0}
                </p>
                {insights?.summary.ordersChange !== undefined && (
                  <p className={`text-body-sm flex items-center gap-1 mt-1 ${
                    insights.summary.ordersChange >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {insights.summary.ordersChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercentage(Math.abs(insights.summary.ordersChange))}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Health Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>
              <PieChart className="h-5 w-5 inline mr-2" />
              Account Health Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : insights?.health ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-success"></div>
                    <span className="text-body-md">Healthy</span>
                  </div>
                  <span className="text-heading-sm font-semibold">
                    {insights.health.healthy}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-warning"></div>
                    <span className="text-body-md">At Risk</span>
                  </div>
                  <span className="text-heading-sm font-semibold">
                    {insights.health.atRisk}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-destructive"></div>
                    <span className="text-body-md">Critical</span>
                  </div>
                  <span className="text-heading-sm font-semibold">
                    {insights.health.critical}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-indigo"></div>
                    <span className="text-body-md">Needs Attention</span>
                  </div>
                  <span className="text-heading-sm font-semibold">
                    {insights.health.needsAttention}
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No health data"
                description="Health metrics will appear as you build your account base."
              />
            )}
          </CardContent>
        </Card>

        {/* Ordering Pace */}
        <Card>
          <CardHeader>
            <CardTitle>
              <BarChart3 className="h-5 w-5 inline mr-2" />
              Ordering Pace
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : insights?.pace ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-success"></div>
                    <span className="text-body-md">On Pace</span>
                  </div>
                  <span className="text-heading-sm font-semibold">
                    {insights.pace.onPace}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-warning"></div>
                    <span className="text-body-md">Slipping</span>
                  </div>
                  <span className="text-heading-sm font-semibold">
                    {insights.pace.slipping}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-destructive"></div>
                    <span className="text-body-md">Overdue</span>
                  </div>
                  <span className="text-heading-sm font-semibold">
                    {insights.pace.overdue}
                  </span>
                </div>
                <div className="mt-6 p-4 bg-muted rounded-card">
                  <p className="text-caption text-muted mb-1">ARPDD Metric</p>
                  <p className="text-body-sm">
                    Average Realized Period Days Delivered measures the time between customer orders.
                    A 15% drop triggers at-risk alerts.
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No pace data"
                description="Pace tracking will appear as orders are placed."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Opportunities */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top Revenue Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : insights?.opportunities && insights.opportunities.length > 0 ? (
            <div className="space-y-3">
              {insights.opportunities.map((opp, index) => (
                <div
                  key={opp.productId}
                  className="flex items-center justify-between p-4 rounded-card border-2 border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center">
                      <span className="text-heading-sm font-semibold text-gold">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-body-md">{opp.productName}</h3>
                      <p className="text-caption text-muted">{opp.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-heading-sm">
                      {formatCurrency(opp.potentialRevenue)}
                    </p>
                    <p className="text-caption text-muted">
                      {opp.customerPenetration}% penetration
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No opportunities yet"
              description="Revenue opportunities will appear based on your account activity and product performance."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
