/**
 * Cart Items Implementation Helpers
 * Shared logic for cart item operations
 */

import { PrismaClient } from '@prisma/client';
import { computeCharges, resolveProductPrice } from '@/lib/services/pricing';

/**
 * Get pricing for a product using waterfall logic
 * Blueprint Section 7.2: Customer-specific → Price list → Base price
 */
export async function getPriceForProduct(
  tx: PrismaClient,
  tenantId: string,
  productId: string,
  customerId: string | null
): Promise<number> {
  const { price } = await resolveProductPrice(tx, tenantId, productId, {
    customerId,
  });
  return price;
}

/**
 * Update cart totals after item changes
 */
export async function updateCartTotals(
  tx: PrismaClient,
  cartId: string,
  tenantSettings?: Record<string, unknown> | null
): Promise<void> {
  const allItems = await tx.cartItem.findMany({
    where: { cartId },
  });

  const subtotal = allItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const { taxAmount: tax, shippingAmount: shipping } = computeCharges(subtotal, {
    tenantSettings,
  });
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
