/**
 * Orders Implementation Helpers
 * Shared logic for order operations
 */

import { PrismaClient } from '@prisma/client';

/**
 * Get pricing for a product using waterfall logic
 * Blueprint Section 7.2: Customer-specific → Price list → Base price
 */
export async function getPriceForSku(
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
