/**
 * Analytics & Insights API
 * GET /api/portal/insights - Get insights dashboard
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { insightFilterSchema } from '@/lib/validations/portal';
import { withTenant } from '@/lib/prisma';
import type { OrderStatus } from '@prisma/client';

/**
 * Get insights and analytics
 */
export async function GET(request: NextRequest) {
  try {
    // RBAC: Require permission to read insights
    const user = await requirePermission(request, 'portal.insights.view');

    // Tenant isolation
    const tenant = await requireTenant(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = insightFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const { type, startDate, endDate } = validatedParams.data;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const endOfPreviousMonth = new Date(startOfMonth.getTime() - 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const insights = await withTenant(tenant.tenantId, async (tx) => {
      const excludedStatuses: OrderStatus[] = ['CANCELLED', 'DRAFT'];

      const ordersWhereCurrent = {
        tenantId: tenant.tenantId,
        status: { notIn: excludedStatuses },
        orderDate: { gte: startOfMonth, lte: now },
      };

      const ordersWherePrevious = {
        tenantId: tenant.tenantId,
        status: { notIn: excludedStatuses },
        orderDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
      };

      const [
        ordersThisMonthCount,
        ordersLastMonthCount,
        revenueThisMonthAgg,
        revenueLastMonthAgg,
        activeAccounts,
        atRiskAccounts,
        ordersLast30Days,
        totalOrders,
        orderLinesSixMonths,
        totalCustomers,
        tenantSettings,
      ] = await Promise.all([
        tx.order.count({ where: ordersWhereCurrent }),
        tx.order.count({ where: ordersWherePrevious }),
        tx.order.aggregate({
          _sum: { totalAmount: true },
          where: ordersWhereCurrent,
        }),
        tx.order.aggregate({
          _sum: { totalAmount: true },
          where: ordersWherePrevious,
        }),
        tx.customer.count({
          where: {
            tenantId: tenant.tenantId,
            status: 'ACTIVE',
          },
        }),
        tx.customer.count({
          where: {
            tenantId: tenant.tenantId,
            status: 'ACTIVE',
            OR: [
              {
                orders: {
                  none: {
                    orderDate: {
                      gte: thirtyDaysAgo,
                    },
                  },
                },
              },
              {
                orders: {
                  some: {
                    orderDate: {
                      lt: thirtyDaysAgo,
                    },
                  },
                },
              },
            ],
          },
        }),
        tx.order.findMany({
          where: {
            tenantId: tenant.tenantId,
            status: { notIn: excludedStatuses },
            orderDate: { gte: thirtyDaysAgo, lte: now },
          },
          select: {
            id: true,
            orderDate: true,
            totalAmount: true,
            actualDeliveryDate: true,
            customer: {
              select: { companyName: true },
            },
          },
          orderBy: {
            orderDate: 'desc',
          },
          take: 10,
        }),
        tx.order.count({
          where: {
            tenantId: tenant.tenantId,
            status: { notIn: excludedStatuses },
            ...(startDate || endDate
              ? {
                  orderDate: {
                    ...(startDate ? { gte: new Date(startDate) } : {}),
                    ...(endDate ? { lte: new Date(endDate) } : {}),
                  },
                }
              : {}),
          },
      }),
        tx.orderLine.findMany({
          where: {
            order: {
              tenantId: tenant.tenantId,
              status: { notIn: excludedStatuses },
              orderDate: {
                gte: sixMonthsAgo,
                lte: now,
              },
            },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
            order: {
              select: {
                customerId: true,
              },
            },
          },
        }),
        tx.customer.count({
          where: {
            tenantId: tenant.tenantId,
          },
        }),
        tx.tenantSettings.findUnique({
          where: {
            tenantId: tenant.tenantId,
          },
        }),
      ]);

      const revenueThisMonth = Number(revenueThisMonthAgg._sum?.totalAmount || 0);
      const revenueLastMonth = Number(revenueLastMonthAgg._sum?.totalAmount || 0);

      const revenueChange =
        revenueLastMonth === 0
          ? revenueThisMonth > 0
            ? 100
            : 0
          : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;

      const ordersChange =
        ordersLastMonthCount === 0
          ? ordersThisMonthCount > 0
            ? 100
            : 0
          : ((ordersThisMonthCount - ordersLastMonthCount) / ordersLastMonthCount) * 100;

      const opportunityMap = new Map<
        string,
        {
          productId: string;
          productName: string;
          category: string | null;
          revenue: number;
          customers: Set<string>;
        }
      >();

      orderLinesSixMonths.forEach((line) => {
        if (!line.product) {
          return;
        }
        const key = line.product.id;
        if (!opportunityMap.has(key)) {
          opportunityMap.set(key, {
            productId: line.product.id,
            productName: line.product.name,
            category: line.product.category,
            revenue: 0,
            customers: new Set<string>(),
          });
        }
        const entry = opportunityMap.get(key)!;
        entry.revenue += Number(line.totalAmount);
        if (line.order?.customerId) {
          entry.customers.add(line.order.customerId);
        }
      });

      const topOpportunities = Array.from(opportunityMap.values())
        .map((entry) => {
          const penetration =
            totalCustomers > 0 ? (entry.customers.size / totalCustomers) * 100 : 0;
          return {
            productId: entry.productId,
            productName: entry.productName,
            potentialRevenue: Number(entry.revenue.toFixed(2)),
            customerPenetration: Number(penetration.toFixed(1)),
            category: entry.category || 'Uncategorized',
          };
        })
        .sort((a, b) => b.potentialRevenue - a.potentialRevenue)
        .slice(0, 10);

      const overdueOrders = ordersLast30Days.filter((order) => {
        if (!order.actualDeliveryDate) {
          const daysSinceOrder =
            (now.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceOrder > 14;
        }
        return false;
      }).length;

      const insightsResult = {
        summary: {
          totalRevenue: Number(revenueThisMonth.toFixed(2)),
          revenueChange: Number(revenueChange.toFixed(2)),
          activeAccounts,
          atRiskAccounts,
          ordersThisMonth: ordersThisMonthCount,
          ordersChange: Number(ordersChange.toFixed(2)),
        },
        health: {
          healthy: Math.max(activeAccounts - atRiskAccounts, 0),
          atRisk: atRiskAccounts,
          critical: Math.min(Math.floor(atRiskAccounts / 3), atRiskAccounts),
          needsAttention: Math.max(atRiskAccounts - Math.floor(atRiskAccounts / 3), 0),
        },
        pace: {
          onPace: Math.max(ordersThisMonthCount - overdueOrders, 0),
          slipping: overdueOrders,
          overdue: overdueOrders,
        },
        samples: {
          used: 0,
          allowance: tenantSettings?.defaultSampleAllowancePerRep ?? 60,
          pending: 0,
          conversionRate: 0,
        },
        opportunities: topOpportunities,
        alerts: [
          ...(atRiskAccounts > 0
            ? [
                {
                  id: 'alert-at-risk',
                  type: 'revenue_risk',
                  severity: atRiskAccounts > 5 ? 'high' : 'medium',
                  accountId: '',
                  accountName: '',
                  message: `${atRiskAccounts} accounts have no orders in the last 30 days`,
                  createdAt: now.toISOString(),
                },
              ]
            : []),
        ],
        recentOrders: ordersLast30Days.map((order) => ({
          id: order.id,
          orderDate: order.orderDate.toISOString(),
          totalAmount: Number(order.totalAmount),
          customerName: order.customer?.companyName || 'Unknown Customer',
        })),
        totals: {
          orders: totalOrders,
        },
      };

      return insightsResult;
    });

    if (type) {
      // In the future we can respond with filtered insight slices. For now return whole object.
      return successResponse(insights);
    }

    return successResponse(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch insights');
  }
}
