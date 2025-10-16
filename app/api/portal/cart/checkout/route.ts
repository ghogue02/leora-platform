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
import { resolveProductPrice } from '@/lib/services/pricing';

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
      // Find active cart with items
      const cart = await tx.cart.findFirst({
        where: {
          portalUserId: user.id,
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

      // Validate customer exists
      const customerId = user.customerId || cart.customerId;
      if (!customerId) {
        throw new Error('Customer ID required for checkout');
      }

      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Verify inventory for all items
      for (const item of cart.items) {
        const inventory = await tx.inventory.findFirst({
          where: { productId: item.productId },
        });

        const available = inventory?.quantityAvailable || 0;
        if (available < item.quantity) {
          throw new Error(
            `Insufficient inventory for ${item.product.name}. Available: ${available}`
          );
        }
      }

      // Recalculate pricing with waterfall logic
      let subtotal = 0;
      const pricedLines = await Promise.all(
        cart.items.map(async (item) => {
          const priceResult = await resolveProductPrice(tx, item.productId);
          const price = priceResult.price;
          const lineTotal = price * item.quantity;
          subtotal += lineTotal;

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: price,
            totalPrice: lineTotal,
          };
        })
      );

      const tax = subtotal * 0.09; // Should come from state tax rates
      const shipping = subtotal > 100 ? 0 : 5.0; // Free shipping over $100
      const total = subtotal + tax + shipping;

      // Generate order number
      const orderCount = await tx.order.count({
        where: { tenantId: tenant.tenantId },
      });
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(
        orderCount + 1
      ).padStart(6, '0')}`;

      // Create order with lines in transaction
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          tenantId: tenant.tenantId,
          customerId,
          portalUserId: user.id,
          status: 'PENDING',
          subtotal,
          taxAmount: tax,
          shippingAmount: shipping,
          totalAmount: total,
          notes,
          requestedDeliveryDate: requestedDeliveryDate
            ? new Date(requestedDeliveryDate)
            : null,
          lines: {
            create: pricedLines.map((line, index) => ({
              product: {
                connect: { id: line.productId }
              },
              lineNumber: index + 1,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              subtotal: line.totalPrice,
              totalAmount: line.totalPrice,
              appliedPricingRules: JSON.stringify({
                source: 'price_list',
                effectiveDate: new Date(),
              }),
            })),
          },
        },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
      });

      // Reserve inventory
      for (const line of pricedLines) {
        await tx.inventory.updateMany({
          where: { productId: line.productId },
          data: {
            quantityReserved: {
              increment: line.quantity,
            },
            quantityAvailable: {
              decrement: line.quantity,
            },
          },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: 'CONVERTED',
          convertedToOrderId: newOrder.id,
          subtotal: 0,
          taxAmount: 0,
          shippingAmount: 0,
          totalAmount: 0,
        },
      });

      return newOrder;
    });

    return successResponse(
      {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          subtotal: Number(order.subtotal),
          tax: Number(order.taxAmount),
          shipping: Number(order.shippingAmount),
          lines: order.lines.map((line) => ({
            id: line.id,
            productId: line.productId,
            productName: line.product.name,
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice),
            totalPrice: Number(line.totalAmount),
          })),
          createdAt: order.createdAt.toISOString(),
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
