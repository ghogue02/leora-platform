/**
 * Opportunity Detector
 *
 * Identifies "Top 20" products that customers haven't yet purchased.
 * Uses toggles for revenue, volume, or customer penetration metrics.
 * Refreshed on a six-month rolling window.
 *
 * Algorithm:
 * 1. Identify all products in tenant catalog
 * 2. Determine which products customer has NOT purchased
 * 3. Rank unpurchased products by selected metric:
 *    - Revenue: Total revenue across all customers (6mo window)
 *    - Volume: Total units sold across all customers (6mo window)
 *    - Penetration: % of customers who purchased (6mo window)
 * 4. Return top N opportunities (default 20)
 *
 * Blueprint Reference: Section 1.2 "Strategic selling guidance is missing"
 */

import { PrismaClient } from '@prisma/client';

export interface Opportunity {
  productId: string;
  productName: string;
  productCategory?: string;
  supplierName?: string;
  rankingMetric: 'revenue' | 'volume' | 'penetration';
  metricValue: number;
  rank: number;
  totalRevenue: number;
  totalUnits: number;
  customersPurchased: number;
  penetrationPercent: number;
}

export interface OpportunityConfig {
  lookbackDays: number; // Default: 180 (6 months)
  topN: number; // Default: 20
  excludeDiscontinued: boolean; // Default: true
  excludeLowInventory: boolean; // Default: false
  minimumCustomerThreshold: number; // Default: 3 (need 3+ customers purchasing)
}

const DEFAULT_CONFIG: OpportunityConfig = {
  lookbackDays: 180,
  topN: 20,
  excludeDiscontinued: true,
  excludeLowInventory: false,
  minimumCustomerThreshold: 3,
};

/**
 * Detect opportunities for a specific customer
 */
export async function detectCustomerOpportunities(
  prisma: PrismaClient,
  customerId: string,
  tenantId: string,
  rankBy: 'revenue' | 'volume' | 'penetration' = 'revenue',
  config: Partial<OpportunityConfig> = {}
): Promise<Opportunity[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Calculate lookback date
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - finalConfig.lookbackDays);

  // Get products customer has already purchased
  const purchasedProducts = await prisma.orderLine.findMany({
    where: {
      order: {
        tenantId,
        customerId,
        status: 'DELIVERED',
        actualDeliveryDate: {
          gte: lookbackDate,
        },
      },
    },
    select: {
      productId: true,
    },
    distinct: ['productId'],
  });

  const purchasedProductIds = purchasedProducts.map((p) => p.productId);

  // Get all products in catalog (excluding purchased)
  const productWhere: any = {
    tenantId,
    id: {
      notIn: purchasedProductIds,
    },
  };

  if (finalConfig.excludeDiscontinued) {
    productWhere.isActive = true;
  }

  const products = await prisma.product.findMany({
    where: productWhere,
    include: {
      supplier: {
        select: {
          name: true,
        },
      },
    },
  });

  // Get total customer count for penetration calculation
  const totalCustomers = await prisma.customer.count({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
  });

  // For each product, calculate metrics across all customers
  const opportunityPromises = products.map(async (product) => {
    const orderLines = await prisma.orderLine.findMany({
      where: {
        productId: product.id,
        order: {
          tenantId,
          status: 'DELIVERED',
          actualDeliveryDate: {
            gte: lookbackDate,
          },
        },
      },
      include: {
        order: {
          select: {
            customerId: true,
          },
        },
      },
    });

    const totalRevenue = orderLines.reduce((sum, line) => sum + Number(line.subtotal || 0), 0);
    const totalUnits = orderLines.reduce((sum, line) => sum + line.quantity, 0);
    const uniqueCustomers = new Set(orderLines.map((line) => line.order.customerId));
    const customersPurchased = uniqueCustomers.size;
    const penetrationPercent = totalCustomers > 0 ? (customersPurchased / totalCustomers) * 100 : 0;

    return {
      productId: product.id,
      productName: product.name,
      productCategory: product.category || '',
      supplierName: product.supplier?.name || '',
      rankingMetric: rankBy,
      metricValue:
        rankBy === 'revenue'
          ? totalRevenue
          : rankBy === 'volume'
          ? totalUnits
          : penetrationPercent,
      rank: 0, // Will be assigned after sorting
      totalRevenue,
      totalUnits,
      customersPurchased,
      penetrationPercent,
    };
  });

  let opportunities = await Promise.all(opportunityPromises);

  // Filter by minimum customer threshold
  opportunities = opportunities.filter(
    (opp) => opp.customersPurchased >= finalConfig.minimumCustomerThreshold
  );

  // Sort by metric value (descending)
  opportunities.sort((a, b) => b.metricValue - a.metricValue);

  // Assign ranks and limit to topN
  opportunities = opportunities.slice(0, finalConfig.topN).map((opp, index) => ({
    ...opp,
    rank: index + 1,
  }));

  return opportunities;
}

/**
 * Detect opportunities across all customers (for sales team dashboards)
 */
export async function detectTenantOpportunities(
  prisma: PrismaClient,
  tenantId: string,
  rankBy: 'revenue' | 'volume' | 'penetration' = 'revenue',
  config: Partial<OpportunityConfig> = {}
): Promise<Map<string, Opportunity[]>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Get all active customers
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      companyName: true,
    },
  });

  // Calculate opportunities for each customer in parallel
  const opportunityMap = new Map<string, Opportunity[]>();

  const promises = customers.map(async (customer) => {
    const opportunities = await detectCustomerOpportunities(
      prisma,
      customer.id,
      tenantId,
      rankBy,
      config
    );
    opportunityMap.set(customer.id, opportunities);
  });

  await Promise.all(promises);

  return opportunityMap;
}

/**
 * Get opportunity summary for a customer (counts by category/supplier)
 */
export async function getOpportunitySummary(
  prisma: PrismaClient,
  customerId: string,
  tenantId: string
): Promise<{
  totalOpportunities: number;
  byCategory: Map<string, number>;
  bySupplier: Map<string, number>;
  topOpportunity: Opportunity | null;
}> {
  const opportunities = await detectCustomerOpportunities(prisma, customerId, tenantId, 'revenue', {
    topN: 100, // Get all to summarize
  });

  const byCategory = new Map<string, number>();
  const bySupplier = new Map<string, number>();

  opportunities.forEach((opp) => {
    if (opp.productCategory) {
      byCategory.set(opp.productCategory, (byCategory.get(opp.productCategory) || 0) + 1);
    }
    if (opp.supplierName) {
      bySupplier.set(opp.supplierName, (bySupplier.get(opp.supplierName) || 0) + 1);
    }
  });

  return {
    totalOpportunities: opportunities.length,
    byCategory,
    bySupplier,
    topOpportunity: opportunities[0] || null,
  };
}

/**
 * Get tenant opportunity configuration
 */
export async function getTenantOpportunityConfig(
  prisma: PrismaClient,
  tenantId: string
): Promise<OpportunityConfig> {
  // TODO: Implement opportunity detection config storage in tenant settings
  return DEFAULT_CONFIG;
}

/**
 * Update tenant opportunity configuration
 */
export async function updateTenantOpportunityConfig(
  prisma: PrismaClient,
  tenantId: string,
  config: Partial<OpportunityConfig>
): Promise<void> {
  // TODO: Implement opportunity detection config storage in tenant settings
  console.log('TODO: Store opportunity config for tenant', tenantId, config);
}
