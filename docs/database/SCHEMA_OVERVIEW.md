# Leora Platform - Schema Overview

## Table Summary

### Core Tenancy (2 tables)
- `tenants` - Multi-tenant organizations
- `tenant_settings` - Tenant-specific configuration

### Identity & Access (7 tables)
- `users` - Internal users (sales reps, managers)
- `roles` - RBAC roles
- `permissions` - Granular permissions
- `user_roles` - User-to-role assignments
- `role_permissions` - Role-to-permission mappings
- `portal_users` - B2B customer portal users
- `portal_user_roles` - Portal user role assignments
- `portal_sessions` - JWT session tracking

### Commerce: Products (5 tables)
- `products` - Product catalog (wines, spirits, etc.)
- `skus` - Product variants and packaging
- `inventory` - Stock tracking
- `price_list_entries` - Dynamic pricing
- `suppliers` - Product suppliers

### Commerce: Customers (2 tables)
- `customers` - B2B customer accounts
- (relations to portal_users, orders, invoices)

### Commerce: Orders (6 tables)
- `orders` - Customer orders
- `order_lines` - Order line items
- `invoices` - Billing records
- `payments` - Payment tracking
- `carts` - Shopping carts
- `cart_items` - Cart line items

### Commerce: Lists (2 tables)
- `lists` - User-created product lists
- `list_items` - List contents

### Intelligence (5 tables)
- `activities` - Sales activities and interactions
- `call_plans` - Scheduled customer visits
- `tasks` - Action items
- `account_health_snapshots` - Customer health metrics
- `sales_metrics` - Analytics and KPIs

### Compliance (2 tables)
- `compliance_filings` - State compliance tracking
- `state_tax_rates` - Tax rate configuration

### Integrations (4 tables)
- `webhook_subscriptions` - Outbound webhook endpoints
- `webhook_events` - Event log
- `webhook_deliveries` - Delivery tracking
- `integration_tokens` - Third-party API tokens

### Notifications (1 table)
- `notifications` - User notifications

**Total: 36 tables**

## Key Design Patterns

### 1. Multi-Tenancy
All business tables include `tenantId` column (except system tables like `roles`, `permissions`, `suppliers`).

```prisma
model Product {
  id       String @id
  tenantId String
  tenant   Tenant @relation(...)
  // ...
}
```

### 2. Soft Enums
Status fields use Prisma enums for type safety:

```prisma
enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### 3. Audit Timestamps
All tables include:
- `createdAt` - Record creation timestamp
- `updatedAt` - Last modification timestamp

### 4. Flexible Metadata
Many tables include `metadata` JSON field for extensibility:

```prisma
model Order {
  // ...
  metadata Json?
}
```

### 5. Tenant-Scoped Unique Constraints
Business identifiers are unique per tenant:

```prisma
@@unique([tenantId, sku])
@@unique([tenantId, accountNumber])
```

## Critical Relationships

### Tenant Hierarchy
```
Tenant (1)
  ├── TenantSettings (1)
  ├── Users (N)
  ├── PortalUsers (N)
  ├── Products (N)
  ├── Customers (N)
  └── Orders (N)
```

### Order Flow
```
Customer (1)
  ├── PortalUsers (N)
  ├── Carts (N)
  │   └── CartItems (N)
  ├── Orders (N)
  │   ├── OrderLines (N)
  │   └── Invoices (N)
  │       └── Payments (N)
  └── Activities (N)
```

### Product Catalog
```
Product (1)
  ├── Supplier (1, optional)
  ├── Skus (N)
  ├── PriceListEntries (N)
  ├── Inventory (N)
  ├── OrderLines (N)
  ├── CartItems (N)
  └── ListItems (N)
```

### Intelligence & Health
```
Customer (1)
  ├── Activities (N)
  ├── CallPlans (N)
  ├── Tasks (N)
  └── AccountHealthSnapshots (N)
      ├── Revenue metrics
      ├── Order pace (ARPDD)
      └── Sample usage
```

## Data Types & Precision

### Currency Fields
```prisma
amount Decimal @db.Decimal(10,2)
```
- 10 total digits
- 2 decimal places
- Max: $99,999,999.99

### Percentages
```prisma
alcoholPercent Decimal @db.Decimal(5,2)
```
- 5 total digits
- 2 decimal places
- Max: 999.99%

### Metrics
```prisma
metricValue Decimal @db.Decimal(15,4)
```
- High precision for analytics
- 15 total digits
- 4 decimal places

## Performance Indexes

### Primary Indexes (Auto-created)
- `@id` fields (primary key)
- `@unique` constraints
- Foreign key relations

### Explicit Indexes

```prisma
// Tenant + status queries
@@index([tenantId, status])

// Date range queries
@@index([orderDate])
@@index([createdAt])

// Foreign key lookups
@@index([customerId])
@@index([productId])

// Composite lookups
@@index([tenantId, portalUserId])
```

## Common Query Patterns

### Tenant-Scoped Queries
```typescript
// All queries automatically filtered by tenantId via RLS
await tx.product.findMany({
  where: { status: 'ACTIVE' }
});
```

### Customer Orders
```typescript
await tx.order.findMany({
  where: {
    customerId: customerId,
    status: { in: ['PENDING', 'CONFIRMED'] }
  },
  include: {
    lines: { include: { product: true } },
    customer: true
  },
  orderBy: { orderDate: 'desc' }
});
```

### Health Snapshots
```typescript
await tx.accountHealthSnapshot.findFirst({
  where: { customerId },
  orderBy: { snapshotDate: 'desc' }
});
```

### Portal User Context
```typescript
await tx.portalUser.findUnique({
  where: {
    tenantId_email: { tenantId, email }
  },
  include: {
    customer: true,
    roleAssignments: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        }
      }
    }
  }
});
```

## Migration Strategy

### Development
```bash
# Create and apply migration
npx prisma migrate dev --name feature_name

# Generate Prisma client
npx prisma generate
```

### Production
```bash
# Deploy migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### RLS Policies
```bash
# After Prisma migrations
psql $DATABASE_URL -f prisma/rls-policies.sql
```

## Data Consistency Rules

### Cascading Deletes
- Tenant deletion → cascades to all tenant data
- Order deletion → cascades to order lines
- Cart deletion → cascades to cart items

### Status Transitions
- Orders: DRAFT → PENDING → CONFIRMED → SHIPPED → DELIVERED
- Invoices: DRAFT → SENT → PARTIAL → PAID
- Carts: ACTIVE → CONVERTED (to order) or ABANDONED

### Business Rules
- Minimum 3 orders required for health scoring
- Sample allowance per rep: 60 pulls/month (configurable)
- Revenue health threshold: 15% drop (configurable)
- Pace risk threshold: 2 days beyond established pace

## Future Enhancements

### Planned Additions
- `product_bundles` - Product grouping and kits
- `promotions` - Discount and promotion rules
- `territories` - Sales territory management
- `quotas` - Sales quota tracking
- `forecasts` - Revenue forecasting

### Optimization Candidates
- Materialized views for analytics
- Partitioning for large tables (orders, activities)
- JSONB indexes for metadata queries
- Full-text search on products

## References

- [Prisma Schema](/prisma/schema.prisma)
- [RLS Policies](/prisma/rls-policies.sql)
- [Seed Script](/scripts/seed-well-crafted-tenant.ts)
- [Database Helpers](/lib/prisma.ts)
