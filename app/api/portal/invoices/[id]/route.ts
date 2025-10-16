/**
 * Invoice Detail API
 * GET /api/portal/invoices/[id] - Retrieve invoice details
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const user = await requirePermission(request, 'portal.invoices.view');
    const tenant = await requireTenant(request);

    const invoice = await withTenant(tenant.tenantId, async (tx) => {
      return tx.invoice.findFirst({
        where: {
          id,
          tenantId: tenant.tenantId,
          ...(user.customerId ? { customerId: user.customerId } : {}),
        },
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
          order: {
            include: {
              lines: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                    },
                  },
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              paymentDate: true,
              amount: true,
              paymentMethod: true,
              status: true,
              referenceNumber: true,
            },
            orderBy: {
              paymentDate: 'desc',
            },
          },
        },
      });
    });

    if (!invoice) {
      return Errors.notFound('Invoice not found');
    }

    const orderLines = invoice.order?.lines ?? [];

    const response = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customer?.company?.name || 'Unknown Customer',
      status: invoice.status.toLowerCase(),
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.taxAmount),
      shipping: Number(invoice.shippingAmount),
      discount: Number(invoice.discountAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      balanceDue: Number(invoice.balanceDue),
      currency: invoice.currency,
      notes: invoice.notes,
      invoiceDate: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      paidDate: invoice.paidDate ? invoice.paidDate.toISOString() : null,
      orderId: invoice.orderId,
      lines: orderLines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product?.name || 'Unknown Product',
        productSku: line.product?.sku || null,
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice),
        subtotal: Number(line.subtotal),
        totalAmount: Number(line.totalAmount),
      })),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        paymentDate: payment.paymentDate.toISOString(),
        amount: Number(payment.amount),
        paymentMethod: payment.paymentMethod,
        status: payment.status.toLowerCase(),
        referenceNumber: payment.referenceNumber,
      })),
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error fetching invoice:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch invoice');
  }
}
