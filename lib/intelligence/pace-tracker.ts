/**
 * Pace Tracker Engine
 *
 * Calculates Average Recent Purchase Day Distance (ARPDD) - the established
 * ordering cadence for each account based on their order history.
 *
 * Algorithm:
 * 1. Gather recent fulfilled orders for the account (configurable lookback window)
 * 2. Calculate intervals between consecutive order dates
 * 3. Compute average interval (ARPDD) from these gaps
 * 4. Flag accounts when current days since last order exceeds ARPDD threshold
 *
 * Blueprint Reference: Section 1.2 "Ordering cadence is opaque"
 */

import { PrismaClient } from '@prisma/client';

export interface PaceMetrics {
  accountId: string;
  accountName: string;
  arpdd: number | null; // Average days between orders
  daysSinceLastOrder: number;
  lastOrderDate: Date | null;
  orderCount: number;
  isPastDue: boolean;
  riskLevel: 'on-track' | 'warning' | 'critical' | 'insufficient-data';
  nextExpectedOrderDate: Date | null;
  calculatedAt: Date;
}

export interface PaceConfig {
  minimumOrdersRequired: number; // Default: 3 (need at least 3 orders to establish pace)
  lookbackDays: number; // Default: 180 (6 months)
  warningThresholdMultiplier: number; // Default: 1.2 (warn at 120% of ARPDD)
  criticalThresholdMultiplier: number; // Default: 1.5 (critical at 150% of ARPDD)
}

const DEFAULT_CONFIG: PaceConfig = {
  minimumOrdersRequired: 3,
  lookbackDays: 180,
  warningThresholdMultiplier: 1.2,
  criticalThresholdMultiplier: 1.5,
};

/**
 * Calculate ARPDD and pace metrics for a single account
 */
export async function calculateAccountPace(
  prisma: PrismaClient,
  accountId: string,
  tenantId: string,
  config: Partial<PaceConfig> = {}
): Promise<PaceMetrics> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Fetch recent fulfilled orders sorted by fulfillment date
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - finalConfig.lookbackDays);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      customerId: accountId,
      status: 'DELIVERED',
      actualDeliveryDate: {
        gte: lookbackDate,
      },
    },
    orderBy: {
      actualDeliveryDate: 'asc',
    },
    select: {
      id: true,
      actualDeliveryDate: true,
      orderNumber: true,
    },
  });

  const now = new Date();
  const lastOrder = orders[orders.length - 1];
  const lastOrderDate = lastOrder?.actualDeliveryDate ?? null;
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    : -1;

  // Calculate intervals between consecutive orders
  const intervals: number[] = [];
  for (let i = 1; i < orders.length; i++) {
    const prevDate = orders[i - 1].actualDeliveryDate!;
    const currDate = orders[i].actualDeliveryDate!;
    const intervalDays = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    intervals.push(intervalDays);
  }

  // Calculate ARPDD (average of intervals)
  const arpdd =
    intervals.length > 0
      ? Math.round(intervals.reduce((sum, val) => sum + val, 0) / intervals.length)
      : null;

  // Determine risk level
  let riskLevel: PaceMetrics['riskLevel'] = 'insufficient-data';
  let isPastDue = false;
  let nextExpectedOrderDate: Date | null = null;

  if (orders.length >= finalConfig.minimumOrdersRequired && arpdd !== null && lastOrderDate) {
    nextExpectedOrderDate = new Date(lastOrderDate);
    nextExpectedOrderDate.setDate(nextExpectedOrderDate.getDate() + arpdd);

    const warningThreshold = arpdd * finalConfig.warningThresholdMultiplier;
    const criticalThreshold = arpdd * finalConfig.criticalThresholdMultiplier;

    if (daysSinceLastOrder >= criticalThreshold) {
      riskLevel = 'critical';
      isPastDue = true;
    } else if (daysSinceLastOrder >= warningThreshold) {
      riskLevel = 'warning';
      isPastDue = true;
    } else {
      riskLevel = 'on-track';
      isPastDue = false;
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
    arpdd,
    daysSinceLastOrder,
    lastOrderDate,
    orderCount: orders.length,
    isPastDue,
    riskLevel,
    nextExpectedOrderDate,
    calculatedAt: now,
  };
}

/**
 * Calculate pace metrics for all active accounts in a tenant
 */
export async function calculateTenantPace(
  prisma: PrismaClient,
  tenantId: string,
  config: Partial<PaceConfig> = {},
  filters?: {
    onlyAtRisk?: boolean;
    minOrderCount?: number;
  }
): Promise<PaceMetrics[]> {
  // Get all active customers for the tenant
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  // Calculate pace for each customer in parallel
  const pacePromises = customers.map((customer) =>
    calculateAccountPace(prisma, customer.id, tenantId, config)
  );

  let results = await Promise.all(pacePromises);

  // Apply filters
  if (filters?.onlyAtRisk) {
    results = results.filter((p) => p.isPastDue);
  }

  if (filters?.minOrderCount !== undefined) {
    results = results.filter((p) => p.orderCount >= filters.minOrderCount!);
  }

  // Sort by risk level (critical first) then by days past due
  return results.sort((a, b) => {
    const riskOrder = { critical: 0, warning: 1, 'on-track': 2, 'insufficient-data': 3 };
    const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;
    return b.daysSinceLastOrder - a.daysSinceLastOrder;
  });
}

/**
 * Get pace configuration for a tenant (with fallback to defaults)
 */
export async function getTenantPaceConfig(
  prisma: PrismaClient,
  tenantId: string
): Promise<PaceConfig> {
  // TODO: Implement pace tracking config storage in tenant settings
  return DEFAULT_CONFIG;
}

/**
 * Update tenant pace configuration
 */
export async function updateTenantPaceConfig(
  prisma: PrismaClient,
  tenantId: string,
  config: Partial<PaceConfig>
): Promise<void> {
  // TODO: Implement pace tracking config storage in tenant settings
  console.log('TODO: Store pace config for tenant', tenantId, config);
}
