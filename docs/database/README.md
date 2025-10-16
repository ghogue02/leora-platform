# Leora Platform - Database Documentation

## Overview

Leora uses a **multi-tenant PostgreSQL database** hosted on Supabase with Prisma ORM for type-safe data access. All data is tenant-scoped using Row-Level Security (RLS) policies and session-based tenant context.

## Key Features

- **Multi-tenancy**: Shared schema with tenant isolation via `tenantId` columns and RLS
- **Type Safety**: Prisma generates TypeScript types from schema
- **Connection Pooling**: Serverless-optimized with Supabase pooler
- **Data Isolation**: RLS policies enforce tenant boundaries at the database level
- **RBAC**: Role-based access control with flexible permissions system

## Architecture

### Multi-Tenancy Strategy

1. **Shared Schema**: All tenants use the same database schema
2. **Tenant Context**: `app.current_tenant_id` session parameter set per request
3. **RLS Enforcement**: PostgreSQL policies filter data automatically
4. **Prisma Helpers**: `withTenant()` ensures tenant context is always set

```typescript
// Example: Query products for a specific tenant
const products = await withTenant(tenantId, async (tx) => {
  return tx.product.findMany({
    where: { status: 'ACTIVE' }
  });
});
```

### Connection Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Vercel)      │
└────────┬────────┘
         │
         │ DATABASE_URL (pooled)
         ▼
┌─────────────────┐
│ Supabase Pooler │ ← Connection pooling for serverless
│   (PgBouncer)   │
└────────┬────────┘
         │
         │ DIRECT_URL (migrations)
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Database      │
│   (Supabase)    │
└─────────────────┘
```

## Data Models

### Core Entities

#### Tenancy & Identity
- **Tenant**: Multi-tenant organizations
- **TenantSettings**: Tenant-specific configuration
- **User**: Internal users (sales reps, managers)
- **Role**: RBAC roles (admin, sales_rep, portal_user)
- **Permission**: Granular access control

#### Portal (B2B Customers)
- **PortalUser**: Customer portal users
- **PortalSession**: JWT-based sessions
- **Customer**: B2B customer accounts

#### Commerce
- **Product**: Catalog items (wines, spirits, etc.)
- **Sku**: Product variants and packaging
- **Inventory**: Stock tracking
- **PriceListEntry**: Dynamic pricing by tier/customer

#### Orders & Invoices
- **Order**: Customer orders with status tracking
- **OrderLine**: Individual line items
- **Invoice**: Billing records
- **Payment**: Payment tracking

#### Intelligence
- **Activity**: Sales activities and interactions
- **CallPlan**: Scheduled customer visits
- **Task**: Action items for sales reps
- **AccountHealthSnapshot**: Customer health metrics
- **SalesMetric**: Analytics and KPIs

#### Integrations
- **WebhookSubscription**: Outbound webhook endpoints
- **WebhookEvent**: Event log
- **WebhookDelivery**: Delivery tracking with retries
- **IntegrationToken**: Third-party API tokens

### Entity Relationships

```
Tenant
  ├── TenantSettings (1:1)
  ├── Users (1:N)
  ├── PortalUsers (1:N)
  ├── Products (1:N)
  ├── Customers (1:N)
  ├── Orders (1:N)
  └── Invoices (1:N)

Customer
  ├── PortalUsers (1:N)
  ├── Orders (1:N)
  ├── Invoices (1:N)
  ├── Activities (1:N)
  └── HealthSnapshots (1:N)

Order
  ├── OrderLines (1:N)
  ├── Invoices (1:N)
  └── Activities (1:N)
```

## Schema Management

### Migrations

```bash
# Create migration
npx prisma migrate dev --name add_new_feature

# Deploy to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Seeding

```bash
# Seed initial data
npm run seed

# Or directly
npx ts-node scripts/seed-well-crafted-tenant.ts
```

The seed script creates:
- Well Crafted tenant with settings
- System roles and permissions
- Sample products (wines)
- Sample customers
- Demo portal users
- Sample orders and invoices

## Row-Level Security (RLS)

### Enabling RLS

All business tables have RLS enabled to enforce tenant isolation:

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_all ON products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));
```

### Testing RLS

```sql
-- Set tenant context
SET app.current_tenant_id = 'tenant-id-here';

-- Query should only return tenant's data
SELECT * FROM products;

-- Verify policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

### Applying RLS Policies

```bash
# After Prisma migrations
psql $DATABASE_URL -f prisma/rls-policies.sql
```

## Usage Patterns

### Basic Queries

```typescript
import { prisma, withTenant } from '@/lib/prisma';

// Query with tenant context
const products = await withTenant(tenantId, async (tx) => {
  return tx.product.findMany({
    where: {
      status: 'ACTIVE',
      category: 'Wine'
    },
    include: {
      supplier: true,
      priceListEntries: true
    }
  });
});
```

### API Route Integration

```typescript
import { withTenantFromRequest } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Extract tenant from request headers
  const context = await withTenantFromRequest(request);

  // Query with tenant context
  const orders = await withTenant(context.tenantId, async (tx) => {
    return tx.order.findMany({
      where: { status: 'PENDING' }
    });
  });

  return Response.json({ orders });
}
```

### Portal User Context

```typescript
import { withPortalUserFromRequest } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Extract portal user with RBAC
  const context = await withPortalUserFromRequest(request, {
    requirePermissions: ['orders.view']
  });

  // Query scoped to user's customer
  const orders = await withTenant(context.tenantId, async (tx) => {
    return tx.order.findMany({
      where: {
        customerId: context.customerId,
        portalUserId: context.portalUserId
      }
    });
  });

  return Response.json({ orders });
}
```

## Performance Optimization

### Connection Pooling

- Use `DATABASE_URL` with Supabase pooler for serverless
- Use `DIRECT_URL` for migrations and long-running operations
- Configure pool size based on deployment platform

### Indexing

Key indexes defined in schema:
- `tenantId` + status columns
- Foreign key relationships
- Date fields for time-range queries
- Composite unique constraints

### Query Optimization

```typescript
// Use select to limit fields
const products = await tx.product.findMany({
  select: {
    id: true,
    name: true,
    sku: true,
    status: true
  }
});

// Use pagination
const orders = await tx.order.findMany({
  take: 20,
  skip: page * 20,
  orderBy: { orderDate: 'desc' }
});

// Use includerelations judiciously
const order = await tx.order.findUnique({
  where: { id: orderId },
  include: {
    lines: {
      include: { product: true }
    }
  }
});
```

## Backup & Recovery

### Automated Backups

Supabase provides:
- Daily automated backups
- Point-in-time recovery (PITR)
- Manual backup triggers

### Export Data

```bash
# Export schema
npx prisma db pull

# Export data (via Supabase dashboard)
# Database → Backups → Download
```

## Troubleshooting

### Connection Issues

```typescript
// Test connection
import { checkDatabaseConnection } from '@/lib/prisma';

const isHealthy = await checkDatabaseConnection();
console.log('Database connection:', isHealthy ? 'OK' : 'FAILED');
```

### RLS Debugging

```sql
-- Check current tenant context
SELECT current_setting('app.current_tenant_id', true);

-- Disable RLS temporarily (superuser only)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### Migration Failures

```bash
# Mark migration as applied without running
npx prisma migrate resolve --applied "migration_name"

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "migration_name"
```

## Environment Variables

Required database environment variables:

```bash
# Primary connection (pooled for serverless)
DATABASE_URL="postgresql://..."

# Direct connection for migrations
DIRECT_URL="postgresql://..."

# Shadow database for safe migrations (optional)
SHADOW_DATABASE_URL="postgresql://..."

# Default tenant
DEFAULT_TENANT_SLUG="well-crafted"
```

See `.env.example` for complete configuration.

## Security Best Practices

1. **Never expose service role keys** client-side
2. **Always use withTenant()** for queries
3. **Validate tenant context** in API routes
4. **Enable RLS** on all business tables
5. **Use prepared statements** (Prisma handles this)
6. **Rotate credentials** periodically
7. **Audit access logs** regularly

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Blueprint Section 4](/leora-platform-blueprint.md#4-supabase--data-architecture)
