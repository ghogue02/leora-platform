'use client';

import { useMemo } from 'react';
import { getDemoInsights } from '@/lib/demo/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Demo Dashboard
 *
 * Lightweight client page that renders deterministic analytics without
 * depending on the insights API or database connectivity. Ideal for environments
 * where the production data pipeline has not been provisioned yet.
 */
export default function DemoDashboardPage() {
  const insights = useMemo(() => getDemoInsights(), []);

  if (!insights) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-xl text-center space-y-4">
          <Skeleton className="h-9 w-48 mx-auto" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-heading-xl font-semibold">Demo Dashboard</h1>
        <p className="text-muted">
          Explore sample insights even when production data is offline. Replace this view once the live metrics service is ready.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Orders This Month"
          value={insights.summary.ordersThisMonth}
          change={insights.summary.ordersChange}
        />
        <MetricCard
          label="Revenue This Month"
          value={insights.summary.totalRevenue}
          change={insights.summary.revenueChange}
          formatter={formatCurrency}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-label text-muted mb-1">Active Accounts</p>
            <div className="text-heading-lg font-semibold">
              {insights.summary.activeAccounts}
            </div>
            <p className="text-body-sm text-muted">
              {insights.summary.atRiskAccounts} flagged as at-risk
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-label text-muted mb-1">Sample Budget Usage</p>
            <div className="text-heading-lg font-semibold">
              {insights.samples.used} / {insights.samples.allowance}
            </div>
            <p className="text-body-sm text-muted">
              Conversion rate {formatPercentage(insights.samples.conversionRate)}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card elevated>
          <CardHeader>
            <CardTitle>Alerts &amp; Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-card border border-border p-4"
              >
                <AlertCircle
                  className={`h-5 w-5 flex-shrink-0 ${
                    alert.severity === 'high'
                      ? 'text-destructive'
                      : alert.severity === 'medium'
                      ? 'text-warning'
                      : 'text-muted'
                  }`}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.accountName}</span>
                    <Badge
                      variant={
                        alert.severity === 'high'
                          ? 'destructive'
                          : alert.severity === 'medium'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {alert.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-body-sm text-muted">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card elevated>
          <CardHeader>
            <CardTitle>Top Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.opportunities.map((opp) => (
              <div key={opp.productId} className="rounded-card border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{opp.productName}</p>
                    <p className="text-body-xs text-muted">{opp.category}</p>
                  </div>
                  <Badge>{formatCurrency(opp.potentialRevenue)}</Badge>
                </div>
                <p className="text-body-sm text-muted mt-2">
                  Customer penetration {formatPercentage(opp.customerPenetration)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Health</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {Object.entries(insights.health).map(([key, value]) => (
              <div key={key} className="rounded-card bg-muted p-4">
                <p className="text-label text-muted capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-heading-md font-semibold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pace Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <PaceMetric label="On Pace" value={insights.pace.onPace} tone="success" />
            <PaceMetric label="Slipping" value={insights.pace.slipping} tone="warning" />
            <PaceMetric label="Overdue" value={insights.pace.overdue} tone="destructive" />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 rounded-card border border-border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-body-xs text-muted">
                    {new Date(order.orderDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="text-heading-sm font-semibold">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  change?: number;
  formatter?: (value: number) => string;
}

function MetricCard({ label, value, change, formatter }: MetricCardProps) {
  const formattedValue = formatter ? formatter(value) : value.toLocaleString();
  const isPositive = change !== undefined ? change >= 0 : true;

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-label text-muted mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-heading-lg font-semibold">{formattedValue}</p>
          {change !== undefined && (
            <span
              className={`text-body-sm flex items-center gap-1 ${
                isPositive ? 'text-success' : 'text-destructive'
              }`}
            >
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatPercentage(Math.abs(change))}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PaceMetricProps {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'destructive';
}

function PaceMetric({ label, value, tone }: PaceMetricProps) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-destructive';

  return (
    <div className="rounded-card bg-muted p-4">
      <p className="text-label text-muted">{label}</p>
      <p className={`text-heading-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
