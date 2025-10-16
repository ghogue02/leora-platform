'use client';

import { useInsights } from '@/lib/hooks/useInsights';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertCircle, BarChart3 } from 'lucide-react';

/**
 * Dashboard Page
 *
 * Primary landing page for portal users showing:
 * - Proactive briefings from Leora AI (GPT-5)
 * - Overdue orders and revenue movers
 * - Sample usage vs budget
 * - Upcoming call-plan gaps
 * - Recommended next actions
 *
 * Data sources:
 * - /api/portal/insights (real metrics with fallback demo)
 * - useInsights hook
 * - Prisma queries for account health, orders, activities
 */
export default function DashboardPage() {
  const { data: insights, isLoading, error } = useInsights();

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load dashboard"
          description="We encountered an error loading your dashboard data. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-heading-xl font-semibold">Dashboard</h1>
        <p className="text-muted">
          Clarity you can act on.
        </p>
      </div>

      {/* AI Briefing Card */}
      <Card elevated className="mb-6">
        <CardHeader>
          <CardTitle>Daily Briefing from Leora</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : insights?.alerts && insights.alerts.length > 0 ? (
            <div className="space-y-3">
              {insights.alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-card border-2 border-border p-4"
                >
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                    alert.severity === 'high' ? 'text-destructive' : 'text-warning'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{alert.accountName}</span>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'warning'}>
                        {alert.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-body-sm text-muted">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">
              No urgent items. Your accounts are performing well.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Orders This Month */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Orders This Month</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-heading-lg font-semibold">
                    {insights?.summary.ordersThisMonth || 0}
                  </p>
                  {insights?.summary.ordersChange !== undefined && (
                    <span className={`text-body-sm flex items-center gap-1 ${
                      insights.summary.ordersChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {insights.summary.ordersChange >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatPercentage(Math.abs(insights.summary.ordersChange))}
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-24" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Revenue This Month</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-heading-lg font-semibold">
                    {formatCurrency(insights?.summary.totalRevenue || 0)}
                  </p>
                  {insights?.summary.revenueChange !== undefined && (
                    <span className={`text-body-sm flex items-center gap-1 ${
                      insights.summary.revenueChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {insights.summary.revenueChange >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatPercentage(Math.abs(insights.summary.revenueChange))}
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Accounts at Risk */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Accounts at Risk</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-heading-lg font-semibold text-warning">
                    {insights?.summary.atRiskAccounts || 0}
                  </p>
                  <span className="text-body-sm text-muted">
                    of {insights?.summary.activeAccounts || 0}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sample Budget */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-20" />
              </>
            ) : (
              <>
                <p className="text-label text-muted mb-1">Sample Budget Used</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-heading-lg font-semibold">
                    {insights?.samples.used || 0}
                  </p>
                  <span className="text-body-sm text-muted">
                    of {insights?.samples.allowance || 60}
                  </span>
                </div>
                {insights?.samples && (
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{
                        width: `${(insights.samples.used / insights.samples.allowance) * 100}%`
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Health Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Health</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : insights?.health ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body-md">Healthy</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-success rounded-full w-32">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${(insights.health.healthy / insights.summary.activeAccounts) * 100}%` }}
                      />
                    </div>
                    <span className="text-body-sm font-medium w-8 text-right">
                      {insights.health.healthy}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-md">At Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-warning/20 rounded-full w-32">
                      <div
                        className="h-full bg-warning rounded-full"
                        style={{ width: `${(insights.health.atRisk / insights.summary.activeAccounts) * 100}%` }}
                      />
                    </div>
                    <span className="text-body-sm font-medium w-8 text-right">
                      {insights.health.atRisk}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-md">Critical</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-destructive/20 rounded-full w-32">
                      <div
                        className="h-full bg-destructive rounded-full"
                        style={{ width: `${(insights.health.critical / insights.summary.activeAccounts) * 100}%` }}
                      />
                    </div>
                    <span className="text-body-sm font-medium w-8 text-right">
                      {insights.health.critical}
                    </span>
                  </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Top Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : insights?.opportunities && insights.opportunities.length > 0 ? (
              <div className="space-y-3">
                {insights.opportunities.slice(0, 5).map((opp) => (
                  <div
                    key={opp.productId}
                    className="flex items-center justify-between p-3 rounded-card border-2 border-border"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-body-md">{opp.productName}</p>
                      <p className="text-body-sm text-muted">{opp.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-body-md">
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
                description="Opportunities will appear based on your account activity."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
