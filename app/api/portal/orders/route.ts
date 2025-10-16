/**
 * Orders API - Order Listing
 * GET /api/portal/orders - List orders
 * POST /api/portal/orders - Create new order
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { orderFilterSchema, createOrderSchema } from '@/lib/validations/portal';
import { withTenant } from '@/lib/prisma';

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
                companyName: true,
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
        customerName: order.customer?.companyName || 'Unknown Customer',
        status: order.status.toLowerCase(),
        totalAmount: Number(order.totalAmount),
        itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
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

    // Validate user can create orders for this customer
    if (user.customerId && user.customerId !== customerId) {
      return Errors.forbidden('Cannot create orders for other customers');
    }

    // TODO: Implement order creation with Prisma
    // 1. Validate product availability
    // 2. Calculate pricing with waterfall logic
    // 3. Create order record with lines
    // 4. Update inventory
    // 5. Create audit log entry

    const newOrder = {
      id: 'new-order-1',
      orderNumber: 'ORD-NEW-001',
      customerId,
      status: 'pending',
      totalAmount: lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
      lines: lines.map((line, index) => ({
        id: `line-${index}`,
        ...line,
      })),
      notes,
      requestedDeliveryDate,
      createdAt: new Date().toISOString(),
    };

    return successResponse(newOrder, 201);
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
