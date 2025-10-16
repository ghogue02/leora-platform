/**
 * Analytics & Insights API
 * GET /api/portal/insights - Get insights dashboard
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { insightFilterSchema } from '@/lib/validations/portal';

/**
 * Get insights and analytics
 */
export async function GET(request: NextRequest) {
  try {
    // RBAC: Require permission to read insights
    const user = await requirePermission(request, 'portal.insights.read');

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

    // TODO: Implement insights with Prisma
    // Based on Blueprint Section 1.2, calculate:
    // - Ordering pace (ARPDD - Average Realized Period Days Delivered)
    // - Revenue health (15% drop threshold)
    // - Sample usage vs allowance (60 pulls/month default)
    // - Top opportunities (Top 20 products not purchased)
    // - Account health scores

    const insights = {
      summary: {
        totalRevenue: 125000,
        revenueChange: -8.5,
        activeAccounts: 45,
        atRiskAccounts: 7,
        ordersThisMonth: 123,
        ordersChange: 5.2,
      },
      health: {
        healthy: 30,
        atRisk: 7,
        critical: 3,
        needsAttention: 5,
      },
      pace: {
        onPace: 35,
        slipping: 8,
        overdue: 2,
      },
      samples: {
        used: 45,
        allowance: 60,
        pending: 5,
        conversionRate: 68,
      },
      opportunities: [
        {
          productId: 'prod-top-1',
          productName: 'Premium Wine Selection',
          potentialRevenue: 15000,
          customerPenetration: 78,
          category: 'Wine',
        },
      ],
      alerts: [
        {
          id: 'alert-1',
          type: 'revenue_risk',
          severity: 'high',
          accountId: 'acc-1',
          accountName: 'Demo Account',
          message: 'Revenue dropped 18% below average',
          createdAt: new Date().toISOString(),
        },
      ],
    };

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
