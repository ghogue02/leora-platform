/**
 * Orders API - Order Listing
 * GET /api/portal/orders - List orders
 * POST /api/portal/orders - Create new order
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { Prisma } from '@prisma/client';
import { orderFilterSchema, createOrderSchema } from '@/lib/validations/portal';
import { withTenant } from '@/lib/prisma';
import {
  adjustInventoryForOrder,
  computeTenantCharges,
  generateOrderNumber,
  prepareOrderLines,
} from '@/lib/services/order-service';

/**
 * List orders with filters
 */
export async function GET(request: NextRequest) {
  try {
    // RBAC: Require permission to read orders
    const user = await requirePermission(request, 'portal.orders.view');

    // Tenant isolation
    const tenant = await requireTenant(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = orderFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const {
      status,
      customerId,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = validatedParams.data;

    const allowedSortFields = new Set(['orderDate', 'createdAt', 'status', 'totalAmount']);
    const sortField = sortBy && allowedSortFields.has(sortBy) ? sortBy : 'orderDate';
    const sortDirection = sortOrder ?? 'desc';

    const statusFilter = status ? status.toUpperCase() : undefined;

    const result = await withTenant(tenant.tenantId, async (tx) => {
      const where: any = {
        tenantId: tenant.tenantId,
      };

      if (user.customerId) {
        where.customerId = user.customerId;
      } else if (customerId) {
        where.customerId = customerId;
      }

      if (statusFilter) {
        where.status = statusFilter;
      }

      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) {
          where.orderDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.orderDate.lte = new Date(endDate);
        }
      }

      const [orders, total] = await Promise.all([
        tx.order.findMany({
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
            lines: {
              select: {
                quantity: true,
              },
            },
          },
          orderBy: {
            [sortField]: sortDirection,
          },
          take: limit,
          skip: (page - 1) * limit,
        }),
        tx.order.count({ where }),
      ]);

      const formatted = orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer?.company?.name || 'Unknown Customer',
        status: order.status.toLowerCase(),
        totalAmount: Number(order.totalAmount),
        itemCount: order.lines.reduce((sum, line) => sum + Number(line.quantity), 0),
        createdAt: order.orderDate.toISOString(),
        deliveryDate: order.actualDeliveryDate ? order.actualDeliveryDate.toISOString() : null,
      }));

      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

      return {
        orders: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    });

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching orders:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch orders');
  }
}

/**
 * Create new order
 */
export async function POST(request: NextRequest) {
  try {
    // RBAC: Require permission to create orders
    const user = await requirePermission(request, 'portal.orders.create');

    // Tenant isolation
    const tenant = await requireTenant(request);

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = createOrderSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid order data',
        validatedBody.error.flatten()
      );
    }

    const { customerId, lines, notes, requestedDeliveryDate } = validatedBody.data;

    if (user.customerId && user.customerId !== customerId) {
      return Errors.forbidden('Cannot create orders for other customers');
    }

    const result = await withTenant(tenant.tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          id: customerId,
          tenantId: tenant.tenantId,
        },
        select: {
          id: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      const prepared = await prepareOrderLines(tx, tenant.tenantId, customerId, lines);
      const orderNumber = await generateOrderNumber(tx, tenant.tenantId);
      const { charges } = await computeTenantCharges(tx, tenant.tenantId, prepared.subtotal);

      const createdOrder = await tx.order.create({
        data: {
          tenantId: tenant.tenantId,
          customerId,
          portalUserId: user.id,
          orderNumber,
          status: 'PENDING',
          subtotal: new Prisma.Decimal(prepared.subtotal),
          taxAmount: new Prisma.Decimal(charges.taxAmount),
          shippingAmount: new Prisma.Decimal(charges.shippingAmount),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(
            prepared.subtotal + charges.taxAmount + charges.shippingAmount
          ),
          requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
          notes,
          isSampleOrder: prepared.isSampleOrder,
          lines: {
            create: prepared.createInputs,
          },
        },
      });

      await adjustInventoryForOrder(tx, tenant.tenantId, prepared.inventoryAdjustments);

      const orderWithRelations = await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          lines: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      return {
        order: orderWithRelations!,
        charges,
        customerName: customer.company?.name || 'Unknown Customer',
      };
    });

    const formatted = {
      id: result.order.id,
      orderNumber: result.order.orderNumber,
      customerId: result.order.customerId,
      customerName: result.customerName,
      status: result.order.status.toLowerCase(),
      totalAmount: Number(result.order.totalAmount),
      subtotal: Number(result.order.subtotal),
      tax: Number(result.order.taxAmount),
      shipping: Number(result.order.shippingAmount),
      itemCount: result.order.lines.reduce((sum, line) => sum + Number(line.quantity), 0),
      createdAt: result.order.orderDate ? result.order.orderDate.toISOString() : result.order.createdAt.toISOString(),
      notes: result.order.notes,
      requestedDeliveryDate: result.order.requestedDeliveryDate
        ? result.order.requestedDeliveryDate.toISOString()
        : null,
      lines: result.order.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product?.name || 'Unknown Product',
        productSku: line.product?.sku || '',
        quantity: Number(line.quantity),
        cases: Number(line.cases),
        unitPrice: Number(line.unitPrice),
        totalPrice: Number(line.netPrice),
      })),
      charges: {
        tax: result.charges.taxAmount,
        shipping: result.charges.shippingAmount,
      },
    };

    return successResponse(formatted, 201);
  } catch (error) {
    console.error('Error creating order:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden(error.message);
    }

    return Errors.serverError('Failed to create order');
  }
}
