/**
 * Cart Items Implementation Helpers
 * Shared logic for cart item operations
 */

import { PrismaClient } from '@prisma/client';

/**
 * Get pricing for a product using waterfall logic
 * Blueprint Section 7.2: Customer-specific → Price list → Base price
 */
export async function getPriceForProduct(
  tx: PrismaClient,
  productId: string,
  customerId: string | null
): Promise<number> {
  // Try price list first
  const priceListEntry = await tx.priceListEntry.findFirst({
    where: {
      productId,
      OR: [
        { validFrom: { lte: new Date() }, validUntil: { gte: new Date() } },
        { validFrom: { lte: new Date() }, validUntil: null },
        { validFrom: null, validUntil: { gte: new Date() } },
        { validFrom: null, validUntil: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (priceListEntry) {
    return Number(priceListEntry.unitPrice);
  }

  // Fall back to product SKU base price
  const product = await tx.product.findUnique({
    where: { id: productId },
    include: {
      skus: {
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return Number(product?.skus[0]?.basePrice || 0);
}

/**
 * Update cart totals after item changes
 */
export async function updateCartTotals(
  tx: PrismaClient,
  cartId: string,
  _tenantSettings?: Record<string, unknown> | null
): Promise<void> {
  const allItems = await tx.cartItem.findMany({
    where: { cartId },
  });

  const subtotal = allItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const tax = subtotal * 0.09; // Should come from tenant settings
  const shipping = subtotal > 100 ? 0 : 5.0; // Free shipping over $100
  const total = subtotal + tax + shipping;

  await tx.cart.update({
    where: { id: cartId },
    data: {
      subtotal,
      taxAmount: tax,
      shippingAmount: shipping,
      totalAmount: total,
    },
  });
}
