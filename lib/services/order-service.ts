import { Prisma, PrismaClient } from '@prisma/client';
import { computeCharges, resolveProductPrice } from './pricing';

type TxClient = PrismaClient;

export interface OrderLineInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

interface PreparedOrderContext {
  subtotal: number;
  isSampleOrder: boolean;
  createInputs: Prisma.OrderLineCreateWithoutOrderInput[];
  inventoryAdjustments: Array<{ productId: string; quantity: number }>;
  responseLines: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export async function generateOrderNumber(tx: TxClient, tenantId: string): Promise<string> {
  const count = await tx.order.count({
    where: { tenantId },
  });
  const now = new Date();
  const year = now.getFullYear();
  return `ORD-${year}-${String(count + 1).padStart(6, '0')}`;
}

async function prepareOrderLines(
  tx: TxClient,
  tenantId: string,
  customerId: string,
  inputs: OrderLineInput[]
): Promise<PreparedOrderContext> {
  if (inputs.length === 0) {
    throw new Error('Order requires at least one line item');
  }

  let subtotal = 0;
  let isSampleOrder = true;
  const createInputs: Prisma.OrderLineCreateWithoutOrderInput[] = [];
  const inventoryAdjustments: Array<{ productId: string; quantity: number }> = [];
  const responseLines: PreparedOrderContext['responseLines'] = [];

  for (let index = 0; index < inputs.length; index++) {
    const line = inputs[index];

    const product = await tx.product.findFirst({
      where: {
        id: line.productId,
        tenantId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        isSample: true,
      },
    });

    if (!product) {
      throw new Error('Product not found or inactive');
    }

    const inventory = await tx.inventory.findFirst({
      where: {
        productId: line.productId,
        tenantId,
      },
    });

    const available = inventory?.quantityAvailable ?? 0;
    if (available < line.quantity) {
      throw new Error(`Insufficient inventory for ${product.name}. Available: ${available}`);
    }

    const resolvedPrice = await resolveProductPrice(tx, tenantId, line.productId, {
      customerId,
    });
    const calculatedPrice = line.unitPrice ?? resolvedPrice.price;
    const lineSubtotal = calculatedPrice * line.quantity;
    subtotal += lineSubtotal;
    if (!product.isSample) {
      isSampleOrder = false;
    }

    createInputs.push({
      product: {
        connect: { id: line.productId }
      },
      lineNumber: index + 1,
      quantity: line.quantity,
      unitPrice: new Prisma.Decimal(calculatedPrice),
      subtotal: new Prisma.Decimal(lineSubtotal),
      taxAmount: new Prisma.Decimal(0),
      discountAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(lineSubtotal),
      appliedPricingRules: JSON.stringify({
        source: line.unitPrice ? 'manual' : 'system',
      }),
      notes: line.notes,
    });

    inventoryAdjustments.push({
      productId: line.productId,
      quantity: line.quantity,
    });

    responseLines.push({
      id: `line-${index + 1}`,
      productId: line.productId,
      productName: product.name,
      productSku: product.sku,
      quantity: line.quantity,
      unitPrice: calculatedPrice,
      totalPrice: lineSubtotal,
    });
  }

  return {
    subtotal,
    isSampleOrder,
    createInputs,
    inventoryAdjustments,
    responseLines,
  };
}

export async function adjustInventoryForOrder(
  tx: TxClient,
  tenantId: string,
  adjustments: Array<{ productId: string; quantity: number }>
) {
  for (const adjustment of adjustments) {
    await tx.inventory.updateMany({
      where: { productId: adjustment.productId, tenantId },
      data: {
        quantityAvailable: { decrement: adjustment.quantity },
        quantityReserved: { increment: adjustment.quantity },
      },
    });
  }
}

export async function releaseInventoryForOrder(
  tx: TxClient,
  tenantId: string,
  adjustments: Array<{ productId: string; quantity: number }>
) {
  for (const adjustment of adjustments) {
    await tx.inventory.updateMany({
      where: { productId: adjustment.productId, tenantId },
      data: {
        quantityAvailable: { increment: adjustment.quantity },
        quantityReserved: { decrement: adjustment.quantity },
      },
    });
  }
}

export async function computeTenantCharges(tx: TxClient, tenantId: string, subtotal: number) {
  const tenantSettings = await tx.tenantSettings.findUnique({
    where: { tenantId },
  });

  return {
    tenantSettings,
    charges: computeCharges(subtotal, { tenantSettings: tenantSettings as unknown as Record<string, unknown> | null }),
  };
}

export { prepareOrderLines };
