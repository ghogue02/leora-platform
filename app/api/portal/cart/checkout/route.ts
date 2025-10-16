/**
 * Cart Checkout API
 * POST /api/portal/cart/checkout - Process checkout and create order
 */

import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';
import { checkoutSchema } from '@/lib/validations/portal';
import {
  adjustInventoryForOrder,
  computeTenantCharges,
  generateOrderNumber,
  prepareOrderLines,
} from '@/lib/services/order-service';

/**
 * Process checkout
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.orders.create');
    const tenant = await requireTenant(request);

    const body = await request.json();
    const validatedBody = checkoutSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid checkout data',
        validatedBody.error.flatten()
      );
    }

    const {
      paymentMethodId,
      shippingAddressId,
      billingAddressId,
      notes,
      requestedDeliveryDate,
    } = validatedBody.data;

    const order = await withTenant(tenant.tenantId, async (tx) => {
      const cart = await tx.cart.findFirst({
        where: {
          portalUserId: user.id,
          tenantId: tenant.tenantId,
          status: 'ACTIVE',
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      const customerId = user.customerId || cart.customerId;
      if (!customerId) {
        throw new Error('Customer ID required for checkout');
      }

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

      const prepared = await prepareOrderLines(
        tx,
        tenant.tenantId,
        customerId,
        cart.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        }))
      );

      const orderNumber = await generateOrderNumber(tx, tenant.tenantId);
      const { charges } = await computeTenantCharges(tx, tenant.tenantId, prepared.subtotal);

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          tenantId: tenant.tenantId,
          customerId,
          portalUserId: user.id,
          status: 'PENDING',
          subtotal: new Prisma.Decimal(prepared.subtotal),
          taxAmount: new Prisma.Decimal(charges.taxAmount),
          shippingAmount: new Prisma.Decimal(charges.shippingAmount),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(
            prepared.subtotal + charges.taxAmount + charges.shippingAmount
          ),
          notes,
          requestedDeliveryDate: requestedDeliveryDate
            ? new Date(requestedDeliveryDate)
            : null,
          lines: {
            create: prepared.createInputs,
          },
        },
      });

      await adjustInventoryForOrder(tx, tenant.tenantId, prepared.inventoryAdjustments);

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: 'CONVERTED',
          convertedToOrderId: createdOrder.id,
          subtotal: 0,
          taxAmount: 0,
          shippingAmount: 0,
          totalAmount: 0,
        },
      });

      const orderWithRelations = await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
      });

      return {
        order: orderWithRelations!,
        charges,
        customerName: customer.company?.name ?? 'Unknown Customer',
      };
    });

    return successResponse(
      {
        order: {
          id: order.order.id,
          orderNumber: order.order.orderNumber,
          customerId: order.order.customerId,
          customerName: order.customerName,
          status: order.order.status.toLowerCase(),
          totalAmount: Number(order.order.totalAmount),
          subtotal: Number(order.order.subtotal),
          tax: Number(order.order.taxAmount),
          shipping: Number(order.order.shippingAmount),
          lines: order.order.lines.map((line) => ({
            id: line.id,
            productId: line.productId,
            productName: line.product?.name || 'Unknown Product',
            quantity: Number(line.quantity),
            cases: Number(line.cases),
            unitPrice: Number(line.unitPrice),
            totalPrice: Number(line.netPrice),
          })),
          createdAt: order.order.createdAt.toISOString(),
        },
        message: 'Order created successfully',
      },
      201
    );
  } catch (error) {
    console.error('Error processing checkout:', error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return Errors.unauthorized();
      }
      if (error.message.includes('inventory')) {
        return Errors.conflict(error.message);
      }
      if (error.message.includes('empty') || error.message.includes('not found')) {
        return Errors.badRequest(error.message);
      }
    }

    return Errors.serverError('Failed to process checkout');
  }
}
