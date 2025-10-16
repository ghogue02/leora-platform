/**
 * Cart Items API
 * POST /api/portal/cart/items - Add item to cart
 * PATCH /api/portal/cart/items - Update cart item
 * DELETE /api/portal/cart/items - Remove item from cart
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requireAuth } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';
import { addToCartSchema, updateCartItemSchema, idSchema } from '@/lib/validations/portal';
import { getPriceForProduct, updateCartTotals } from './implementation';

/**
 * Add item to cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const body = await request.json();
    const validatedBody = addToCartSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid cart item data',
        validatedBody.error.flatten()
      );
    }

    const { productId, quantity } = validatedBody.data;

    const result = await withTenant(tenant.tenantId, async (tx) => {
      const tenantSettings = await tx.tenantSettings.findUnique({
        where: { tenantId: tenant.tenantId },
      });

      // Validate product exists and is active
      const product = await tx.product.findFirst({
        where: {
          id: productId,
          tenantId: tenant.tenantId,
        },
        select: {
          id: true,
          name: true,
          active: true,
          sku: true,
        },
      });

      if (!product || !product.active) {
        throw new Error('Product not found or inactive');
      }

      // Check inventory availability
      const inventory = await tx.inventory.findFirst({
        where: {
          productId,
          tenantId: tenant.tenantId,
        },
      });

      const availableInventory = inventory?.quantityAvailable || 0;
      if (availableInventory < quantity) {
        throw new Error(`Insufficient inventory. Available: ${availableInventory}`);
      }

      // Get pricing
      const price = await getPriceForProduct(
        tx,
        tenant.tenantId,
        productId,
        user.customerId || null
      );

      // Get or create cart
      let cart = await tx.cart.findFirst({
        where: {
          portalUserId: user.id,
          tenantId: tenant.tenantId,
          status: 'ACTIVE',
        },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            portalUserId: user.id,
            tenantId: tenant.tenantId,
            customerId: user.customerId,
            status: 'ACTIVE',
          },
        });
      }

      // Check if item already exists in cart
      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
        },
      });

      let cartItem;
      if (existingItem) {
        // Update quantity
        const newQuantity = Number(existingItem.quantity) + quantity;
        const newCases = Math.ceil(newQuantity / 12); // Assuming 12 units per case
        cartItem = await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            cases: newCases,
            unitPrice: price,
            netPrice: price * newQuantity,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true,
              },
            },
          },
        });
      } else {
        // Create new item
        const cases = Math.ceil(quantity / 12); // Assuming 12 units per case
        cartItem = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
            cases,
            unitPrice: price,
            netPrice: price * quantity,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true,
              },
            },
          },
        });
      }

      // Update cart totals
      await updateCartTotals(tx, cart.id, tenantSettings as Record<string, unknown> | null);

      return {
        id: cartItem.id,
        productId: cartItem.productId,
        productName: cartItem.product.name,
        productSku: cartItem.product.sku,
        quantity: cartItem.quantity,
        cases: Number(cartItem.cases),
        unitPrice: Number(cartItem.unitPrice),
        totalPrice: Number(cartItem.netPrice),
        imageUrl: cartItem.product.imageUrl,
      };
    });

    return successResponse(result, 201);
  } catch (error) {
    console.error('Error adding to cart:', error);

    if (error instanceof Error) {
      if (error.message.includes('inventory')) {
        return Errors.conflict(error.message);
      }
      if (error.message.includes('not found')) {
        return Errors.notFound(error.message);
      }
    }

    return Errors.serverError('Failed to add item to cart');
  }
}

/**
 * Update cart item quantity
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const body = await request.json();
    const schema = updateCartItemSchema.extend({
      itemId: idSchema,
    });
    const validatedBody = schema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid request data',
        validatedBody.error.flatten()
      );
    }

    const { itemId, quantity } = validatedBody.data;

    const result = await withTenant(tenant.tenantId, async (tx) => {
      const tenantSettings = await tx.tenantSettings.findUnique({
        where: { tenantId: tenant.tenantId },
      });

      // Find cart item
      const cartItem = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: {
          cart: true,
          product: true,
        },
      });

      if (!cartItem || cartItem.cart.portalUserId !== user.id) {
        throw new Error('Cart item not found');
      }

      // Check inventory
      const inventory = await tx.inventory.findFirst({
        where: {
          productId: cartItem.productId,
          tenantId: tenant.tenantId,
        },
      });

      const availableInventory = inventory?.quantityAvailable || 0;
      if (availableInventory < quantity) {
        throw new Error(`Insufficient inventory. Available: ${availableInventory}`);
      }

      // Update item
      const cases = Math.ceil(quantity / 12); // Assuming 12 units per case
      const updatedItem = await tx.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          cases,
          netPrice: Number(cartItem.unitPrice) * quantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              imageUrl: true,
            },
          },
        },
      });

      // Update cart totals
      await updateCartTotals(tx, cartItem.cartId, tenantSettings as Record<string, unknown> | null);

      return {
        id: updatedItem.id,
        productId: updatedItem.productId,
        productName: updatedItem.product.name,
        quantity: updatedItem.quantity,
        cases: Number(updatedItem.cases),
        unitPrice: Number(updatedItem.unitPrice),
        totalPrice: Number(updatedItem.netPrice),
      };
    });

    return successResponse(result);
  } catch (error) {
    console.error('Error updating cart item:', error);

    if (error instanceof Error) {
      if (error.message.includes('inventory')) {
        return Errors.conflict(error.message);
      }
      if (error.message.includes('not found')) {
        return Errors.notFound(error.message);
      }
    }

    return Errors.serverError('Failed to update cart item');
  }
}

/**
 * Remove item from cart
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return Errors.badRequest('Item ID is required');
    }

    await withTenant(tenant.tenantId, async (tx) => {
      // Find cart item
      const cartItem = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true },
      });

      if (!cartItem || cartItem.cart.portalUserId !== user.id) {
        throw new Error('Cart item not found');
      }

      // Delete item
      await tx.cartItem.delete({
        where: { id: itemId },
      });

      // Update cart totals
      await updateCartTotals(tx, cartItem.cartId);
    });

    return successResponse({
      removed: true,
      itemId,
      removedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error removing cart item:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return Errors.notFound(error.message);
    }

    return Errors.serverError('Failed to remove cart item');
  }
}
