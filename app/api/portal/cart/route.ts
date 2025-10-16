/**
 * Cart API - Main Cart Operations
 * GET /api/portal/cart - Get current cart
 * DELETE /api/portal/cart - Clear cart
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requireAuth } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';
import { computeCharges } from '@/lib/services/pricing';

/**
 * Get current user's cart
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const cart = await withTenant(tenant.tenantId, async (tx) => {
      // Find active cart for user
      let userCart = await tx.cart.findFirst({
        where: {
          portalUserId: user.id,
          tenantId: tenant.tenantId,
          status: 'ACTIVE',
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  category: true,
                  imageUrl: true,
                  sku: true,
                },
              },
            },
            orderBy: {
              addedAt: 'desc',
            },
          },
        },
      });

      // Create cart if it doesn't exist
      if (!userCart) {
        userCart = await tx.cart.create({
          data: {
            portalUserId: user.id,
            tenantId: tenant.tenantId,
            customerId: user.customerId,
            status: 'ACTIVE',
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    category: true,
                    imageUrl: true,
                    sku: true,
                  },
                },
              },
            },
          },
        });
      }

      const tenantSettings = await tx.tenantSettings.findUnique({
        where: { tenantId: tenant.tenantId },
      });

      // Calculate totals
      const subtotal = userCart.items.reduce(
        (sum, item) => sum + Number(item.netPrice),
        0
      );
      const { taxAmount: tax, shippingAmount: shipping } = computeCharges(subtotal, {
        tenantSettings: tenantSettings as unknown as Record<string, unknown> | null,
      });
      const total = subtotal + tax + shipping;

      return {
        id: userCart.id,
        userId: user.id,
        items: userCart.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productSku: item.product.sku,
          quantity: item.quantity,
          cases: Number(item.cases),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.netPrice),
          imageUrl: item.product.imageUrl,
        })),
        subtotal,
        tax,
        shipping,
        total,
        itemCount: userCart.items.reduce((sum, item) => sum + Number(item.quantity), 0),
        updatedAt: userCart.updatedAt.toISOString(),
      };
    });

    return successResponse(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    return Errors.serverError('Failed to fetch cart');
  }
}

/**
 * Clear cart
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    await withTenant(tenant.tenantId, async (tx) => {
      // Find user's active cart
      const cart = await tx.cart.findFirst({
        where: {
          portalUserId: user.id,
          tenantId: tenant.tenantId,
          status: 'ACTIVE',
        },
      });

      if (cart) {
        // Delete all cart items
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        // Reset cart totals
        await tx.cart.update({
          where: { id: cart.id },
          data: {
            subtotal: 0,
            taxAmount: 0,
            shippingAmount: 0,
            totalAmount: 0,
          },
        });
      }
    });

    return successResponse({
      cleared: true,
      clearedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing cart:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    return Errors.serverError('Failed to clear cart');
  }
}
