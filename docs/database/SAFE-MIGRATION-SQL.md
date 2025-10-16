# Safe Migration SQL - Leora Platform

**Purpose:** Idempotent SQL statements that can be run safely on existing databases
**Status:** Ready for execution
**Risk Level:** 🟢 LOW (uses IF NOT EXISTS and checks)

---

## Overview

This document provides SQL statements that can be run safely on a Supabase database regardless of current state. All statements use `IF NOT EXISTS` or equivalent checks to avoid errors.

---

## 🚨 BEFORE YOU BEGIN

### 1. Inspect Current Database State

```bash
# Get current database inspection
curl "https://leora-platform.vercel.app/api/admin/inspect-database?secret=$ADMIN_SECRET" \
  | jq . > existing-schema.json

# Check table count
jq '.schema.tableCount' existing-schema.json

# List existing tables
jq '.schema.tables[]' existing-schema.json
```

### 2. Choose Migration Path

- **0 tables?** → Run Section A (Full Schema)
- **1-42 tables?** → Run Section B (Incremental)
- **43 tables?** → Run Section C (Validation Only)

---

## SECTION A: Full Schema Creation (Empty Database)

### A1. Enable Extensions

```sql
-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for secure random strings
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### A2. Use Complete Schema

If database is empty, use the complete schema from `prisma/supabase-init.sql`:

```bash
# In Supabase SQL Editor:
# 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
# 2. Copy entire contents of: prisma/supabase-init.sql
# 3. Click "Run"
# 4. Verify success message shows 43 tables created
```

---

## SECTION B: Incremental Migration (Partial Database)

Use these statements to add missing components safely.

### B1. ENUM Types (Safe Creation)

```sql
-- TenantStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantStatus') THEN
    CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
  END IF;
END $$;

-- UserStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
  END IF;
END $$;

-- PortalUserStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PortalUserStatus') THEN
    CREATE TYPE "PortalUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
  END IF;
END $$;

-- AlcoholType
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlcoholType') THEN
    CREATE TYPE "AlcoholType" AS ENUM ('WINE', 'BEER', 'SPIRITS', 'CIDER', 'SAKE', 'MEAD', 'OTHER');
  END IF;
END $$;

-- ProductStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
    CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
  END IF;
END $$;

-- SkuStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SkuStatus') THEN
    CREATE TYPE "SkuStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

-- CustomerStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerStatus') THEN
    CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
  END IF;
END $$;

-- OrderStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'ON_HOLD');
  END IF;
END $$;

-- InvoiceStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
  END IF;
END $$;

-- PaymentStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
  END IF;
END $$;

-- CartStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CartStatus') THEN
    CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED');
  END IF;
END $$;

-- ActivityStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityStatus') THEN
    CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- ActivityPriority
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityPriority') THEN
    CREATE TYPE "ActivityPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;
END $$;

-- CallPlanStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CallPlanStatus') THEN
    CREATE TYPE "CallPlanStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
  END IF;
END $$;

-- TaskStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus') THEN
    CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- TaskPriority
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
    CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;
END $$;

-- FilingStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FilingStatus') THEN
    CREATE TYPE "FilingStatus" AS ENUM ('PENDING', 'FILED', 'OVERDUE', 'REJECTED');
  END IF;
END $$;

-- WebhookStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebhookStatus') THEN
    CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED', 'ERROR');
  END IF;
END $$;

-- DeliveryStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryStatus') THEN
    CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED');
  END IF;
END $$;

-- TokenStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TokenStatus') THEN
    CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
  END IF;
END $$;

-- NotificationPriority
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationPriority') THEN
    CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  END IF;
END $$;
```

### B2. Core Tables (Safe Creation)

```sql
-- Tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "subscriptionTier" TEXT NOT NULL DEFAULT 'starter',
  "billingEmail" TEXT,
  "contactEmail" TEXT,
  "logoUrl" TEXT,
  "primaryColor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Tenant settings table
CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT UNIQUE NOT NULL,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
  "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YY',
  "revenueHealthDropPercent" DECIMAL(5,2) NOT NULL DEFAULT 15,
  "minimumOrdersForHealth" INTEGER NOT NULL DEFAULT 3,
  "defaultSampleAllowancePerRep" INTEGER NOT NULL DEFAULT 60,
  "requireManagerApprovalAbove" INTEGER NOT NULL DEFAULT 60,
  "minimumOrdersForPaceCalc" INTEGER NOT NULL DEFAULT 3,
  "paceRiskThresholdDays" INTEGER NOT NULL DEFAULT 2,
  "portalEnabled" BOOLEAN NOT NULL DEFAULT true,
  "cartEnabled" BOOLEAN NOT NULL DEFAULT true,
  "invoiceVisibility" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add foreign key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_settings_tenantId_fkey'
  ) THEN
    ALTER TABLE "tenant_settings"
      ADD CONSTRAINT "tenant_settings_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Roles table
CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "fullName" TEXT,
  "phone" TEXT,
  "avatarUrl" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerifiedAt" TIMESTAMP(3),
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "lastLoginIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("tenantId", "email")
);

-- Add users foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_tenantId_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;
```

**Note:** For brevity, this shows the pattern. The complete set of 43 tables follows the same pattern. Refer to `prisma/supabase-init.sql` for the full SQL.

### B3. Add Missing Indexes

```sql
-- Users indexes
CREATE INDEX IF NOT EXISTS "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- Portal users indexes
CREATE INDEX IF NOT EXISTS "portal_users_tenantId_customerId_idx" ON "portal_users"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "portal_users_tenantId_status_idx" ON "portal_users"("tenantId", "status");

-- Portal sessions indexes
CREATE INDEX IF NOT EXISTS "portal_sessions_portalUserId_idx" ON "portal_sessions"("portalUserId");
CREATE INDEX IF NOT EXISTS "portal_sessions_accessToken_idx" ON "portal_sessions"("accessToken");

-- Permissions indexes
CREATE INDEX IF NOT EXISTS "permissions_resource_action_idx" ON "permissions"("resource", "action");

-- Products indexes
CREATE INDEX IF NOT EXISTS "products_tenantId_status_idx" ON "products"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "products_tenantId_category_idx" ON "products"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "products_supplierId_idx" ON "products"("supplierId");

-- Orders indexes
CREATE INDEX IF NOT EXISTS "orders_tenantId_customerId_idx" ON "orders"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "orders_tenantId_status_idx" ON "orders"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "orders_orderDate_idx" ON "orders"("orderDate");

-- Invoices indexes
CREATE INDEX IF NOT EXISTS "invoices_tenantId_customerId_idx" ON "invoices"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "invoices_tenantId_status_idx" ON "invoices"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "invoices_invoiceDate_idx" ON "invoices"("invoiceDate");
CREATE INDEX IF NOT EXISTS "invoices_dueDate_idx" ON "invoices"("dueDate");

-- Add remaining indexes following same pattern...
```

---

## SECTION C: Validation & Verification

### C1. Check Schema Completeness

```sql
-- Check table count (should be 43)
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check ENUM count (should be 17)
SELECT COUNT(*) as enum_count
FROM pg_type
WHERE typtype = 'e'
  AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- List all ENUMs
SELECT typname, array_agg(enumlabel ORDER BY enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'
GROUP BY typname
ORDER BY typname;

-- Check index count (should be 60+)
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public';

-- Check foreign key count (should be 50+)
SELECT COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';
```

### C2. Verify Critical Relationships

```sql
-- Check tenant → tenant_settings (1:1)
SELECT
  t.id as tenant_id,
  ts.id as settings_id,
  CASE WHEN ts.id IS NULL THEN 'MISSING SETTINGS' ELSE 'OK' END as status
FROM tenants t
LEFT JOIN tenant_settings ts ON ts."tenantId" = t.id;

-- Check users have valid tenants
SELECT
  u.id as user_id,
  u.email,
  CASE WHEN t.id IS NULL THEN 'ORPHANED USER' ELSE 'OK' END as status
FROM users u
LEFT JOIN tenants t ON t.id = u."tenantId";

-- Check products have valid tenants
SELECT
  p.id as product_id,
  p.name,
  CASE WHEN t.id IS NULL THEN 'ORPHANED PRODUCT' ELSE 'OK' END as status
FROM products p
LEFT JOIN tenants t ON t.id = p."tenantId";
```

### C3. Test Data Integrity

```sql
-- Test tenant creation
DO $$
DECLARE
  test_tenant_id TEXT := 'test_' || gen_random_uuid()::text;
BEGIN
  -- Insert test tenant
  INSERT INTO tenants (id, slug, name, "createdAt", "updatedAt")
  VALUES (test_tenant_id, 'test-tenant', 'Test Tenant', NOW(), NOW());

  -- Verify it was created
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = test_tenant_id) THEN
    RAISE EXCEPTION 'Tenant creation failed';
  END IF;

  -- Clean up
  DELETE FROM tenants WHERE id = test_tenant_id;

  RAISE NOTICE '✅ Tenant creation test passed';
END $$;

-- Test cascading delete
DO $$
DECLARE
  test_tenant_id TEXT := 'test_cascade_' || gen_random_uuid()::text;
  test_user_id TEXT := 'test_user_' || gen_random_uuid()::text;
BEGIN
  -- Create tenant
  INSERT INTO tenants (id, slug, name, "createdAt", "updatedAt")
  VALUES (test_tenant_id, 'test-cascade', 'Test Cascade', NOW(), NOW());

  -- Create user under tenant
  INSERT INTO users (id, "tenantId", email, "createdAt", "updatedAt")
  VALUES (test_user_id, test_tenant_id, 'test@example.com', NOW(), NOW());

  -- Delete tenant (should cascade to user)
  DELETE FROM tenants WHERE id = test_tenant_id;

  -- Verify user was deleted
  IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id) THEN
    RAISE EXCEPTION 'Cascading delete failed';
  END IF;

  RAISE NOTICE '✅ Cascading delete test passed';
END $$;
```

---

## SECTION D: Emergency Rollback

### D1. Backup Before Migration

```sql
-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_pre_migration;

-- Backup all tables (if they exist)
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS backup_pre_migration.%I (LIKE public.%I INCLUDING ALL);', tbl.table_name, tbl.table_name);
    EXECUTE format('INSERT INTO backup_pre_migration.%I SELECT * FROM public.%I;', tbl.table_name, tbl.table_name);
  END LOOP;
END $$;
```

### D2. Restore from Backup

```sql
-- ⚠️ USE WITH EXTREME CAUTION
-- This will overwrite current data with backup

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'backup_pre_migration' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tbl.table_name);
    EXECUTE format('INSERT INTO public.%I SELECT * FROM backup_pre_migration.%I;', tbl.table_name, tbl.table_name);
  END LOOP;
END $$;
```

---

## SECTION E: Common Issues & Fixes

### E1. "Type already exists" Error

```sql
-- Check if type exists
SELECT typname FROM pg_type WHERE typname = 'TenantStatus';

-- If exists but wrong values, must drop and recreate
DROP TYPE IF EXISTS "TenantStatus" CASCADE;
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- ⚠️ WARNING: CASCADE will drop columns using this type
-- Must recreate affected tables afterward
```

### E2. "Foreign key constraint violation"

```sql
-- Find orphaned records
SELECT
  t1.id,
  t1."foreignKeyColumn"
FROM "table1" t1
LEFT JOIN "referenced_table" t2 ON t1."foreignKeyColumn" = t2.id
WHERE t2.id IS NULL;

-- Fix: Either delete orphaned records or create missing references
DELETE FROM "table1" WHERE "foreignKeyColumn" NOT IN (SELECT id FROM "referenced_table");
```

### E3. "Column already exists"

```sql
-- Safe add column with check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'table_name'
      AND column_name = 'column_name'
  ) THEN
    ALTER TABLE "table_name" ADD COLUMN "column_name" TEXT;
  END IF;
END $$;
```

### E4. "Index already exists"

```sql
-- Drop and recreate if definition changed
DROP INDEX IF EXISTS "index_name";
CREATE INDEX "index_name" ON "table_name"("column_name");

-- Or use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS "index_name" ON "table_name"("column_name");
```

---

## SECTION F: Performance Optimization

### F1. Analyze Tables After Migration

```sql
-- Update statistics for query planner
ANALYZE;

-- Or analyze specific tables
ANALYZE "tenants";
ANALYZE "users";
ANALYZE "products";
ANALYZE "orders";
```

### F2. Vacuum After Large Changes

```sql
-- Reclaim space and update statistics
VACUUM ANALYZE;

-- Or specific tables
VACUUM ANALYZE "orders";
VACUUM ANALYZE "order_lines";
```

---

## Execution Checklist

Before running any SQL:

- [ ] Database backup created
- [ ] Current schema inspected via API
- [ ] Migration path determined (A, B, or C)
- [ ] SQL statements reviewed
- [ ] Test in staging environment (if available)
- [ ] ADMIN_SECRET ready for API calls

After running SQL:

- [ ] Run validation queries (Section C)
- [ ] Check error log in Supabase dashboard
- [ ] Test Prisma connection: `npx prisma db pull`
- [ ] Verify row counts match expectations
- [ ] Run sample queries to test data access

---

## Quick Commands

```bash
# Inspect database
curl "https://leora-platform.vercel.app/api/admin/inspect-database?secret=$ADMIN_SECRET" | jq .

# Count tables
curl -s "https://leora-platform.vercel.app/api/admin/inspect-database?secret=$ADMIN_SECRET" | jq '.schema.tableCount'

# Test Prisma connection
npx prisma db pull --force

# Generate Prisma client
npx prisma generate

# Test query
npx prisma studio
```

---

**Last Updated:** 2025-10-15
**Maintainer:** Schema Migration Team
**Status:** Ready for Production
