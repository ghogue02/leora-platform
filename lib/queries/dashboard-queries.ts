/**
 * Dashboard Queries
 *
 * Pre-built Prisma queries for dashboard and intelligence features.
 * Optimized for performance with proper indexing and data fetching strategies.
 *
 * Blueprint Reference: Section 7.1
 */

import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Get accounts that need attention (combined pace + health risks)
 */
export async function getAccountsNeedingAttention(
  prisma: PrismaClient,
  tenantId: string,
  limit: number = 20
) {
  // This would ideally use a materialized view or cached metrics table
  // For now, we'll query recent health snapshots
  const snapshots = await prisma.accountHealthSnapshot.findMany({
    where: {
      tenantId,
      healthScore: {
        in: ['critical', 'warning'],
      },
      snapshotDate: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          companyName: true,
          accountNumber: true,
        },
      },
    },
    orderBy: [
      {
        revenueDropPercent: 'desc', // worst drops first
      },
    ],
    take: limit,
  });

  return snapshots;
}

/**
 * Get revenue trends for an account (monthly)
 */
export async function getAccountRevenueTrends(
  prisma: PrismaClient,
  accountId: string,
  tenantId: string,
  months: number = 12
) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      customerId: accountId,
      status: 'DELIVERED',
      actualDeliveryDate: {
        gte: startDate,
      },
    },
    include: {
      lines: {
        select: {
          subtotal: true,
        },
      },
    },
    orderBy: {
      actualDeliveryDate: 'asc',
    },
  });

  // Group by month
  const monthlyRevenue = new Map<string, number>();

  orders.forEach((order) => {
    if (!order.actualDeliveryDate) return;

    const date = new Date(order.actualDeliveryDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const revenue = order.lines.reduce((sum, line) => sum + Number(line.subtotal || 0), 0);

    monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + revenue);
  });

  return Array.from(monthlyRevenue.entries()).map(([key, revenue]) => ({
    month: key,
    revenue,
  }));
}

/**
 * Get top products by revenue for a time period
 */
export async function getTopProductsByRevenue(
  prisma: PrismaClient,
  tenantId: string,
  days: number = 180,
  limit: number = 20
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const productRevenue = await prisma.orderLine.groupBy({
    by: ['productId'],
    where: {
      order: {
        tenantId,
        status: 'DELIVERED',
        actualDeliveryDate: {
          gte: startDate,
        },
      },
    },
    _sum: {
      subtotal: true,
      quantity: true,
    },
    orderBy: {
      _sum: {
        subtotal: 'desc',
      },
    },
    take: limit,
  });

  // Fetch product details
  const productIds = productRevenue.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    include: {
      supplier: {
        select: {
          name: true,
        },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return productRevenue.map((pr) => {
    const product = productMap.get(pr.productId);
    return {
      productId: pr.productId,
      productName: product?.name || 'Unknown',
      categoryName: product?.category,
      supplierName: product?.supplier?.name,
      totalRevenue: Number(pr._sum.subtotal || 0),
      totalUnits: Number(pr._sum.quantity || 0),
    };
  });
}

/**
 * Get customer penetration for products
 */
export async function getProductPenetration(
  prisma: PrismaClient,
  tenantId: string,
  days: number = 180,
  limit: number = 20
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get total active customers
  const totalCustomers = await prisma.customer.count({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
  });

  // Get product purchase data
  const orderLines = await prisma.orderLine.findMany({
    where: {
      order: {
        tenantId,
        status: 'DELIVERED',
        actualDeliveryDate: {
          gte: startDate,
        },
      },
    },
    select: {
      productId: true,
      order: {
        select: {
          customerId: true,
        },
      },
    },
  });

  // Count unique customers per product
  const productCustomers = new Map<string, Set<string>>();

  orderLines.forEach((line) => {
    if (!productCustomers.has(line.productId)) {
      productCustomers.set(line.productId, new Set());
    }
    productCustomers.get(line.productId)!.add(line.order.customerId);
  });

  // Calculate penetration
  const penetrationData = Array.from(productCustomers.entries())
    .map(([productId, customers]) => ({
      productId,
      customerCount: customers.size,
      penetration: totalCustomers > 0 ? (customers.size / totalCustomers) * 100 : 0,
    }))
    .sort((a, b) => b.penetration - a.penetration)
    .slice(0, limit);

  // Fetch product details
  const productIds = penetrationData.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    include: {
      supplier: {
        select: {
          name: true,
        },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return penetrationData.map((pd) => {
    const product = productMap.get(pd.productId);
    return {
      productId: pd.productId,
      productName: product?.name || 'Unknown',
      categoryName: product?.category,
      supplierName: product?.supplier?.name,
      customerCount: pd.customerCount,
      penetrationPercent: Math.round(pd.penetration * 10) / 10,
      totalCustomers,
    };
  });
}

/**
 * Get sample utilization by sales rep
 * TODO: Implement when sampleTransfer model is added to schema
 */
export async function getSampleUtilization(
  prisma: PrismaClient,
  tenantId: string,
  year: number,
  month: number
) {
  console.log('[Dashboard Queries] getSampleUtilization not yet implemented');
  return [];
}

/**
 * Get activity summary for an account
 */
export async function getAccountActivitySummary(
  prisma: PrismaClient,
  accountId: string,
  tenantId: string,
  days: number = 90
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const activities = await prisma.activity.findMany({
    where: {
      tenantId,
      customerId: accountId,
      activityDate: {
        gte: startDate,
      },
    },
    include: {
      user: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: {
      activityDate: 'desc',
    },
  });

  // Count by type
  const byType = new Map<string, number>();
  activities.forEach((activity) => {
    const typeName = activity.activityType || 'unknown';
    byType.set(typeName, (byType.get(typeName) || 0) + 1);
  });

  return {
    totalActivities: activities.length,
    byType: Object.fromEntries(byType),
    recentActivities: activities.slice(0, 10).map((a) => ({
      id: a.id,
      type: a.activityType || 'unknown',
      date: a.activityDate,
      notes: a.notes,
      assignedTo: a.user?.fullName,
    })),
  };
}

/**
 * Get call plan coverage metrics
 */
export async function getCallPlanCoverage(
  prisma: PrismaClient,
  tenantId: string,
  salesRepId?: string
) {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const callPlans = await prisma.callPlan.findMany({
    where: {
      tenantId,
      ...(salesRepId && { userId: salesRepId }),
      planDate: {
        gte: now,
        lte: nextWeek,
      },
    },
    include: {
      customer: {
        select: {
          companyName: true,
        },
      },
      user: {
        select: {
          fullName: true,
        },
      },
    },
  });

  const byStatus = new Map<string, number>();
  callPlans.forEach((plan) => {
    byStatus.set(plan.status, (byStatus.get(plan.status) || 0) + 1);
  });

  return {
    totalPlans: callPlans.length,
    byStatus: Object.fromEntries(byStatus),
    plans: callPlans.map((p) => ({
      id: p.id,
      customerName: p.customer?.companyName || 'Unknown',
      salesRepName: p.user?.fullName || 'Unknown',
      planDate: p.planDate,
      status: p.status,
      objective: p.objective,
    })),
  };
}
