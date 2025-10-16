# Database Migration & Seeding Guide

Comprehensive guide for managing database migrations and seeding data for the Leora Platform with Supabase Postgres.

---

## Table of Contents

1. [Initial Migration Setup](#1-initial-migration-setup)
2. [RLS (Row Level Security) Setup](#2-rls-row-level-security-setup)
3. [Seeding Process](#3-seeding-process)
4. [Migration Best Practices](#4-migration-best-practices)
5. [Common Migration Tasks](#5-common-migration-tasks)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Initial Migration Setup

### 1.1 Prerequisites

Ensure your environment variables are configured:

```bash
# .env.local
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"
```

### 1.2 Creating Initial Migration from Existing Schema

If you're starting from an existing Supabase database with tables already created:

```bash
# Pull current database schema into Prisma
npx prisma db pull

# Review the generated schema.prisma file
# Make any necessary adjustments (relations, indexes, etc.)

# Create baseline migration
npx prisma migrate dev --name init --create-only

# Review the generated migration SQL
# Ensure it doesn't try to recreate existing tables
```

### 1.3 Handling Existing Supabase Tables

If tables already exist in Supabase, you need to create a **baseline migration** that marks the current state without recreating tables:

```bash
# Step 1: Create migration folder
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_init

# Step 2: Create empty migration file
cat > prisma/migrations/$(date +%Y%m%d%H%M%S)_init/migration.sql << 'EOF'
-- This is a baseline migration for existing Supabase schema
-- No tables are created; this marks the schema state

-- Add comments to existing tables for documentation
COMMENT ON TABLE tenants IS 'Multi-tenant organization accounts';
COMMENT ON TABLE users IS 'Internal sales reps and managers';
COMMENT ON TABLE portal_users IS 'B2B customer portal users';
COMMENT ON TABLE products IS 'Product catalog';
COMMENT ON TABLE orders IS 'Customer orders and deliveries';

-- Ensure all expected tables exist (validation queries)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants') THEN
        RAISE EXCEPTION 'Table tenants does not exist. Run schema creation first.';
    END IF;
END
$$;
EOF

# Step 3: Mark migration as applied
npx prisma migrate resolve --applied $(ls -t prisma/migrations | head -1)
```

### 1.4 Creating Fresh Schema (New Database)

If starting with an empty database:

```bash
# Create and apply initial migration
npx prisma migrate dev --name init

# This will:
# 1. Create all tables defined in schema.prisma
# 2. Create migration SQL file
# 3. Apply migration to database
# 4. Generate Prisma Client
```

---

## 2. RLS (Row Level Security) Setup

### 2.1 Overview

Row Level Security (RLS) enforces tenant isolation at the database level using PostgreSQL policies that check the `app.current_tenant_id` session parameter.

**Key Concepts:**
- Every query must set `current_setting('app.current_tenant_id')`
- RLS policies automatically filter rows based on tenantId
- Prevents accidental cross-tenant data access
- Required for production multi-tenancy

### 2.2 Enable RLS on All Tables

Create a migration to enable RLS:

```bash
npx prisma migrate dev --name enable_rls --create-only
```

Edit the generated migration file:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: System tables (roles, permissions, role_permissions, portal_sessions)
-- do not have RLS since they are global or session-specific
```

Apply the migration:

```bash
npx prisma migrate dev
```

### 2.3 RLS Policy Examples

#### 2.3.1 Tenants Table Policy

```sql
-- Policy: Users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
    FOR ALL
    USING (
        id = current_setting('app.current_tenant_id', true)::text
    );

-- Allow admins to bypass RLS (for admin operations)
CREATE POLICY tenant_admin_bypass ON tenants
    FOR ALL
    USING (
        current_setting('app.bypass_rls', true)::text = 'true'
    );
```

#### 2.3.2 Users Table Policy

```sql
-- Policy: Users scoped by tenant
CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
    );
```

#### 2.3.3 Portal Users Table Policy

```sql
-- Policy: Portal users scoped by tenant
CREATE POLICY portal_users_tenant_isolation ON portal_users
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
    );

-- Additional policy: Portal users can only see themselves
CREATE POLICY portal_users_self_access ON portal_users
    FOR SELECT
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND id = current_setting('app.current_portal_user_id', true)::text
    );
```

#### 2.3.4 Products Table Policy

```sql
-- Policy: Products scoped by tenant
CREATE POLICY products_tenant_isolation ON products
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
    );
```

#### 2.3.5 Orders Table Policy

```sql
-- Policy: Orders scoped by tenant
CREATE POLICY orders_tenant_isolation ON orders
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
    );

-- Additional policy: Portal users see only their customer's orders
CREATE POLICY orders_portal_user_access ON orders
    FOR SELECT
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND (
            "portalUserId" = current_setting('app.current_portal_user_id', true)::text
            OR "customerId" IN (
                SELECT "customerId" FROM portal_users
                WHERE id = current_setting('app.current_portal_user_id', true)::text
            )
        )
    );
```

#### 2.3.6 Customers Table Policy

```sql
-- Policy: Customers scoped by tenant
CREATE POLICY customers_tenant_isolation ON customers
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
    );
```

#### 2.3.7 Invoices Table Policy

```sql
-- Policy: Invoices scoped by tenant
CREATE POLICY invoices_tenant_isolation ON invoices
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
    );

-- Additional policy: Portal users see only their customer's invoices
CREATE POLICY invoices_portal_user_access ON invoices
    FOR SELECT
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND "customerId" IN (
            SELECT "customerId" FROM portal_users
            WHERE id = current_setting('app.current_portal_user_id', true)::text
        )
    );
```

### 2.4 Complete RLS Migration Script

Create this as a migration:

```bash
npx prisma migrate dev --name create_rls_policies --create-only
```

```sql
-- migration.sql: Create RLS policies for all tables

-- ============================================================================
-- TENANTS
-- ============================================================================

CREATE POLICY tenant_isolation ON tenants
    FOR ALL
    USING (id = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- PORTAL USERS
-- ============================================================================

CREATE POLICY portal_users_tenant_isolation ON portal_users
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY portal_users_self_access ON portal_users
    FOR SELECT
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND id = current_setting('app.current_portal_user_id', true)::text
    );

-- ============================================================================
-- PRODUCTS
-- ============================================================================

CREATE POLICY products_tenant_isolation ON products
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- SKUS
-- ============================================================================

CREATE POLICY skus_tenant_isolation ON skus
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- INVENTORY
-- ============================================================================

CREATE POLICY inventory_tenant_isolation ON inventory
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- PRICE LIST ENTRIES
-- ============================================================================

CREATE POLICY price_list_entries_tenant_isolation ON price_list_entries
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

CREATE POLICY customers_tenant_isolation ON customers
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================

CREATE POLICY suppliers_tenant_isolation ON suppliers
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- ORDERS
-- ============================================================================

CREATE POLICY orders_tenant_isolation ON orders
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY orders_portal_user_access ON orders
    FOR SELECT
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND (
            "portalUserId" = current_setting('app.current_portal_user_id', true)::text
            OR "customerId" IN (
                SELECT "customerId" FROM portal_users
                WHERE id = current_setting('app.current_portal_user_id', true)::text
            )
        )
    );

-- ============================================================================
-- ORDER LINES (scoped via order relationship)
-- ============================================================================

CREATE POLICY order_lines_tenant_isolation ON order_lines
    FOR ALL
    USING (
        "orderId" IN (
            SELECT id FROM orders
            WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
        )
    );

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE POLICY invoices_tenant_isolation ON invoices
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY invoices_portal_user_access ON invoices
    FOR SELECT
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND "customerId" IN (
            SELECT "customerId" FROM portal_users
            WHERE id = current_setting('app.current_portal_user_id', true)::text
        )
    );

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE POLICY payments_tenant_isolation ON payments
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- CARTS
-- ============================================================================

CREATE POLICY carts_tenant_isolation ON carts
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY carts_portal_user_access ON carts
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND "portalUserId" = current_setting('app.current_portal_user_id', true)::text
    );

-- ============================================================================
-- CART ITEMS (scoped via cart relationship)
-- ============================================================================

CREATE POLICY cart_items_tenant_isolation ON cart_items
    FOR ALL
    USING (
        "cartId" IN (
            SELECT id FROM carts
            WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
        )
    );

-- ============================================================================
-- LISTS
-- ============================================================================

CREATE POLICY lists_tenant_isolation ON lists
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY lists_portal_user_access ON lists
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND "portalUserId" = current_setting('app.current_portal_user_id', true)::text
    );

-- ============================================================================
-- LIST ITEMS (scoped via list relationship)
-- ============================================================================

CREATE POLICY list_items_tenant_isolation ON list_items
    FOR ALL
    USING (
        "listId" IN (
            SELECT id FROM lists
            WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
        )
    );

-- ============================================================================
-- ACTIVITIES
-- ============================================================================

CREATE POLICY activities_tenant_isolation ON activities
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- CALL PLANS
-- ============================================================================

CREATE POLICY call_plans_tenant_isolation ON call_plans
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE POLICY tasks_tenant_isolation ON tasks
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- ACCOUNT HEALTH SNAPSHOTS
-- ============================================================================

CREATE POLICY account_health_snapshots_tenant_isolation ON account_health_snapshots
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- SALES METRICS
-- ============================================================================

CREATE POLICY sales_metrics_tenant_isolation ON sales_metrics
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- COMPLIANCE FILINGS
-- ============================================================================

CREATE POLICY compliance_filings_tenant_isolation ON compliance_filings
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- STATE TAX RATES
-- ============================================================================

CREATE POLICY state_tax_rates_tenant_isolation ON state_tax_rates
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- WEBHOOK SUBSCRIPTIONS
-- ============================================================================

CREATE POLICY webhook_subscriptions_tenant_isolation ON webhook_subscriptions
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- WEBHOOK EVENTS
-- ============================================================================

CREATE POLICY webhook_events_tenant_isolation ON webhook_events
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- WEBHOOK DELIVERIES (scoped via subscription relationship)
-- ============================================================================

CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
    FOR ALL
    USING (
        "subscriptionId" IN (
            SELECT id FROM webhook_subscriptions
            WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
        )
    );

-- ============================================================================
-- INTEGRATION TOKENS
-- ============================================================================

CREATE POLICY integration_tokens_tenant_isolation ON integration_tokens
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE POLICY notifications_tenant_isolation ON notifications
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY notifications_portal_user_access ON notifications
    FOR ALL
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        AND "portalUserId" = current_setting('app.current_portal_user_id', true)::text
    );
```

Apply the migration:

```bash
npx prisma migrate dev
```

### 2.5 Testing RLS Policies

Test tenant isolation manually in Supabase SQL Editor:

```sql
-- Set tenant context
SELECT set_config('app.current_tenant_id', 'your-tenant-id-here', false);

-- Query should only return products for that tenant
SELECT * FROM products;

-- Verify isolation by checking tenant IDs
SELECT DISTINCT "tenantId" FROM products;

-- Test portal user context
SELECT set_config('app.current_portal_user_id', 'portal-user-id-here', false);

-- Should only see that user's carts
SELECT * FROM carts;
```

---

## 3. Seeding Process

### 3.1 Overview

The seed script at `/scripts/seed-well-crafted-tenant.ts` creates:
- Well Crafted tenant with settings
- System roles (admin, sales_manager, sales_rep, portal_admin, portal_user)
- Permissions for products, orders, customers, portal, analytics
- Sample products (3 wines)
- Sample customers (3 B2B accounts)
- Portal users linked to customers
- Demo orders and invoices

### 3.2 Running the Seed Script

```bash
# Using ts-node directly
npx ts-node scripts/seed-well-crafted-tenant.ts

# Or via package.json script (if configured)
npm run seed

# With environment variables
DATABASE_URL="your-connection-string" npx ts-node scripts/seed-well-crafted-tenant.ts
```

### 3.3 What Gets Seeded

#### Tenant Data
- **Slug**: `well-crafted`
- **Name**: Well Crafted
- **Tier**: enterprise
- **Settings**: Health scoring thresholds, sample allowances, pace tracking config

#### Roles & Permissions
- **admin**: Full access to all resources
- **sales_manager**: Products, orders, customers, analytics
- **sales_rep**: View products, create orders, view customers
- **portal_admin**: Full portal access + reports
- **portal_user**: Basic portal access (cart, favorites, orders)

#### Products
1. **WC-CAB-001**: Estate Reserve Cabernet Sauvignon (2021 Napa Valley)
2. **WC-CHARD-001**: Sonoma Coast Chardonnay (2022)
3. **WC-PINOT-001**: Willamette Valley Pinot Noir (2021)

#### Customers
1. **WC-001**: Harborview Cellars (Premium tier, NET30)
2. **WC-002**: Downtown Wine & Spirits (Standard tier, NET30)
3. **WC-003**: Vineyard Market (Premium tier, NET15)

#### Portal Users
- Created for each customer using their primary contact email
- Automatically assigned `portal_user` role
- Email verified by default for demo purposes

#### Demo Orders & Invoices
- Sample delivered order (30 days ago)
- Corresponding paid invoice (delivered 25 days ago, paid 5 days ago)
- Total: $1,308 including tax

### 3.4 Adding Additional Tenants

To seed a second tenant (e.g., "New Distributor"):

```typescript
// scripts/seed-new-tenant.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'new-distributor',
      name: 'New Distributor LLC',
      status: 'ACTIVE',
      subscriptionTier: 'starter',
      contactEmail: 'admin@newdistributor.com',
      settings: {
        create: {
          defaultCurrency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YY',
          revenueHealthDropPercent: 15,
          minimumOrdersForHealth: 3,
          defaultSampleAllowancePerRep: 60,
          requireManagerApprovalAbove: 60,
          minimumOrdersForPaceCalc: 3,
          paceRiskThresholdDays: 2,
          portalEnabled: true,
          cartEnabled: true,
          invoiceVisibility: true,
        },
      },
    },
    include: { settings: true },
  });

  console.log('Created tenant:', tenant);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run it:

```bash
npx ts-node scripts/seed-new-tenant.ts
```

### 3.5 Creating Demo Users

Create internal sales users:

```typescript
// scripts/create-demo-users.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'well-crafted' }
  });

  if (!tenant) throw new Error('Tenant not found');

  // Create sales manager
  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'manager@wellcrafted.com',
      passwordHash: await bcrypt.hash('demo-password', 10),
      firstName: 'Sales',
      lastName: 'Manager',
      fullName: 'Sales Manager',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // Assign sales_manager role
  const role = await prisma.role.findUnique({
    where: { name: 'sales_manager' }
  });

  if (role) {
    await prisma.userRole.create({
      data: {
        userId: manager.id,
        roleId: role.id,
      },
    });
  }

  console.log('Created sales manager:', manager.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 4. Migration Best Practices

### 4.1 Development Workflow

```bash
# 1. Make schema changes in prisma/schema.prisma
# Edit the schema file...

# 2. Create a named migration
npx prisma migrate dev --name add_user_preferences

# This will:
# - Generate migration SQL
# - Apply to local database
# - Regenerate Prisma Client

# 3. Review generated SQL before committing
cat prisma/migrations/*/migration.sql

# 4. Commit schema + migration to git
git add prisma/schema.prisma prisma/migrations
git commit -m "Add user preferences field"
```

### 4.2 Production Workflow

```bash
# 1. Deploy migrations to production (Vercel, etc.)
npx prisma migrate deploy

# This will:
# - Apply pending migrations only
# - NOT prompt for confirmation
# - NOT generate Prisma Client (build step does this)

# 2. Verify migration status
npx prisma migrate status

# Expected output: "Database schema is up to date!"
```

### 4.3 Rollback Procedures

Prisma **does not support automatic rollback**. You must create a new migration to undo changes:

```bash
# Example: Undo adding a column
npx prisma migrate dev --name remove_user_preferences --create-only

# Edit the migration SQL manually:
# ALTER TABLE users DROP COLUMN preferences;

# Apply the rollback migration
npx prisma migrate dev
```

**Critical**: Always test rollbacks in a staging environment first.

### 4.4 Schema Drift Detection

Detect when database schema differs from Prisma schema:

```bash
# Check for drift
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script

# If drift detected, options:
# 1. Reset database (DEV ONLY)
npx prisma migrate reset

# 2. Create migration to sync
npx prisma migrate dev --name sync_schema_drift
```

### 4.5 Migration Safety Checklist

Before deploying migrations to production:

- [ ] Backup database (Supabase provides point-in-time recovery)
- [ ] Test migration on staging environment
- [ ] Review generated SQL for destructive operations (DROP, TRUNCATE)
- [ ] Check for data migrations that require backfilling
- [ ] Verify RLS policies are not broken by schema changes
- [ ] Ensure indexes exist for new foreign keys
- [ ] Test rollback procedure
- [ ] Notify team of maintenance window if needed
- [ ] Monitor error rates post-deployment

---

## 5. Common Migration Tasks

### 5.1 Adding a New Table

```prisma
// prisma/schema.prisma
model NewsletterSubscription {
  id                String   @id @default(cuid())
  tenantId          String
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  email             String
  status            String   @default("active")

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tenantId, email])
  @@index([tenantId, status])
  @@map("newsletter_subscriptions")
}
```

```bash
# Create migration
npx prisma migrate dev --name add_newsletter_subscriptions

# Add RLS policy in a follow-up migration
npx prisma migrate dev --name add_newsletter_rls --create-only
```

```sql
-- migration.sql
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY newsletter_subscriptions_tenant_isolation ON newsletter_subscriptions
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
```

### 5.2 Modifying Columns

#### Adding a Nullable Column

```prisma
model Customer {
  // ... existing fields
  loyaltyTier       String?  // New field
}
```

```bash
npx prisma migrate dev --name add_customer_loyalty_tier
```

#### Making a Column Non-Nullable (with default)

```prisma
model Customer {
  loyaltyTier       String   @default("standard")  // Now required
}
```

```bash
# Create migration
npx prisma migrate dev --name customer_loyalty_tier_required --create-only
```

```sql
-- migration.sql
-- Step 1: Backfill existing rows
UPDATE customers
SET "loyaltyTier" = 'standard'
WHERE "loyaltyTier" IS NULL;

-- Step 2: Make column NOT NULL
ALTER TABLE customers
ALTER COLUMN "loyaltyTier" SET DEFAULT 'standard',
ALTER COLUMN "loyaltyTier" SET NOT NULL;
```

#### Renaming a Column (Preserve Data)

```prisma
model Product {
  // Old: varietal
  grapeType         String?  // Renamed field
}
```

```bash
# Create migration
npx prisma migrate dev --name rename_varietal_to_grape_type --create-only
```

```sql
-- migration.sql
ALTER TABLE products
RENAME COLUMN varietal TO "grapeType";
```

### 5.3 Creating Indexes

```bash
npx prisma migrate dev --name add_product_indexes --create-only
```

```sql
-- migration.sql
-- Improve query performance for common filters
CREATE INDEX idx_products_brand ON products(brand) WHERE status = 'ACTIVE';
CREATE INDEX idx_products_category_status ON products(category, status);

-- Composite index for orders
CREATE INDEX idx_orders_customer_date ON orders("customerId", "orderDate" DESC);

-- Partial index for pending orders
CREATE INDEX idx_orders_pending ON orders("tenantId", status)
WHERE status IN ('PENDING', 'CONFIRMED');
```

### 5.4 Data Migrations

When you need to transform existing data:

```bash
npx prisma migrate dev --name backfill_customer_tiers --create-only
```

```sql
-- migration.sql
-- Calculate tier based on total order value
UPDATE customers
SET tier = CASE
    WHEN (
        SELECT COALESCE(SUM("totalAmount"), 0)
        FROM orders
        WHERE "customerId" = customers.id
    ) > 50000 THEN 'premium'
    WHEN (
        SELECT COALESCE(SUM("totalAmount"), 0)
        FROM orders
        WHERE "customerId" = customers.id
    ) > 10000 THEN 'standard'
    ELSE 'basic'
END
WHERE tier IS NULL;
```

### 5.5 Adding Enums

```prisma
enum CustomerTier {
  BASIC
  STANDARD
  PREMIUM
  ENTERPRISE
}

model Customer {
  tier              CustomerTier @default(STANDARD)
}
```

```bash
npx prisma migrate dev --name add_customer_tier_enum
```

---

## 6. Troubleshooting

### 6.1 Migration Fails: "Table already exists"

**Cause**: Trying to create a table that already exists in Supabase.

**Solution**: Create a baseline migration or use `prisma db pull` to sync schema.

```bash
# Pull existing schema
npx prisma db pull

# Mark as resolved
npx prisma migrate resolve --applied 00000000000000_init
```

### 6.2 RLS Blocks All Queries

**Cause**: Session parameter `app.current_tenant_id` is not set.

**Solution**: Ensure your Prisma wrapper sets the parameter:

```typescript
// lib/prisma.ts
export async function withTenant<T>(
  tenantId: string,
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set tenant context
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', $1, false)`,
      tenantId
    );

    return callback(tx as unknown as PrismaClient);
  });
}

// Usage
const products = await withTenant(tenantId, async (prisma) => {
  return prisma.product.findMany();
});
```

### 6.3 Seed Script Fails on Unique Constraint

**Cause**: Re-running seed script with existing data.

**Solution**: Use `upsert` instead of `create`:

```typescript
await prisma.product.upsert({
  where: {
    tenantId_sku: { tenantId, sku: 'WC-CAB-001' }
  },
  update: {},
  create: {
    tenantId,
    sku: 'WC-CAB-001',
    name: 'Estate Reserve Cabernet',
    // ... other fields
  }
});
```

### 6.4 Migration Conflicts (Multiple Developers)

**Cause**: Two developers create migrations with the same timestamp.

**Solution**: Pull latest migrations before creating new ones:

```bash
# Pull latest changes
git pull origin main

# Rebase your branch
git rebase main

# Resolve migration conflicts manually
# Delete duplicate migrations, keep one

# Apply migrations
npx prisma migrate dev
```

### 6.5 Production Migration Fails Halfway

**Cause**: Database constraint violation or timeout during migration.

**Solution**: Prisma tracks applied migrations in `_prisma_migrations` table:

```sql
-- Check migration status
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

-- If migration failed, mark as rolled back
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE migration_name = 'failed_migration_name';

-- Fix data issues manually
-- Then re-run migration
```

### 6.6 Performance Issues After Migration

**Cause**: Missing indexes or inefficient queries.

**Solution**: Analyze query plans and add indexes:

```sql
-- Enable query timing
SET track_io_timing = on;

-- Analyze a slow query
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE "customerId" = 'customer-id'
ORDER BY "orderDate" DESC;

-- Add missing index
CREATE INDEX idx_orders_customer_date
ON orders("customerId", "orderDate" DESC);
```

---

## Quick Reference Commands

```bash
# Development
npx prisma migrate dev --name <migration-name>    # Create and apply migration
npx prisma migrate dev --create-only               # Create migration without applying
npx prisma migrate reset                           # Reset database (DEV ONLY)
npx prisma db pull                                 # Pull schema from database
npx prisma db push                                 # Push schema changes (no migration)

# Production
npx prisma migrate deploy                          # Apply pending migrations
npx prisma migrate status                          # Check migration status
npx prisma migrate resolve --applied <migration>   # Mark migration as applied
npx prisma migrate resolve --rolled-back <migration> # Mark migration as rolled back

# Seeding
npx ts-node scripts/seed-well-crafted-tenant.ts    # Run seed script
npm run seed                                       # If configured in package.json

# Prisma Client
npx prisma generate                                # Regenerate client after schema changes
npx prisma studio                                  # Open database browser GUI
```

---

## Next Steps

1. **Set up migrations**: Follow Section 1 to create your initial migration
2. **Enable RLS**: Apply Section 2 policies for tenant isolation
3. **Seed data**: Run Section 3 seed script for Well Crafted tenant
4. **Test isolation**: Verify RLS works correctly in Section 2.5
5. **Deploy**: Use Section 4 workflows for production deployment

For questions or issues, refer to:
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Leora Platform Blueprint: `/Users/greghogue/Leora/leora-platform-blueprint.md`
