/**
 * Orders API - Order Listing
 * GET /api/portal/orders - List orders
 * POST /api/portal/orders - Create new order
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { orderFilterSchema, createOrderSchema } from '@/lib/validations/portal';

/**
 * List orders with filters
 */
export async function GET(request: NextRequest) {
  try {
    // RBAC: Require permission to read orders
    const user = await requirePermission(request, 'portal.orders.read');

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

    // TODO: Implement Prisma query with filters
    // Apply tenant isolation: WHERE tenantId = tenant.tenantId
    // Apply user context: If user has customerId, filter by customerId
    // Filter by status, date range, pagination

    const orders = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        customerId: user.customerId || 'customer-1',
        customerName: 'Demo Customer',
        status: 'pending',
        totalAmount: 299.99,
        itemCount: 3,
        createdAt: new Date().toISOString(),
        deliveryDate: null,
      },
    ];

    const total = 1;
    const totalPages = Math.ceil(total / limit);

    return successResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
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
