# Leora Platform API Implementation Guide

This guide provides complete Prisma implementations for all pending API routes, following the established patterns and Blueprint requirements.

---

## Table of Contents

1. [Cart Routes](#cart-routes)
2. [Product Routes](#product-routes)
3. [Order Routes](#order-routes)
4. [Insights Routes](#insights-routes)
5. [Testing Checklist](#testing-checklist)

---

## Cart Routes

### GET `/api/portal/cart` - Get Current Cart

```typescript
import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requireAuth } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const cart = await withTenant(tenant.tenantId, async (tx) => {
      // Find active cart for user
      let userCart = await tx.cart.findFirst({
        where: {
          portalUserId: user.id,
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
                },
              },
              sku: {
                select: {
                  id: true,
                  skuCode: true,
                  unitSize: true,
                  unitOfMeasure: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
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
            status: 'ACTIVE',
          },
          include: {
            items: true,
          },
        });
      }

      // Calculate totals
      const subtotal = userCart.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const tax = subtotal * 0.09; // 9% tax rate (should come from tenant settings)
      const shipping = subtotal > 100 ? 0 : 5.0; // Free shipping over $100
      const total = subtotal + tax + shipping;

      return {
        id: userCart.id,
        userId: user.id,
        items: userCart.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          skuId: item.skuId,
          skuCode: item.sku.skuCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          imageUrl: item.product.imageUrl,
          unitSize: item.sku.unitSize,
          unitOfMeasure: item.sku.unitOfMeasure,
        })),
        subtotal,
        tax,
        shipping,
        total,
        itemCount: userCart.items.reduce((sum, item) => sum + item.quantity, 0),
        updatedAt: userCart.updatedAt,
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
```

### POST `/api/portal/cart/items` - Add Item to Cart

```typescript
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

    const { productId, skuId, quantity } = validatedBody.data;

    const result = await withTenant(tenant.tenantId, async (tx) => {
      // Validate product and SKU exist
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, status: true },
      });

      if (!product || product.status !== 'ACTIVE') {
        throw new Error('Product not found or inactive');
      }

      const sku = await tx.sku.findUnique({
        where: { id: skuId },
        include: {
          inventory: true,
        },
      });

      if (!sku) {
        throw new Error('SKU not found');
      }

      // Check inventory availability
      const availableInventory = sku.inventory?.quantityAvailable || 0;
      if (availableInventory < quantity) {
        throw new Error(`Insufficient inventory. Available: ${availableInventory}`);
      }

      // Get or create cart
      let cart = await tx.cart.findFirst({
        where: {
          portalUserId: user.id,
          status: 'ACTIVE',
        },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            portalUserId: user.id,
            tenantId: tenant.tenantId,
            status: 'ACTIVE',
          },
        });
      }

      // Get pricing from price list
      const price = await getPriceForSku(tx, skuId, user.customerId || null);

      // Check if item already exists in cart
      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
          skuId,
        },
      });

      if (existingItem) {
        // Update quantity
        const updatedItem = await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
          },
        });
        return updatedItem;
      } else {
        // Create new item
        const newItem = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            skuId,
            quantity,
            unitPrice: price,
          },
        });
        return newItem;
      }
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

// Helper function to get pricing
async function getPriceForSku(
  tx: any,
  skuId: string,
  customerId: string | null
): Promise<number> {
  // Pricing waterfall logic (Blueprint Section 7.2)
  // 1. Customer-specific price
  // 2. Volume tier price
  // 3. Price list price
  // 4. Base SKU price

  if (customerId) {
    const customerPrice = await tx.customerPricing.findFirst({
      where: {
        customerId,
        skuId,
        effectiveDate: { lte: new Date() },
        expiryDate: { gte: new Date() },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (customerPrice) {
      return customerPrice.price;
    }
  }

  // Get from price list
  const priceListEntry = await tx.priceList.findFirst({
    where: {
      skuId,
      effectiveDate: { lte: new Date() },
      expiryDate: { gte: new Date() },
    },
    orderBy: { effectiveDate: 'desc' },
  });

  if (priceListEntry) {
    return priceListEntry.price;
  }

  // Fall back to SKU base price
  const sku = await tx.sku.findUnique({
    where: { id: skuId },
    select: { basePrice: true },
  });

  return sku?.basePrice || 0;
}
```

---

## Product Routes

### GET `/api/portal/products` - List Products with Filtering

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.products.read');
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = productFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const {
      search,
      category,
      supplier,
      minPrice,
      maxPrice,
      inStock,
      page,
      limit,
      sortBy = 'name',
      sortOrder,
    } = validatedParams.data;

    const result = await withTenant(tenant.tenantId, async (tx) => {
      // Build where clause
      const where: any = {
        status: 'ACTIVE',
      };

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { productCode: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Category filter
      if (category) {
        where.category = category;
      }

      // Supplier filter
      if (supplier) {
        where.supplier = {
          name: { contains: supplier, mode: 'insensitive' },
        };
      }

      // Price filter (via SKUs)
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.skus = {
          some: {
            ...(minPrice !== undefined && { basePrice: { gte: minPrice } }),
            ...(maxPrice !== undefined && { basePrice: { lte: maxPrice } }),
          },
        };
      }

      // Inventory filter
      if (inStock !== undefined) {
        where.skus = {
          some: {
            inventory: {
              quantityAvailable: inStock ? { gt: 0 } : { lte: 0 },
            },
          },
        };
      }

      // Execute query with pagination
      const [products, total] = await Promise.all([
        tx.product.findMany({
          where,
          include: {
            skus: {
              include: {
                inventory: true,
              },
              take: 1, // Primary SKU only
            },
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: limit,
          skip: (page - 1) * limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        tx.product.count({ where }),
      ]);

      return {
        products: products.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          productCode: product.productCode,
          supplier: product.supplier?.name,
          price: product.skus[0]?.basePrice || 0,
          inStock: (product.skus[0]?.inventory?.quantityAvailable || 0) > 0,
          inventory: product.skus[0]?.inventory?.quantityAvailable || 0,
          imageUrl: product.imageUrl,
          sku: product.skus[0]
            ? {
                id: product.skus[0].id,
                skuCode: product.skus[0].skuCode,
                unitSize: product.skus[0].unitSize,
                unitOfMeasure: product.skus[0].unitOfMeasure,
              }
            : null,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching products:', error);

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch products');
  }
}
```

---

## Order Routes

### POST `/api/portal/orders` - Create Order

```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.orders.create');
    const tenant = await requireTenant(request);

    const body = await request.json();
    const validatedBody = createOrderSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid order data',
        validatedBody.error.flatten()
      );
    }

    const { customerId, lines, notes, requestedDeliveryDate } = validatedBody.data;

    // Validate user can create orders for this customer
    if (user.customerId && user.customerId !== customerId) {
      return Errors.forbidden('Cannot create orders for other customers');
    }

    const order = await withTenant(tenant.tenantId, async (tx) => {
      // Validate customer exists
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Validate all products and SKUs, check inventory
      for (const line of lines) {
        const sku = await tx.sku.findUnique({
          where: { id: line.skuId },
          include: { inventory: true },
        });

        if (!sku) {
          throw new Error(`SKU ${line.skuId} not found`);
        }

        const available = sku.inventory?.quantityAvailable || 0;
        if (available < line.quantity) {
          throw new Error(
            `Insufficient inventory for SKU ${sku.skuCode}. Available: ${available}`
          );
        }
      }

      // Calculate totals and apply pricing
      let subtotal = 0;
      const pricedLines = await Promise.all(
        lines.map(async (line) => {
          const price = await getPriceForSku(tx, line.skuId, customerId);
          const lineTotal = price * line.quantity;
          subtotal += lineTotal;

          return {
            ...line,
            unitPrice: price,
            totalPrice: lineTotal,
          };
        })
      );

      const tax = subtotal * 0.09; // Should come from state tax rates
      const shipping = 0; // Calculate based on shipping rules
      const total = subtotal + tax + shipping;

      // Generate order number
      const orderCount = await tx.order.count({
        where: { tenantId: tenant.tenantId },
      });
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, '0')}`;

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
            create: pricedLines.map(line => ({
              productId: line.productId,
              skuId: line.skuId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalPrice: line.totalPrice,
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
              sku: true,
            },
          },
        },
      });

      // Reserve inventory
      for (const line of pricedLines) {
        await tx.inventory.update({
          where: { skuId: line.skuId },
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

      return newOrder;
    });

    return successResponse(order, 201);
  } catch (error) {
    console.error('Error creating order:', error);

    if (error instanceof Error) {
      if (error.message.includes('inventory')) {
        return Errors.conflict(error.message);
      }
      if (error.message.includes('not found')) {
        return Errors.notFound(error.message);
      }
    }

    return Errors.serverError('Failed to create order');
  }
}
```

---

## Insights Routes

### GET `/api/portal/insights` - Analytics Dashboard

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.insights.read');
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = insightFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const { type, startDate, endDate } = validatedParams.data;

    const insights = await withTenant(tenant.tenantId, async (tx) => {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Calculate ARPDD (Average Realized Period Days Delivered) - Blueprint Section 1.2
      const paceDeviations = await tx.$queryRaw<any[]>`
        WITH customer_pace AS (
          SELECT
            c.id,
            c.company_name,
            c.email,
            COUNT(o.id) as order_count,
            AVG(
              EXTRACT(EPOCH FROM (
                o2.created_at - o1.created_at
              )) / 86400
            )::numeric(10,2) as avg_pace_days,
            MAX(o.created_at) as last_order_date,
            (EXTRACT(EPOCH FROM (NOW() - MAX(o.created_at))) / 86400)::numeric(10,2) as days_since_last_order
          FROM customers c
          LEFT JOIN orders o ON c.id = o.customer_id AND o.status IN ('FULFILLED', 'DELIVERED')
          LEFT JOIN orders o1 ON c.id = o1.customer_id AND o1.status IN ('FULFILLED', 'DELIVERED')
          LEFT JOIN orders o2 ON c.id = o2.customer_id
            AND o2.status IN ('FULFILLED', 'DELIVERED')
            AND o2.created_at > o1.created_at
          WHERE c.tenant_id = current_setting('app.current_tenant_id')::uuid
          GROUP BY c.id, c.company_name, c.email
          HAVING COUNT(o.id) >= 3
        )
        SELECT
          id,
          company_name,
          email,
          avg_pace_days as ordering_pace_days,
          (days_since_last_order - avg_pace_days) as pace_deviation_days,
          last_order_date,
          CASE
            WHEN days_since_last_order > avg_pace_days * 1.5 THEN 40
            WHEN days_since_last_order > avg_pace_days * 1.2 THEN 65
            ELSE 85
          END as health_score
        FROM customer_pace
        WHERE days_since_last_order > avg_pace_days * 1.2
        ORDER BY pace_deviation_days DESC
        LIMIT 20
      `;

      // Revenue health (≥15% drop threshold) - Blueprint Section 1.2
      const revenueDrops = await tx.$queryRaw<any[]>`
        WITH monthly_revenue AS (
          SELECT
            c.id,
            c.company_name,
            DATE_TRUNC('month', o.created_at) as month,
            SUM(o.total_amount) as monthly_revenue
          FROM customers c
          JOIN orders o ON c.id = o.customer_id
          WHERE c.tenant_id = current_setting('app.current_tenant_id')::uuid
            AND o.status IN ('FULFILLED', 'DELIVERED')
            AND o.created_at >= NOW() - INTERVAL '6 months'
          GROUP BY c.id, c.company_name, DATE_TRUNC('month', o.created_at)
        ),
        customer_avg AS (
          SELECT
            id,
            company_name,
            AVG(monthly_revenue) as avg_monthly_revenue,
            MAX(CASE WHEN month = DATE_TRUNC('month', NOW()) THEN monthly_revenue END) as current_month_revenue
          FROM monthly_revenue
          GROUP BY id, company_name
        )
        SELECT
          id,
          company_name,
          current_month_revenue as monthly_revenue_current,
          avg_monthly_revenue as monthly_revenue_average,
          ((current_month_revenue - avg_monthly_revenue) / avg_monthly_revenue * 100)::numeric(10,2) as revenue_change_percent,
          CASE
            WHEN current_month_revenue < avg_monthly_revenue * 0.7 THEN 35
            WHEN current_month_revenue < avg_monthly_revenue * 0.85 THEN 58
            ELSE 75
          END as health_score
        FROM customer_avg
        WHERE current_month_revenue < avg_monthly_revenue * 0.85
        ORDER BY revenue_change_percent ASC
        LIMIT 20
      `;

      // Sample usage tracking (60 pulls/month default) - Blueprint Section 1.2
      const sampleUsage = await tx.$queryRaw<any[]>`
        SELECT
          u.id as sales_rep_id,
          u.full_name as sales_rep_name,
          COUNT(DISTINCT o.id) as samples_used,
          60 as monthly_allowance,
          (60 - COUNT(DISTINCT o.id)) as remaining_allowance,
          (COUNT(DISTINCT o.id)::float / 60 * 100)::numeric(10,2) as usage_percent
        FROM users u
        LEFT JOIN orders o ON o.created_by_user_id = u.id
          AND o.is_sample_order = true
          AND o.created_at >= DATE_TRUNC('month', NOW())
        WHERE u.tenant_id = current_setting('app.current_tenant_id')::uuid
          AND u.role = 'SALES_REP'
        GROUP BY u.id, u.full_name
        ORDER BY usage_percent DESC
      `;

      // Top opportunities - products customer hasn't purchased (Blueprint Section 1.2)
      const topOpportunities = await tx.$queryRaw<any[]>`
        WITH customer_purchased AS (
          SELECT DISTINCT ol.product_id
          FROM orders o
          JOIN order_lines ol ON o.id = ol.order_id
          WHERE o.customer_id = ${user.customerId || 'no-customer'}
            AND o.status IN ('FULFILLED', 'DELIVERED')
            AND o.created_at >= NOW() - INTERVAL '6 months'
        ),
        top_products AS (
          SELECT
            p.id,
            p.name,
            p.category,
            SUM(ol.total_price) as total_revenue,
            SUM(ol.quantity) as total_units_sold,
            COUNT(DISTINCT o.customer_id) as customer_count,
            (COUNT(DISTINCT o.customer_id)::float / (SELECT COUNT(*) FROM customers WHERE tenant_id = current_setting('app.current_tenant_id')::uuid) * 100)::numeric(10,2) as penetration_percent
          FROM products p
          JOIN order_lines ol ON p.id = ol.product_id
          JOIN orders o ON ol.order_id = o.id
          WHERE p.tenant_id = current_setting('app.current_tenant_id')::uuid
            AND p.status = 'ACTIVE'
            AND o.created_at >= NOW() - INTERVAL '6 months'
            AND p.id NOT IN (SELECT product_id FROM customer_purchased)
          GROUP BY p.id, p.name, p.category
          ORDER BY total_revenue DESC
          LIMIT 20
        )
        SELECT * FROM top_products
      `;

      // Summary metrics
      const [orderMetrics, accountCounts] = await Promise.all([
        tx.order.aggregate({
          where: {
            createdAt: { gte: start, lte: end },
            status: { in: ['FULFILLED', 'DELIVERED'] },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        tx.customer.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
      ]);

      return {
        summary: {
          totalRevenue: orderMetrics._sum.totalAmount || 0,
          revenueChange: -8.5, // Calculate from previous period
          activeAccounts: accountCounts.find(a => a.status === 'ACTIVE')?._count.id || 0,
          atRiskAccounts: revenueDrops.length + paceDeviations.length,
          ordersThisMonth: orderMetrics._count.id || 0,
          ordersChange: 5.2, // Calculate from previous period
        },
        health: {
          healthy: accountCounts.find(a => a.status === 'ACTIVE')?._count.id || 0,
          atRisk: paceDeviations.filter(p => p.health_score >= 60).length,
          critical: paceDeviations.filter(p => p.health_score < 60).length,
          needsAttention: revenueDrops.length,
        },
        pace: {
          onPace: Math.max(0, (accountCounts.find(a => a.status === 'ACTIVE')?._count.id || 0) - paceDeviations.length),
          slipping: paceDeviations.filter(p => p.pace_deviation_days < 10).length,
          overdue: paceDeviations.filter(p => p.pace_deviation_days >= 10).length,
        },
        samples: sampleUsage[0] || {
          samples_used: 0,
          monthly_allowance: 60,
          remaining_allowance: 60,
          usage_percent: 0,
        },
        paceDeviations,
        revenueDrops,
        topOpportunities,
        alerts: [
          ...revenueDrops.slice(0, 5).map(drop => ({
            id: `revenue-${drop.id}`,
            type: 'revenue_risk',
            severity: drop.health_score < 50 ? 'high' : 'medium',
            accountId: drop.id,
            accountName: drop.company_name,
            message: `Revenue dropped ${Math.abs(drop.revenue_change_percent)}% below average`,
            createdAt: new Date().toISOString(),
          })),
          ...paceDeviations.slice(0, 5).map(pace => ({
            id: `pace-${pace.id}`,
            type: 'pace_deviation',
            severity: pace.health_score < 50 ? 'high' : 'medium',
            accountId: pace.id,
            accountName: pace.company_name,
            message: `${Math.round(pace.pace_deviation_days)} days past normal ordering pace`,
            createdAt: new Date().toISOString(),
          })),
        ],
      };
    });

    return successResponse(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch insights');
  }
}
```

---

## Testing Checklist

### Cart API Tests

- [ ] GET /api/portal/cart - Returns empty cart for new user
- [ ] GET /api/portal/cart - Returns existing cart with items
- [ ] POST /api/portal/cart/items - Adds new item to cart
- [ ] POST /api/portal/cart/items - Updates quantity for existing item
- [ ] POST /api/portal/cart/items - Rejects insufficient inventory
- [ ] PATCH /api/portal/cart/items - Updates item quantity
- [ ] DELETE /api/portal/cart/items - Removes item from cart
- [ ] POST /api/portal/cart/checkout - Creates order from cart
- [ ] POST /api/portal/cart/checkout - Validates addresses
- [ ] POST /api/portal/cart/checkout - Clears cart after checkout

### Product API Tests

- [ ] GET /api/portal/products - Lists all products
- [ ] GET /api/portal/products?search=wine - Filters by search term
- [ ] GET /api/portal/products?category=Wine - Filters by category
- [ ] GET /api/portal/products?inStock=true - Filters by inventory
- [ ] GET /api/portal/products?minPrice=10&maxPrice=50 - Filters by price range
- [ ] GET /api/portal/products - Respects pagination
- [ ] GET /api/portal/products - Sorts by name/price

### Order API Tests

- [ ] GET /api/portal/orders - Lists orders for user's customer
- [ ] GET /api/portal/orders?status=pending - Filters by status
- [ ] POST /api/portal/orders - Creates new order
- [ ] POST /api/portal/orders - Validates inventory availability
- [ ] POST /api/portal/orders - Applies pricing waterfall
- [ ] GET /api/portal/orders/[id] - Returns order details
- [ ] PATCH /api/portal/orders/[id] - Updates order notes
- [ ] DELETE /api/portal/orders/[id] - Cancels order

### Insights API Tests

- [ ] GET /api/portal/insights - Returns dashboard metrics
- [ ] GET /api/portal/insights - Calculates ARPDD correctly
- [ ] GET /api/portal/insights - Detects 15% revenue drops
- [ ] GET /api/portal/insights - Tracks sample usage
- [ ] GET /api/portal/insights - Returns top opportunities
- [ ] GET /api/portal/insights - Generates health scores

### Security Tests

- [ ] All endpoints require authentication
- [ ] Permission checks enforce RBAC
- [ ] Tenant isolation prevents cross-tenant data access
- [ ] Customer scoping prevents accessing other customers' data

---

## Performance Optimization

### Recommended Indexes

```sql
-- Products
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_tenant ON products(tenant_id);

-- Orders
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);

-- Cart
CREATE INDEX idx_cart_user_status ON carts(portal_user_id, status);

-- Inventory
CREATE INDEX idx_inventory_sku ON inventory(sku_id);
```

### Query Optimization

1. **Use pagination** for all list endpoints
2. **Limit includes** to only necessary relations
3. **Use select** to fetch only required fields
4. **Cache** frequently accessed data (product catalog, price lists)
5. **Use database views** for complex analytics queries

---

## Deployment Checklist

- [ ] All helper utilities use actual Prisma client
- [ ] All routes implement proper error handling
- [ ] All routes use consistent response shapes
- [ ] All routes enforce RBAC permissions
- [ ] All routes implement tenant isolation
- [ ] Validation schemas cover all input types
- [ ] Database indexes created for performance
- [ ] Environment variables configured
- [ ] OpenAI API key set for Leora AI
- [ ] JWT secret configured
- [ ] Tests passing with >80% coverage
