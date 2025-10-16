import { TrendingUp, TrendingDown, Users, Package } from 'lucide-react';

interface DashboardOverviewProps {
  insights: {
    summary: {
      totalRevenue: number;
      revenueChange: number;
      activeAccounts: number;
      atRiskAccounts: number;
      ordersThisMonth: number;
      ordersChange: number;
    };
    health?: {
      healthy: number;
      atRisk: number;
      critical: number;
      needsAttention: number;
    };
  };
}

export function DashboardOverview({ insights }: DashboardOverviewProps) {
  const { summary, health } = insights;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Revenue</p>
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
          <div className="mt-1 flex items-center gap-1">
            {summary.revenueChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`text-sm ${
                summary.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {formatPercent(summary.revenueChange)}
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        </div>
      </div>

      {/* Orders Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Orders</p>
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{summary.ordersThisMonth}</p>
          <div className="mt-1 flex items-center gap-1">
            {summary.ordersChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`text-sm ${
                summary.ordersChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {formatPercent(summary.ordersChange)}
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        </div>
      </div>

      {/* Active Accounts Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Active Accounts</p>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{summary.activeAccounts}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {health?.healthy || 0} healthy, {health?.atRisk || 0} at risk
          </p>
        </div>
      </div>

      {/* At Risk Accounts Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">At Risk</p>
          <Users className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold text-amber-600">
            {summary.atRiskAccounts}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Accounts with no recent orders
          </p>
        </div>
      </div>
    </div>
  );
}
