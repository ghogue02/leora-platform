# Migration Safety Checklist

## Overview

This migration adds missing schema elements to the existing Leora Platform database while **preserving all 27,000+ rows of production data**.

**Migration File**: `prisma/safe-migration-from-existing.sql`

**Safety Level**: ✅ **PRODUCTION-SAFE** - No data will be deleted or modified

---

## What This Migration Does

### 1. Creates Missing ENUM Types (if not exist)
- All 20 Prisma enum types (TenantStatus, UserStatus, OrderStatus, etc.)
- Uses exception handling to skip if already exists
- **Impact**: None on existing data

### 2. Creates Missing Tables (if not exist)
The following 36 tables will be created **only if they don't already exist**:

**Core Tenancy** (2 tables)
- `tenants`
- `tenant_settings`

**Identity & Access** (7 tables)
- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `portal_users`
- `portal_user_roles`
- `portal_sessions`

**Commerce: Products** (5 tables)
- `products`
- `skus`
- `inventory`
- `price_list_entries`
- `suppliers`

**Commerce: Customers** (2 tables)
- `customers`
- `suppliers` (if not created above)

**Commerce: Orders** (6 tables)
- `orders`
- `order_lines`
- `invoices`
- `payments`
- `carts`
- `cart_items`

**Commerce: Lists** (2 tables)
- `lists`
- `list_items`

**Intelligence** (5 tables)
- `activities`
- `call_plans`
- `tasks`
- `account_health_snapshots`
- `sales_metrics`

**Compliance** (2 tables)
- `compliance_filings`
- `state_tax_rates`

**Integrations** (4 tables)
- `webhook_subscriptions`
- `webhook_events`
- `webhook_deliveries`
- `integration_tokens`

**Notifications** (1 table)
- `notifications`

**Total**: 36 tables

### 3. Creates Performance Indexes (if not exist)
- 40+ indexes for optimized query performance
- All use `CREATE INDEX IF NOT EXISTS`
- **Impact**: Improves query speed, no data loss

---

## What This Migration DOES NOT Do

### ❌ NO Destructive Operations
This migration explicitly avoids:
- ❌ **NO** `DROP TABLE`
- ❌ **NO** `DROP COLUMN`
- ❌ **NO** `TRUNCATE`
- ❌ **NO** `DELETE`
- ❌ **NO** `UPDATE` (existing data)
- ❌ **NO** `ALTER TABLE ... DROP ...`
- ❌ **NO** `CREATE OR REPLACE`

### ✅ Only Safe Operations
- ✅ `CREATE TABLE IF NOT EXISTS`
- ✅ `CREATE INDEX IF NOT EXISTS`
- ✅ `CREATE TYPE` (with exception handling)
- ✅ Foreign key constraints (for new tables only)

---

## Pre-Migration Checklist

Before running the migration, verify:

### 1. Database Backup
- [ ] **CRITICAL**: Create a database backup in Supabase
  - Go to: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/settings/database
  - Click "Create Backup" or use pg_dump

### 2. Data Verification
- [ ] Record current row counts:
  ```sql
  SELECT 'tenants' as table_name, COUNT(*) FROM tenants
  UNION ALL SELECT 'users', COUNT(*) FROM users
  UNION ALL SELECT 'customers', COUNT(*) FROM customers
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'orders', COUNT(*) FROM orders;
  ```

  **Expected Counts** (from documentation):
  - Tenants: 1
  - Users: 5
  - Customers: 21,215
  - Products: 1,937
  - Orders: 4,268

### 3. Access Verification
- [ ] Confirm you can access Supabase SQL Editor
- [ ] URL: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

---

## Migration Execution Steps

### Step 1: Open Supabase SQL Editor
Navigate to: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

### Step 2: Review the Migration SQL
1. Open `prisma/safe-migration-from-existing.sql`
2. Review each section carefully
3. Confirm no DROP/DELETE/TRUNCATE commands

### Step 3: Run the Migration
1. Copy the entire contents of `safe-migration-from-existing.sql`
2. Paste into Supabase SQL Editor
3. Click **"Run"** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Step 4: Review Execution Results
- Check for any errors in the SQL Editor output
- Most "duplicate_object" errors are SAFE (means type already exists)
- "table already exists" errors are SAFE (means table already exists)

### Step 5: Run Verification Queries
The migration file includes verification queries at the end. Run them to check:

1. **Table Existence Check**:
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
   Should show all 36 tables

2. **Row Count Verification**:
   ```sql
   SELECT 'customers' as table_name, COUNT(*) FROM customers
   UNION ALL SELECT 'products', COUNT(*) FROM products
   UNION ALL SELECT 'orders', COUNT(*) FROM orders;
   ```
   Should match pre-migration counts EXACTLY

3. **Data Loss Check** (should be 0):
   ```sql
   SELECT tablename, n_tup_del as deletes
   FROM pg_stat_user_tables
   WHERE schemaname = 'public' AND n_tup_del > 0;
   ```
   Should return **zero rows**

4. **Index Verification**:
   ```sql
   SELECT COUNT(*) as index_count
   FROM pg_indexes
   WHERE schemaname = 'public';
   ```
   Should show 40+ indexes

---

## Post-Migration Verification

### Critical Checks

#### 1. Data Integrity
- [ ] All row counts match pre-migration values
- [ ] No rows deleted (n_tup_del = 0)
- [ ] Sample queries return expected data:
  ```sql
  -- Test customer data
  SELECT id, company_name FROM customers LIMIT 5;

  -- Test product data
  SELECT id, name, sku FROM products LIMIT 5;

  -- Test order data
  SELECT id, order_number, total_amount FROM orders LIMIT 5;
  ```

#### 2. Schema Completeness
- [ ] All 36 tables exist
- [ ] All indexes created
- [ ] All enums created
- [ ] Foreign keys defined

#### 3. Application Testing
- [ ] Test site login: https://leora-platform.vercel.app
- [ ] Dashboard loads without errors
- [ ] Products page shows data
- [ ] Orders page shows data
- [ ] No database connection errors in logs

---

## Expected Outcomes

### Success Indicators
✅ All tables created or already exist
✅ All indexes created
✅ All row counts unchanged
✅ No deletion operations occurred
✅ Application functions normally
✅ Query performance improved (from new indexes)

### Acceptable Warnings
⚠️ "type already exists" - SAFE, type was already created
⚠️ "table already exists" - SAFE, table was already created
⚠️ "index already exists" - SAFE, index was already created

### Red Flags (Contact DBA immediately)
🚨 "X rows deleted" where X > 0
🚨 Row counts decreased
🚨 Tables missing after migration
🚨 Foreign key constraint violations
🚨 Application cannot connect to database

---

## Rollback Plan

### If Something Goes Wrong

#### Option 1: Restore from Backup
1. Go to Supabase Dashboard → Database → Backups
2. Select pre-migration backup
3. Click "Restore"
4. Wait for restoration to complete (usually 5-15 minutes)

#### Option 2: Minimal Rollback (if only indexes added)
If only indexes were added and causing issues:
```sql
-- List all indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- Drop specific index if needed
DROP INDEX IF EXISTS idx_name_here;
```

#### Option 3: Manual Revert
If only a few tables were created and need removal:
```sql
-- Example: Remove newly created table (ONLY if it has no data)
DROP TABLE IF EXISTS table_name CASCADE;
```
**WARNING**: Only use this for empty tables created by this migration

---

## Common Issues & Solutions

### Issue: "type already exists"
**Status**: ✅ Safe - Type was already created
**Action**: Continue, no action needed

### Issue: "table already exists"
**Status**: ✅ Safe - Table was already created
**Action**: Continue, no action needed

### Issue: "column does not exist"
**Status**: ⚠️ Needs investigation
**Action**: Check which columns are missing, may need ALTER TABLE ADD COLUMN

### Issue: Foreign key constraint violation
**Status**: ⚠️ Data integrity issue
**Action**: Review foreign key relationships, may need data cleanup first

### Issue: Permission denied
**Status**: 🚨 Access issue
**Action**: Verify you're using correct Supabase credentials with admin privileges

---

## Performance Impact

### Expected Changes
- **Disk Usage**: Minimal increase (tables created with no data)
- **Index Size**: ~10-50 MB for 40+ indexes
- **Query Performance**: IMPROVED (new indexes optimize lookups)
- **Write Performance**: Slightly slower (index maintenance)
- **Connection Count**: No change

### Monitoring
After migration, monitor:
- Query response times (should improve)
- Index usage statistics
- Table scan counts (should decrease)

---

## Data Preservation Guarantee

This migration is designed with **zero data loss** as the highest priority:

1. **No Destructive Commands**: The SQL file contains ONLY creation commands
2. **Conditional Creation**: All objects use IF NOT EXISTS checks
3. **No Modifications**: Existing tables, columns, and data are never altered
4. **Backup First**: Always create backup before running
5. **Verification Built-in**: Multiple verification queries included

### Mathematical Guarantee
```
Rows Before Migration = Rows After Migration
27,000+ rows = 27,000+ rows
```

Any deviation from this equation indicates a problem and should trigger immediate rollback.

---

## Sign-Off

### Pre-Migration Sign-Off
- [ ] Database backup created
- [ ] Current row counts recorded
- [ ] Migration SQL reviewed
- [ ] Access to Supabase confirmed
- [ ] Rollback plan understood

**Date**: _______________
**By**: _______________

### Post-Migration Sign-Off
- [ ] Migration completed successfully
- [ ] All verification queries passed
- [ ] Row counts match pre-migration
- [ ] Application tested and functional
- [ ] No errors in logs

**Date**: _______________
**By**: _______________

---

## Support

If you encounter issues:

1. **Stop immediately** - Don't run additional commands
2. **Check verification queries** - Determine what happened
3. **Review error messages** - Look for specific issues
4. **Restore from backup** if data loss detected
5. **Document the issue** for future reference

---

## Summary

This migration is **production-safe** and designed to:
- ✅ Add missing schema elements
- ✅ Preserve all existing data (27,000+ rows)
- ✅ Improve query performance
- ✅ Enable full Leora Platform functionality

**Risk Level**: ⬇️ **MINIMAL** - Only additive operations, no destructive commands

**Recommended Action**: ✅ **PROCEED** with backup in place
