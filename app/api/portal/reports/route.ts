/**
 * Reports API
 * GET /api/portal/reports - Generate reports
 * POST /api/portal/reports - Create custom report
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { reportFilterSchema } from '@/lib/validations/portal';
import { withTenant } from '@/lib/prisma';

/**
 * Generate report
 */
export async function GET(request: NextRequest) {
  try {
    // RBAC: Require permission to read reports
    const user = await requirePermission(request, 'portal.reports.read');

    // Tenant isolation
    const tenant = await requireTenant(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = reportFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const {
      reportType,
      startDate,
      endDate,
      groupBy,
      format,
    } = validatedParams.data;

    if (reportType !== 'sales') {
      return Errors.badRequest(`Report type '${reportType}' is not supported yet`);
    }

    const now = new Date();
    const rangeStart = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rangeEnd = endDate ? new Date(endDate) : now;
    const normalizedGroupBy = groupBy ?? 'day';

    const reportData = await withTenant(tenant.tenantId, async (tx) => {
      const orders = await tx.order.findMany({
        where: {
          tenantId: tenant.tenantId,
          status: { notIn: ['CANCELLED', 'DRAFT'] },
          orderDate: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          totalAmount: true,
        },
        orderBy: {
          orderDate: 'asc',
        },
      });

      const orderLines = await tx.orderLine.findMany({
        where: {
          order: {
            tenantId: tenant.tenantId,
            status: { notIn: ['CANCELLED', 'DRAFT'] },
            orderDate: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return { orders, orderLines };
    });

    const groupKeyForDate = (date: Date) => {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');

      switch (normalizedGroupBy) {
        case 'day':
          return `${year}-${month}-${day}`;
        case 'week': {
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
          const weekNumber = Math.floor(pastDaysOfYear / 7) + 1;
          return `${year}-W${String(weekNumber).padStart(2, '0')}`;
        }
        case 'quarter': {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${year}-Q${quarter}`;
        }
        case 'year':
          return `${year}`;
        case 'month':
        default:
          return `${year}-${month}`;
      }
    };

    const grouped = new Map<
      string,
      {
        revenue: number;
        orders: number;
      }
    >();

    let totalRevenue = 0;

    reportData.orders.forEach((order) => {
      const key = groupKeyForDate(order.orderDate);
      if (!grouped.has(key)) {
        grouped.set(key, { revenue: 0, orders: 0 });
      }
      const entry = grouped.get(key)!;
      const orderTotal = Number(order.totalAmount);
      entry.revenue += orderTotal;
      entry.orders += 1;
      totalRevenue += orderTotal;
    });

    const totalOrders = reportData.orders.length;
    const averageOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;

    const topProductsMap = new Map<
      string,
      {
        id: string;
        name: string;
        revenue: number;
        quantity: number;
      }
    >();

    reportData.orderLines.forEach((line) => {
      const productId = line.productId;
      if (!topProductsMap.has(productId)) {
        topProductsMap.set(productId, {
          id: productId,
          name: line.product?.name ?? 'Unknown Product',
          revenue: 0,
          quantity: 0,
        });
      }
      const entry = topProductsMap.get(productId)!;
      entry.revenue += Number(line.netPrice);
      entry.quantity += Number(line.quantity);
    });

    const topProducts = Array.from(topProductsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const groupedData = Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([period, data]) => ({
        period,
        revenue: Number(data.revenue.toFixed(2)),
        orders: data.orders,
        averageOrderValue: data.orders === 0 ? 0 : Number((data.revenue / data.orders).toFixed(2)),
      }));

    const report = {
      type: reportType,
      period: {
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      },
      groupBy: normalizedGroupBy,
      data: groupedData,
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        topProducts: topProducts.map((product) => ({
          ...product,
          revenue: Number(product.revenue.toFixed(2)),
        })),
      },
      generatedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      const header = 'Period,Revenue,Orders,AverageOrderValue';
      const rows = groupedData
        .map((row) => `${row.period},${row.revenue},${row.orders},${row.averageOrderValue}`)
        .join('\n');

      const csvData = `${header}\n${rows}`;

      return new Response(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      return Errors.serverError('PDF generation not yet implemented');
    }

    return successResponse(report);
  } catch (error) {
    console.error('Error generating report:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to generate report');
  }
}

/**
 * Create custom report (save report configuration)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.reports.create');
    const tenant = await requireTenant(request);

    const body = await request.json();

    // TODO: Implement custom report saving with Prisma
    // Save report configuration for reuse

    const savedReport = {
      id: 'report-config-1',
      name: body.name || 'Custom Report',
      type: body.reportType,
      filters: body.filters || {},
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    return successResponse(savedReport, 201);
  } catch (error) {
    console.error('Error creating report:', error);
    return Errors.serverError('Failed to create report');
  }
}
