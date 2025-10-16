import { PrismaClient } from '@prisma/client';

type TxClient = PrismaClient;

interface PricingContext {
  tenantSettings?: Record<string, unknown> | null;
}

function getTenantSettingNumber(settings: Record<string, unknown> | null | undefined, key: string, fallback: number): number {
  if (!settings) return fallback;
  const value = (settings as Record<string, unknown>)[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Determine tax and shipping amounts from tenant settings.
 * Falls back to env defaults or hard-coded values when settings are absent.
 */
export function computeCharges(
  subtotal: number,
  context: PricingContext = {}
): { taxAmount: number; shippingAmount: number } {
  const settings = context.tenantSettings ?? null;

  const defaultTaxRate = Number(process.env.DEFAULT_TAX_RATE ?? 0.09);
  const defaultShippingFlat = Number(process.env.DEFAULT_SHIPPING_RATE ?? 5);
  const defaultFreeShippingThreshold = Number(process.env.DEFAULT_FREE_SHIPPING_THRESHOLD ?? 100);

  const taxRate = getTenantSettingNumber(settings, 'taxRate', defaultTaxRate);
  const shippingFlat = getTenantSettingNumber(settings, 'shippingFlatRate', defaultShippingFlat);
  const freeShippingThreshold = getTenantSettingNumber(settings, 'freeShippingThreshold', defaultFreeShippingThreshold);

  const taxAmount = subtotal * taxRate;
  const shippingAmount = subtotal >= freeShippingThreshold ? 0 : shippingFlat;

  return {
    taxAmount,
    shippingAmount,
  };
}

/**
 * Resolve the best price for a product using price lists then base SKU price.
 * Returns both the numeric price and the pricing source.
 */
export async function resolveProductPrice(
  tx: TxClient,
  productId: string
): Promise<{ price: number; source: 'price_list' | 'base_price' }> {
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
    return {
      price: Number(priceListEntry.unitPrice),
      source: 'price_list',
    };
  }

  const product = await tx.product.findUnique({
    where: { id: productId },
    include: {
      skus: {
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return {
    price: Number(product?.skus[0]?.basePrice || 0),
    source: 'base_price',
  };
}
