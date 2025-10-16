/**
 * Order Detail API
 * GET /api/portal/orders/[id] - Get order details
 * PATCH /api/portal/orders/[id] - Update order
 * DELETE /api/portal/orders/[id] - Cancel order
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

/**
 * Get order details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    // RBAC: Require permission to read orders
    const user = await requirePermission(request, 'portal.orders.view');

    // Tenant isolation
    const tenant = await requireTenant(request);

    const order = await withTenant(tenant.tenantId, async (tx) => {
      return tx.order.findFirst({
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
              tradeName: true,
            },
          },
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
      });
    });

    if (!order) {
      return Errors.notFound('Order not found');
    }

    const shippingAddressRaw = order.shippingAddress as Record<string, unknown> | null;
    let shippingAddress: { street: string; city: string; state: string; zip: string } | null =
      null;

    if (shippingAddressRaw && typeof shippingAddressRaw === 'object') {
      const shippingObject = shippingAddressRaw as Record<string, unknown>;

      const getValue = (key: string, fallbackKeys: string[] = []): string => {
        if (shippingObject[key] !== undefined && shippingObject[key] !== null) {
          return String(shippingObject[key]);
        }
        for (const altKey of fallbackKeys) {
          if (shippingObject[altKey] !== undefined && shippingObject[altKey] !== null) {
            return String(shippingObject[altKey]);
          }
        }
        return '';
      };

      shippingAddress = {
        street: getValue('street', ['line1', 'addressLine1']),
        city: getValue('city'),
        state: getValue('state', ['region', 'province']),
        zip: getValue('zip', ['postalCode', 'zipCode']),
      };

      if (
        !shippingAddress.street &&
        !shippingAddress.city &&
        !shippingAddress.state &&
        !shippingAddress.zip
      ) {
        shippingAddress = null;
      }
    }

    const lines = order.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.product?.name || 'Unknown Product',
      skuId: line.product?.sku || null,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      totalPrice: Number(line.totalAmount),
    }));

    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName:
        order.customer?.tradeName ||
        order.customer?.company?.name ||
        'Unknown Customer',
      status: order.status.toLowerCase(),
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subtotal),
      tax: Number(order.taxAmount),
      shipping: Number(order.shippingAmount),
      lines,
      shippingAddress,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      requestedDeliveryDate: order.requestedDeliveryDate
        ? order.requestedDeliveryDate.toISOString()
        : null,
      actualDeliveryDate: order.actualDeliveryDate
        ? order.actualDeliveryDate.toISOString()
        : null,
    };

    return successResponse(formattedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch order');
  }
}

/**
 * Update order (partial update)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    // RBAC: Require permission to update orders
    const user = await requirePermission(request, 'portal.orders.update');

    // Tenant isolation
    const tenant = await requireTenant(request);

    const body = await request.json();

    // TODO: Implement order update with Prisma
    // Validate order exists and belongs to tenant/customer
    // Update allowed fields (notes, requestedDeliveryDate, etc.)

    const updatedOrder = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return successResponse(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to update order');
  }
}

/**
 * Cancel order
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    // RBAC: Require permission to cancel orders
    const user = await requirePermission(request, 'portal.orders.cancel');

    // Tenant isolation
    const tenant = await requireTenant(request);

    // TODO: Implement order cancellation with Prisma
    // Check if order can be cancelled (not shipped/delivered)
    // Update status to cancelled
    // Restore inventory

    return successResponse({
      id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error cancelling order:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to cancel order');
  }
}
