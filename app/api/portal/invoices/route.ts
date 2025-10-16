/**
 * Invoices API
 * GET /api/portal/invoices - List invoices with filters
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';
import { invoiceFilterSchema } from '@/lib/validations/portal';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.invoices.view');
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = invoiceFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const {
      status,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = validatedParams.data;

    const allowedSortFields = new Set(['invoiceDate', 'dueDate', 'status', 'totalAmount', 'balanceDue']);
    const sortField = sortBy && allowedSortFields.has(sortBy) ? sortBy : 'invoiceDate';
    const sortDirection = sortOrder ?? 'desc';
    const statusFilter = status ? status.toUpperCase() : undefined;

    const result = await withTenant(tenant.tenantId, async (tx) => {
      const where: any = {
        tenantId: tenant.tenantId,
      };

      if (user.customerId) {
        where.customerId = user.customerId;
      }

      if (statusFilter) {
        where.status = statusFilter;
      }

      if (startDate || endDate) {
        where.invoiceDate = {};
        if (startDate) {
          where.invoiceDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.invoiceDate.lte = new Date(endDate);
        }
      }

      const [invoices, total, aggregates] = await Promise.all([
        tx.invoice.findMany({
          where,
          include: {
            customer: {
              select: {
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            [sortField]: sortDirection,
          },
          take: limit,
          skip: (page - 1) * limit,
        }),
        tx.invoice.count({ where }),
        tx.invoice.aggregate({
          _sum: {
            balanceDue: true,
            totalAmount: true,
          },
          where,
        }),
      ]);

      const formatted = invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customer?.company?.name || 'Unknown Customer',
        status: invoice.status.toLowerCase(),
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.taxAmount),
        shipping: Number(invoice.shippingAmount),
        totalAmount: Number(invoice.totalAmount),
        paidAmount: Number(invoice.paidAmount),
        balanceDue: Number(invoice.balanceDue),
        currency: invoice.currency,
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        paidDate: invoice.paidDate ? invoice.paidDate.toISOString() : null,
      }));

      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

      return {
        invoices: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        summary: {
          totalInvoiced: Number(aggregates._sum.totalAmount || 0),
          totalOutstanding: Number(aggregates._sum.balanceDue || 0),
        },
      };
    });

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch invoices');
  }
}
