/**
 * Health Scoring System
 *
 * Tracks revenue trends and generates health snapshots for accounts.
 * Flags accounts when current monthly revenue drops ≥15% below established average.
 *
 * Algorithm:
 * 1. Collect fulfilled orders from past N months (configurable, default 6)
 * 2. Calculate monthly revenue totals
 * 3. Compute baseline average (excluding current month)
 * 4. Compare current month to baseline
 * 5. Flag if drop meets or exceeds threshold (default 15%)
 *
 * Blueprint Reference: Section 1.2 "Revenue health slips unnoticed"
 */

import { PrismaClient } from '@prisma/client';

export interface HealthScore {
  accountId: string;
  accountName: string;
  currentMonthRevenue: number;
  baselineAverage: number;
  percentageChange: number;
  isAtRisk: boolean;
  riskLevel: 'healthy' | 'warning' | 'critical' | 'insufficient-data';
  monthlyRevenues: MonthlyRevenue[];
  calculatedAt: Date;
}

export interface MonthlyRevenue {
  year: number;
  month: number;
  revenue: number;
  orderCount: number;
}

export interface HealthConfig {
  minimumMonthsRequired: number; // Default: 3 (need 3+ months to establish baseline)
  lookbackMonths: number; // Default: 6
  warningThresholdPercent: number; // Default: -10 (warn at 10% drop)
  criticalThresholdPercent: number; // Default: -15 (critical at 15% drop)
  excludeCurrentMonth: boolean; // Default: true (don't include partial month in baseline)
}

const DEFAULT_CONFIG: HealthConfig = {
  minimumMonthsRequired: 3,
  lookbackMonths: 6,
  warningThresholdPercent: -10,
  criticalThresholdPercent: -15,
  excludeCurrentMonth: true,
};

/**
 * Calculate health score for a single account
 */
export async function calculateAccountHealth(
  prisma: PrismaClient,
  accountId: string,
  tenantId: string,
  config: Partial<HealthConfig> = {}
): Promise<HealthScore> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Calculate lookback date
  const now = new Date();
  const lookbackDate = new Date(now);
  lookbackDate.setMonth(lookbackDate.getMonth() - finalConfig.lookbackMonths);

  // Fetch delivered orders with line items
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      customerId: accountId,
      status: 'DELIVERED',
      actualDeliveryDate: {
        gte: lookbackDate,
      },
    },
    include: {
      lines: {
        select: {
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
    orderBy: {
      actualDeliveryDate: 'asc',
    },
  });

  // Group orders by month and calculate revenue
  const monthlyMap = new Map<string, MonthlyRevenue>();

  orders.forEach((order) => {
    if (!order.actualDeliveryDate) return;

    const orderDate = new Date(order.actualDeliveryDate);
    const year = orderDate.getFullYear();
    const month = orderDate.getMonth() + 1; // 1-12
    const key = `${year}-${String(month).padStart(2, '0')}`;

    const revenue = order.lines.reduce((sum, line) => sum + Number(line.subtotal || 0), 0);

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        year,
        month,
        revenue: 0,
        orderCount: 0,
      });
    }

    const monthData = monthlyMap.get(key)!;
    monthData.revenue += revenue;
    monthData.orderCount += 1;
  });

  // Sort monthly revenues chronologically
  const monthlyRevenues = Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // Identify current month
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthData = monthlyRevenues.find(
    (m) => m.year === currentYear && m.month === currentMonth
  );
  const currentMonthRevenue = currentMonthData?.revenue || 0;

  // Calculate baseline (exclude current month if configured)
  const baselineMonths = finalConfig.excludeCurrentMonth
    ? monthlyRevenues.filter((m) => !(m.year === currentYear && m.month === currentMonth))
    : monthlyRevenues;

  const baselineAverage =
    baselineMonths.length > 0
      ? baselineMonths.reduce((sum, m) => sum + m.revenue, 0) / baselineMonths.length
      : 0;

  // Calculate percentage change
  const percentageChange =
    baselineAverage > 0
      ? ((currentMonthRevenue - baselineAverage) / baselineAverage) * 100
      : 0;

  // Determine risk level
  let riskLevel: HealthScore['riskLevel'] = 'insufficient-data';
  let isAtRisk = false;

  if (monthlyRevenues.length >= finalConfig.minimumMonthsRequired) {
    if (percentageChange <= finalConfig.criticalThresholdPercent) {
      riskLevel = 'critical';
      isAtRisk = true;
    } else if (percentageChange <= finalConfig.warningThresholdPercent) {
      riskLevel = 'warning';
      isAtRisk = true;
    } else {
      riskLevel = 'healthy';
      isAtRisk = false;
    }
  }

  // Fetch account name
  const customer = await prisma.customer.findUnique({
    where: { id: accountId },
    select: { companyName: true },
  });

  return {
    accountId,
    accountName: customer?.companyName || 'Unknown',
    currentMonthRevenue,
    baselineAverage,
    percentageChange,
    isAtRisk,
    riskLevel,
    monthlyRevenues,
    calculatedAt: now,
  };
}

/**
 * Calculate health scores for all active accounts in a tenant
 */
export async function calculateTenantHealth(
  prisma: PrismaClient,
  tenantId: string,
  config: Partial<HealthConfig> = {},
  filters?: {
    onlyAtRisk?: boolean;
    minMonthCount?: number;
  }
): Promise<HealthScore[]> {
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  // Calculate health for each customer in parallel
  const healthPromises = customers.map((customer) =>
    calculateAccountHealth(prisma, customer.id, tenantId, config)
  );

  let results = await Promise.all(healthPromises);

  // Apply filters
  if (filters?.onlyAtRisk) {
    results = results.filter((h) => h.isAtRisk);
  }

  if (filters?.minMonthCount !== undefined) {
    results = results.filter((h) => h.monthlyRevenues.length >= filters.minMonthCount!);
  }

  // Sort by risk level then by percentage drop
  return results.sort((a, b) => {
    const riskOrder = { critical: 0, warning: 1, healthy: 2, 'insufficient-data': 3 };
    const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;
    return a.percentageChange - b.percentageChange;
  });
}

/**
 * Create or update a health snapshot record
 */
export async function saveHealthSnapshot(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  healthScore: HealthScore
): Promise<void> {
  await prisma.accountHealthSnapshot.create({
    data: {
      tenantId,
      customerId: accountId,
      snapshotDate: healthScore.calculatedAt,
      revenueHealthStatus: healthScore.riskLevel === 'critical' ? 'critical' : healthScore.riskLevel === 'warning' ? 'at_risk' : 'healthy',
      currentMonthRevenue: healthScore.currentMonthRevenue,
      averageMonthRevenue: healthScore.baselineAverage,
      revenueDropPercent: Math.abs(healthScore.percentageChange),
      paceStatus: 'on_track', // TODO: Calculate actual pace status
      metadata: healthScore.monthlyRevenues as any,
    },
  });
}

/**
 * Get tenant health configuration
 */
export async function getTenantHealthConfig(
  prisma: PrismaClient,
  tenantId: string
): Promise<HealthConfig> {
  // TODO: Implement health scoring config storage in tenant settings
  // For now, just return default config
  return DEFAULT_CONFIG;
}

/**
 * Update tenant health configuration
 */
export async function updateTenantHealthConfig(
  prisma: PrismaClient,
  tenantId: string,
  config: Partial<HealthConfig>
): Promise<void> {
  // TODO: Implement health scoring config storage in tenant settings
  console.log('TODO: Store health config for tenant', tenantId, config);
}
