# MIGRATION SAFETY REVIEW
## Leora Platform Database Migration - Safety Analysis

**Date:** 2025-10-15
**Reviewer:** Migration Safety Reviewer (Automated)
**Migration File:** `prisma/supabase-init.sql`
**Production Data at Risk:** 27,000+ rows

---

## EXECUTIVE SUMMARY

**Total Changes:** 68 SQL statements
- 25 CREATE TYPE statements (ENUMs)
- 43 CREATE TABLE statements
- 1 ALTER TABLE statement
- 60+ CREATE INDEX statements
- 5 COMMENT statements

**Risk Level:** 🔴 **HIGH**

**Approval Status:** 🚫 **REJECTED - NEEDS REVISION**

**Critical Issues Found:** 3

---

## CRITICAL SAFETY ISSUES

### 🚨 ISSUE #1: Missing IF NOT EXISTS on ALL Statements

**Severity:** CRITICAL
**Risk:** Database schema will fail if ANY table/type already exists
**Impact:** Migration will abort, leaving database in inconsistent state

**Details:**
- All 25 CREATE TYPE statements lack `IF NOT EXISTS`
- All 43 CREATE TABLE statements lack `IF NOT EXISTS`
- All 60+ CREATE INDEX statements lack `IF NOT EXISTS`
- ALTER TABLE statement on line 500-501 lacks existence check

**Example Violations:**
```sql
-- LINE 15: Missing IF NOT EXISTS
CREATE TYPE "TenantStatus" AS ENUM (...)

-- LINE 190: Missing IF NOT EXISTS
CREATE TABLE "tenants" (...)

-- LINE 932: Missing IF NOT EXISTS
CREATE INDEX "users_tenantId_status_idx" ON "users"(...)

-- LINE 500-501: No existence check
ALTER TABLE "portal_users"
  ADD FOREIGN KEY ("customerId") REFERENCES "customers"("id");
```

---

### 🚨 ISSUE #2: Destructive ALTER TABLE Without Safeguards

**Severity:** CRITICAL
**Risk:** Will fail if constraint already exists
**Impact:** Migration aborts, partial schema state

**Details:**
Lines 500-501 add a foreign key constraint without checking if it exists:
```sql
ALTER TABLE "portal_users"
  ADD FOREIGN KEY ("customerId") REFERENCES "customers"("id");
```

**Problems:**
- No `IF NOT EXISTS` clause (not supported in standard ALTER TABLE ADD CONSTRAINT)
- No constraint name specified (uses auto-generated name)
- If constraint exists, migration fails
- Should use `ADD CONSTRAINT constraint_name IF NOT EXISTS` pattern

---

### 🚨 ISSUE #3: No Data Migration Strategy

**Severity:** HIGH
**Risk:** Existing data may violate new constraints
**Impact:** Migration may fail with constraint violations

**Details:**
- ENUMs are created with specific values (e.g., TenantStatus: ACTIVE, SUSPENDED, ARCHIVED)
- If existing data has different status values, migration will fail
- No data transformation logic to map existing values to new ENUMs
- Foreign key constraints may fail if referenced data doesn't exist

**Example Risk:**
```sql
-- If existing tenants.status has value "active" (lowercase)
-- This will fail because ENUM expects "ACTIVE" (uppercase)
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
```

---

## DETAILED SAFETY ANALYSIS

### 1. CREATE TYPE Statements (Lines 15-183)

| Line | Type | Safety Issue | Risk |
|------|------|--------------|------|
| 15-19 | TenantStatus | Missing IF NOT EXISTS | HIGH |
| 22-26 | UserStatus | Missing IF NOT EXISTS | HIGH |
| 29-33 | PortalUserStatus | Missing IF NOT EXISTS | HIGH |
| 36-44 | AlcoholType | Missing IF NOT EXISTS | HIGH |
| 47-51 | ProductStatus | Missing IF NOT EXISTS | HIGH |
| 54-57 | SkuStatus | Missing IF NOT EXISTS | HIGH |
| 60-64 | CustomerStatus | Missing IF NOT EXISTS | HIGH |
| 67-76 | OrderStatus | Missing IF NOT EXISTS | HIGH |
| 79-87 | InvoiceStatus | Missing IF NOT EXISTS | HIGH |
| 90-96 | PaymentStatus | Missing IF NOT EXISTS | HIGH |
| 99-104 | CartStatus | Missing IF NOT EXISTS | HIGH |
| 107-112 | ActivityStatus | Missing IF NOT EXISTS | HIGH |
| 115-120 | ActivityPriority | Missing IF NOT EXISTS | HIGH |
| 123-128 | CallPlanStatus | Missing IF NOT EXISTS | HIGH |
| 131-136 | TaskStatus | Missing IF NOT EXISTS | HIGH |
| 139-144 | TaskPriority | Missing IF NOT EXISTS | HIGH |
| 147-152 | FilingStatus | Missing IF NOT EXISTS | HIGH |
| 155-160 | WebhookStatus | Missing IF NOT EXISTS | HIGH |
| 163-168 | DeliveryStatus | Missing IF NOT EXISTS | HIGH |
| 171-175 | TokenStatus | Missing IF NOT EXISTS | HIGH |
| 178-183 | NotificationPriority | Missing IF NOT EXISTS | HIGH |

**Verdict:** ❌ UNSAFE - All CREATE TYPE statements will fail if types already exist

---

### 2. CREATE TABLE Statements (Lines 190-925)

All 43 tables lack `IF NOT EXISTS` clause. Sample analysis:

| Table | Lines | Safety Concerns |
|-------|-------|-----------------|
| tenants | 190-203 | ❌ No IF NOT EXISTS |
| tenant_settings | 206-229 | ❌ No IF NOT EXISTS, FK to tenants |
| users | 232-253 | ❌ No IF NOT EXISTS, uses ENUM without check |
| roles | 256-264 | ❌ No IF NOT EXISTS |
| user_roles | 267-276 | ❌ No IF NOT EXISTS, FK cascade delete |
| permissions | 279-288 | ❌ No IF NOT EXISTS |
| role_permissions | 291-300 | ❌ No IF NOT EXISTS, FK cascade delete |
| portal_users | 307-329 | ❌ No IF NOT EXISTS, JSONB field |
| portal_user_roles | 332-340 | ❌ No IF NOT EXISTS |
| portal_sessions | 343-355 | ❌ No IF NOT EXISTS, UNIQUE constraints |
| suppliers | 362-378 | ❌ No IF NOT EXISTS |
| products | 381-405 | ❌ No IF NOT EXISTS, complex relations |
| skus | 408-430 | ❌ No IF NOT EXISTS |
| inventory | 433-447 | ❌ No IF NOT EXISTS |
| price_list_entries | 450-466 | ❌ No IF NOT EXISTS |
| customers | 473-497 | ❌ No IF NOT EXISTS |
| orders | 508-538 | ❌ No IF NOT EXISTS, many FKs |
| order_lines | 541-559 | ❌ No IF NOT EXISTS |
| invoices | 562-587 | ❌ No IF NOT EXISTS |
| payments | 590-609 | ❌ No IF NOT EXISTS |
| carts | 616-635 | ❌ No IF NOT EXISTS |
| cart_items | 638-650 | ❌ No IF NOT EXISTS |
| lists | 653-665 | ❌ No IF NOT EXISTS |
| list_items | 668-677 | ❌ No IF NOT EXISTS |
| activities | 684-707 | ❌ No IF NOT EXISTS |
| call_plans | 710-727 | ❌ No IF NOT EXISTS |
| tasks | 730-747 | ❌ No IF NOT EXISTS |
| account_health_snapshots | 754-777 | ❌ No IF NOT EXISTS |
| sales_metrics | 780-794 | ❌ No IF NOT EXISTS |
| compliance_filings | 801-816 | ❌ No IF NOT EXISTS |
| state_tax_rates | 819-832 | ❌ No IF NOT EXISTS |
| webhook_subscriptions | 839-856 | ❌ No IF NOT EXISTS |
| webhook_events | 859-868 | ❌ No IF NOT EXISTS |
| webhook_deliveries | 871-886 | ❌ No IF NOT EXISTS |
| integration_tokens | 889-903 | ❌ No IF NOT EXISTS |
| notifications | 910-925 | ❌ No IF NOT EXISTS |

**Verdict:** ❌ UNSAFE - All CREATE TABLE statements will fail if tables already exist

---

### 3. ALTER TABLE Statement (Lines 500-501)

```sql
ALTER TABLE "portal_users"
  ADD FOREIGN KEY ("customerId") REFERENCES "customers"("id");
```

**Issues:**
1. No constraint name specified (auto-generated, unpredictable)
2. No existence check (standard SQL doesn't support IF NOT EXISTS here)
3. Will fail if constraint already exists
4. Cannot be made idempotent without DO block

**Correct Pattern:**
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portal_users_customerId_fkey'
  ) THEN
    ALTER TABLE "portal_users"
      ADD CONSTRAINT portal_users_customerId_fkey
      FOREIGN KEY ("customerId") REFERENCES "customers"("id");
  END IF;
END $$;
```

**Verdict:** ❌ UNSAFE - Not idempotent, will fail on re-run

---

### 4. CREATE INDEX Statements (Lines 932-1047)

All 60+ indexes lack `IF NOT EXISTS` clause. Sample:

```sql
-- LINE 932
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- LINE 935
CREATE INDEX "portal_users_tenantId_customerId_idx" ON "portal_users"("tenantId", "customerId");

-- LINE 949
CREATE INDEX "products_tenantId_status_idx" ON "products"("tenantId", "status");
```

**Issue:** All will fail if indexes already exist

**Correct Pattern:**
```sql
CREATE INDEX IF NOT EXISTS "users_tenantId_status_idx"
  ON "users"("tenantId", "status");
```

**Verdict:** ❌ UNSAFE - Not idempotent

---

### 5. COMMENT Statements (Lines 1053-1064)

```sql
COMMENT ON TABLE "tenants" IS 'Multi-tenant root table...';
COMMENT ON TABLE "tenant_settings" IS 'Tenant-specific configuration...';
-- etc.
```

**Analysis:** ✅ SAFE - Comments are idempotent and don't affect data

---

## FORBIDDEN COMMANDS CHECK

✅ No DROP TABLE statements found
✅ No DROP DATABASE statements found
✅ No TRUNCATE statements found
✅ No DELETE FROM statements found
✅ No CREATE OR REPLACE TABLE statements found
✅ No ALTER TABLE ... DROP COLUMN statements found

---

## DATA INTEGRITY ANALYSIS

### Existing Data Validation

**Questions that MUST be answered before migration:**

1. **ENUMs:** Do existing status columns use the exact case and values defined in ENUMs?
   - Example: Is it "ACTIVE" or "active" in current database?
   - Risk: ENUM mismatch will cause migration failure

2. **Foreign Keys:** Do all referenced records exist?
   - portal_users.customerId → customers.id
   - All tenant_id references
   - Risk: FK constraint violations will abort migration

3. **NOT NULL Constraints:** Do existing rows have values for all non-nullable columns?
   - Example: tenants.status, users.email, etc.
   - Risk: NULL values will violate constraints

4. **UNIQUE Constraints:** Are there duplicate values in unique columns?
   - tenants.slug
   - users(tenantId, email)
   - products(tenantId, sku)
   - Risk: Duplicate values will violate unique constraints

---

## VERIFICATION PLAN

### Pre-Migration Queries

Run these queries BEFORE applying migration:

```sql
-- 1. Check if any tables already exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'users', 'products', 'orders');

-- 2. Check if any types already exist
SELECT typname
FROM pg_type
WHERE typname IN ('TenantStatus', 'UserStatus', 'ProductStatus');

-- 3. Count existing rows (if tables exist)
SELECT
  (SELECT COUNT(*) FROM tenants) as tenant_count,
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM products) as product_count,
  (SELECT COUNT(*) FROM orders) as order_count;

-- 4. Check for ENUM value mismatches (if tenants table exists)
SELECT DISTINCT status
FROM tenants
WHERE status NOT IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- 5. Check for NULL values in non-nullable columns
SELECT COUNT(*) as null_emails
FROM users
WHERE email IS NULL;

-- 6. Check for FK reference issues
SELECT COUNT(*) as orphaned_portal_users
FROM portal_users pu
LEFT JOIN customers c ON pu."customerId" = c.id
WHERE pu."customerId" IS NOT NULL AND c.id IS NULL;
```

### Post-Migration Queries

Run these queries AFTER migration:

```sql
-- 1. Verify all tables created
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
-- Expected: 43 tables

-- 2. Verify all indexes created
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public';
-- Expected: 60+ indexes

-- 3. Verify row counts unchanged
SELECT
  (SELECT COUNT(*) FROM tenants) as tenant_count,
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM products) as product_count,
  (SELECT COUNT(*) FROM orders) as order_count;
-- Must match pre-migration counts

-- 4. Verify foreign keys created
SELECT COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

-- 5. Check for constraint violations
SELECT conname, conrelid::regclass as table_name
FROM pg_constraint
WHERE convalidated = false;
-- Should return 0 rows
```

---

## ROLLBACK PLAN

### Scenario 1: Migration Fails Mid-Execution

**Cause:** Type or table already exists
**Action:**
1. Migration will auto-rollback (transaction failure)
2. Fix migration SQL to add IF NOT EXISTS
3. Re-run migration

**Recovery:**
```sql
-- Check transaction state
SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';

-- If needed, rollback manually
ROLLBACK;
```

### Scenario 2: Migration Succeeds But Data is Corrupted

**Cause:** Unlikely (no data modification statements)
**Action:**
1. This migration only creates schema, doesn't modify data
2. Data corruption is NOT a risk from this migration
3. If tables were created incorrectly, drop and recreate

**Recovery:**
```sql
-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS integration_tokens CASCADE;
-- ... (continue for all tables)

-- Or nuclear option (destroys all data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### Scenario 3: Constraint Violations After Migration

**Cause:** Existing data doesn't match new constraints
**Action:**
1. Identify violating rows
2. Fix data manually
3. Re-enable constraints

**Recovery:**
```sql
-- Find constraint violations
SELECT * FROM portal_users pu
LEFT JOIN customers c ON pu."customerId" = c.id
WHERE pu."customerId" IS NOT NULL AND c.id IS NULL;

-- Fix by removing invalid FK or creating missing customers
UPDATE portal_users
SET "customerId" = NULL
WHERE "customerId" NOT IN (SELECT id FROM customers);
```

---

## BACKUP RECOMMENDATIONS

### Critical: Backup BEFORE Migration

```bash
# 1. Full database dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Schema-only dump (faster restore for testing)
pg_dump --schema-only $DATABASE_URL > schema_backup.sql

# 3. Data-only dump (for data verification)
pg_dump --data-only $DATABASE_URL > data_backup.sql

# 4. Specific tables (if only certain tables at risk)
pg_dump --table=tenants --table=users --table=products $DATABASE_URL > critical_tables.sql
```

### Restore Procedure

```bash
# 1. Drop existing database (if safe)
dropdb leora_production

# 2. Create fresh database
createdb leora_production

# 3. Restore from backup
psql $DATABASE_URL < backup_20251015_120000.sql

# 4. Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tenants;"
```

---

## REQUIRED CHANGES FOR APPROVAL

### 1. Add IF NOT EXISTS to All CREATE TYPE

**Current:**
```sql
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
```

**Required:**
```sql
DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### 2. Add IF NOT EXISTS to All CREATE TABLE

**Current:**
```sql
CREATE TABLE "tenants" (
  "id" TEXT PRIMARY KEY,
  ...
);
```

**Required:**
```sql
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT PRIMARY KEY,
  ...
);
```

### 3. Make ALTER TABLE Idempotent

**Current:**
```sql
ALTER TABLE "portal_users"
  ADD FOREIGN KEY ("customerId") REFERENCES "customers"("id");
```

**Required:**
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'portal_users_customerId_fkey'
    AND table_name = 'portal_users'
  ) THEN
    ALTER TABLE "portal_users"
      ADD CONSTRAINT portal_users_customerId_fkey
      FOREIGN KEY ("customerId") REFERENCES "customers"("id");
  END IF;
END $$;
```

### 4. Add IF NOT EXISTS to All CREATE INDEX

**Current:**
```sql
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");
```

**Required:**
```sql
CREATE INDEX IF NOT EXISTS "users_tenantId_status_idx"
  ON "users"("tenantId", "status");
```

### 5. Add Data Validation Queries

Before migration runs, add:
```sql
-- Validate ENUM values
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM tenants
  WHERE status NOT IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % tenants with invalid status', invalid_count;
  END IF;
END $$;
```

---

## FINAL RECOMMENDATION

### 🚫 MIGRATION REJECTED

**Reason:** Migration is NOT safe to execute in current form

**Critical Issues:**
1. ❌ Not idempotent - will fail if run twice
2. ❌ No IF NOT EXISTS on 68+ statements
3. ❌ ALTER TABLE not safeguarded
4. ❌ No data validation before constraints applied
5. ❌ No verification of existing data compatibility

**Required Actions:**
1. Add IF NOT EXISTS to all CREATE statements
2. Wrap CREATE TYPE in DO blocks with exception handling
3. Make ALTER TABLE idempotent with constraint name check
4. Add data validation queries before constraint creation
5. Test migration on staging database with copy of production data
6. Verify row counts match before and after migration

**Estimated Revision Time:** 2-4 hours

**Re-review Required:** Yes, after all changes implemented

---

## APPROVAL CRITERIA (Not Met)

- [ ] No forbidden commands (✅ MET)
- [ ] All operations have IF NOT EXISTS (❌ NOT MET)
- [ ] No risk of data loss (✅ MET - schema only)
- [ ] All constraints validated against existing data (❌ NOT MET - need validation)
- [ ] Rollback plan is clear (✅ MET)
- [ ] Migration is idempotent (❌ NOT MET)
- [ ] Tested on staging environment (❌ UNKNOWN)

---

## NEXT STEPS

1. **DO NOT RUN** this migration on production database
2. Create revised migration with all IF NOT EXISTS clauses
3. Add data validation queries
4. Test on staging database with production data copy
5. Verify all 27,000+ rows preserved after test migration
6. Submit revised migration for re-review
7. Only after approval, schedule production migration during maintenance window

---

**Review Status:** REJECTED
**Signed:** Migration Safety Reviewer (Automated)
**Date:** 2025-10-15
**Revision Required:** Yes
