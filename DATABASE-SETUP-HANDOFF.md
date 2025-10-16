# 🔄 Database Setup Session Handoff

**Date**: October 15, 2025
**Session Focus**: Fix database migration errors and get schema working
**Status**: MCP connection needs fixing → then diagnose actual schema → then create perfect migration

---

## 🎯 Mission: Get Database Schema Migration Working

You have a **partially populated Supabase database** that needs schema completion.

**Existing Data** (MUST PRESERVE):
- 21,215 customers
- 1,937 products
- 4,268 orders
- 5 users
- 1 tenant (Well Crafted)
- 1,055 suppliers

**Problem**: Tables exist but are missing columns (like `tenant_id`, `status`), causing migration errors.

---

## 🐛 Migration Errors Encountered

### Error 1: `column "tenant_id" does not exist`
**Root Cause**: Existing tables (`customers`, `products`, `orders`, etc.) don't have `tenant_id` column yet.

**What We Tried**:
- Created migration SQL that assumes tables either don't exist OR have all columns
- But reality: tables exist with PARTIAL columns (missing `tenant_id`)
- Migration tried to create indexes on non-existent `tenant_id` → ERROR

**Fix Applied**: Added Section 2 to migration SQL to add `tenant_id` column first (lines 156-228 in `prisma/safe-migration-from-existing.sql`)

### Error 2: `column "status" does not exist`
**Root Cause**: At least one table is missing the `status` column.

**Problem**: We don't know which tables have which columns because we can't see the actual database schema.

**Why We Can't See**: MCP connection to Supabase is broken (SSL + corrupted config file).

---

## 🔧 MCP Connection Issue (CRITICAL TO FIX FIRST)

### Problem Identified:
Your `/Users/greghogue/.claude.json` file is **corrupted**:
- **Size**: 142MB (should be ~10KB)
- **Contents**: Filled with React error logs instead of just MCP configuration
- **Impact**: Supabase MCP server won't load properly
- **Error**: `self-signed certificate in certificate chain` (SSL validation failing)

### Solution Created:
**File**: `/Users/greghogue/Leora/.claude-mcp-config.json`

This is a **clean MCP configuration** with:
- All your existing MCP servers (claude-flow, ruv-swarm, flow-nexus, agentic-payments)
- **+ Supabase with SSL bypass** (fixes certificate error)

```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"
      ],
      "env": {
        "POSTGRES_SSL": "true",
        "POSTGRES_SSL_REJECT_UNAUTHORIZED": "false"
      }
    }
  }
}
```

### How to Fix (BEFORE RESTARTING):

**Option A: Quick Fix (Recommended)**
```bash
# 1. Backup corrupted config
cp ~/.claude.json ~/.claude.json.corrupted

# 2. Install clean config
cp /Users/greghogue/Leora/.claude-mcp-config.json ~/.claude.json

# 3. Restart Claude Code (Cmd+Q, then relaunch)
```

**Option B: Manual Fix**
See detailed instructions in `/Users/greghogue/Leora/FIX-MCP-AND-RESTART.md`

---

## 📋 Step-by-Step Plan for Next Session

### **PHASE 1: Fix MCP Connection** (5 minutes)

**Before starting Claude Code:**
```bash
cp /Users/greghogue/Leora/.claude-mcp-config.json ~/.claude.json
```

**After Claude Code starts:**
1. Test MCP connection:
   ```
   Try to use: mcp__supabase__query tool
   ```
2. If it works → Proceed to Phase 2
3. If it fails → Check FIX-MCP-AND-RESTART.md for troubleshooting

### **PHASE 2: Diagnose Actual Database Schema** (10 minutes)

**Run this diagnostic query via MCP:**
```sql
SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('tenants', 'customers', 'products', 'orders', 'users', 'suppliers')
ORDER BY c.table_name, c.ordinal_position;
```

**What This Shows:**
- ✓ Exact column names in each table
- ✓ Data types for each column
- ✓ Which columns exist vs missing
- ✓ Naming convention (snake_case vs camelCase)

**Expected findings:**
- Tables probably use `snake_case` (e.g., `company_name`, not `companyName`)
- Some tables missing `tenant_id` column
- Some tables missing `status` column
- Some tables missing `created_at`, `updated_at` columns

### **PHASE 3: Generate Perfect Migration SQL** (10 minutes)

Based on the REAL schema from Phase 2, create migration SQL that:

**Section 1: Add Missing Columns to Existing Tables**
```sql
-- For each existing table, add missing columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
-- etc. for each table and each missing column
```

**Section 2: Populate tenant_id**
```sql
-- Set tenant_id for all existing rows
UPDATE customers SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
```

**Section 3: Create Missing Tables**
```sql
-- Tables that don't exist at all
CREATE TABLE IF NOT EXISTS portal_users (...);
CREATE TABLE IF NOT EXISTS portal_sessions (...);
-- etc.
```

**Section 4: Create Indexes**
```sql
-- NOW safe because columns exist
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
-- etc.
```

### **PHASE 4: Apply Migration** (5 minutes)

1. Review generated SQL carefully
2. Copy to Supabase SQL Editor
3. Execute
4. Verify row counts unchanged:
   ```sql
   SELECT COUNT(*) FROM customers; -- Should be 21,215
   SELECT COUNT(*) FROM products;  -- Should be 1,937
   SELECT COUNT(*) FROM orders;    -- Should be 4,268
   ```

### **PHASE 5: Update Prisma Schema** (5 minutes)

1. Add `@map` directives for naming differences:
   ```prisma
   model Customer {
     companyName String @map("company_name")
     createdAt DateTime @map("created_at")
   }
   ```
2. Run: `npx prisma generate`
3. Test queries work

---

## 📁 Important Files Reference

### Configuration Files:
- **Clean MCP Config**: `/Users/greghogue/Leora/.claude-mcp-config.json` ⭐ **USE THIS**
- **Corrupted Config**: `~/.claude.json` (142MB) ❌ **REPLACE THIS**
- **MCP Fix Guide**: `/Users/greghogue/Leora/FIX-MCP-AND-RESTART.md`

### Migration Files (Current - May Need Regeneration):
- **Migration SQL**: `/Users/greghogue/Leora/prisma/safe-migration-from-existing.sql`
  - Status: ⚠️ **NEEDS REGENERATION** based on real schema
  - Has Section 2 to add tenant_id (lines 156-228)
  - But still assumes `status` column exists (doesn't)

- **Prisma Schema**: `/Users/greghogue/Leora/prisma/schema.prisma`
  - Status: ✅ Updated with 218 @map directives
  - But may need more @map directives after seeing real schema

### Diagnostic Files:
- **Schema Diagnostic SQL**: `/Users/greghogue/Leora/prisma/SIMPLE-DIAGNOSTIC.sql`
  - Can run in Supabase SQL Editor if MCP fails
  - Returns all columns for key tables

### Documentation:
- **This Handoff**: `/Users/greghogue/Leora/DATABASE-SETUP-HANDOFF.md`
- **Previous Handoff**: `/Users/greghogue/Leora/HANDOFF-SESSION-RESUME.md`
- **Migration Instructions**: `/Users/greghogue/Leora/MIGRATION-FIXED-FINAL.md`
- **Audit Report**: `/Users/greghogue/Leora/prisma/SQL-AUDIT-REPORT.md`

---

## 🗄️ Database Connection Details

**Supabase Project**: `zqezunzlyjkseugujkrl`
**Region**: `us-east-2`

**Connection Strings**:
```
Direct: postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres
Pooled: postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres
```

**Dashboard**: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl
**SQL Editor**: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

---

## ✅ What Was Completed This Session

### 1. Schema Analysis & Documentation
- ✅ Created 15+ documentation files analyzing schema
- ✅ Updated Prisma schema with 218 @map directives
- ✅ Identified multi-tenancy requirements
- ✅ Documented all 36 tables, 20 enums, 40+ indexes

### 2. Migration SQL Attempts
- ✅ Created `safe-migration-from-existing.sql` (v1)
- ✅ Fixed inventory table tenant_id FK constraint
- ✅ Added Section 2 to handle missing tenant_id columns
- ⚠️ Still has issues with missing `status` columns

### 3. MCP Diagnostic Work
- ✅ Identified .claude.json corruption (142MB)
- ✅ Created clean MCP config with SSL bypass
- ✅ Documented MCP fix procedure
- ⚠️ Not yet tested (requires Claude Code restart)

### 4. Comprehensive Documentation
- ✅ Created handoff documents
- ✅ Created diagnostic SQL scripts
- ✅ Created fix instructions
- ✅ Created audit reports

---

## 🚨 Critical Issues to Resolve

### Issue 1: MCP Connection (HIGHEST PRIORITY)
**Status**: Broken due to corrupted .claude.json
**Impact**: Cannot diagnose actual database schema
**Fix**: Replace .claude.json with clean config, restart Claude Code
**Time**: 2 minutes

### Issue 2: Unknown Database Schema
**Status**: Don't know exact columns in existing tables
**Impact**: Migration SQL makes wrong assumptions
**Fix**: Use MCP to query actual schema after Issue 1 resolved
**Time**: 5 minutes

### Issue 3: Migration SQL Needs Regeneration
**Status**: Current migration assumes columns that don't exist
**Impact**: Migration fails with "column does not exist" errors
**Fix**: Regenerate based on actual schema from Issue 2
**Time**: 15 minutes

---

## 🎯 Success Criteria

You'll know everything is working when:

### ✅ Phase 1 Complete:
- MCP connection works
- Can run `mcp__supabase__query` successfully
- See actual database schema

### ✅ Phase 2 Complete:
- Know exact columns in all tables
- Identified all missing columns
- Identified naming conventions (snake_case vs camelCase)

### ✅ Phase 3 Complete:
- Generated migration SQL based on reality
- SQL only adds missing columns/tables
- SQL uses correct column names

### ✅ Phase 4 Complete:
- Migration executes without errors
- All 27,000+ rows preserved
- Row counts match: 21,215 customers, 1,937 products, 4,268 orders

### ✅ Phase 5 Complete:
- Prisma queries work
- Application can read/write database
- Dashboard shows real data

---

## 💡 Key Insights from This Session

### 1. **Partial Schema Problem**
Most migration tools assume either:
- Empty database (create everything), OR
- Complete database (do nothing)

But we have:
- Tables exist BUT missing columns
- Need ALTER TABLE, not CREATE TABLE
- Need to inspect first, then migrate

### 2. **Naming Convention Matters**
Prisma uses `camelCase`, Postgres often uses `snake_case`.
Without seeing the actual schema, we don't know which to use.
That's why MCP inspection is critical.

### 3. **MCP is Essential**
Manual SQL diagnostic queries work but are tedious.
MCP lets us programmatically inspect and adapt.
Worth fixing the connection issue.

### 4. **Data Preservation Priority**
27,000+ rows of production data.
Every migration attempt must be 100% safe.
Better to inspect carefully than guess and fail.

---

## 🚀 Quick Start for Next Session

**Immediate actions when you start:**

```bash
# 1. Fix MCP config (BEFORE starting Claude Code)
cp /Users/greghogue/Leora/.claude-mcp-config.json ~/.claude.json

# 2. Start Claude Code

# 3. Test MCP connection
# Use: mcp__supabase__query tool with a simple query

# 4. If MCP works, run schema diagnostic
# Use: mcp__supabase__query with the diagnostic SQL

# 5. Share diagnostic results with Claude
# Claude will generate perfect migration based on reality
```

**Estimated time to completion**: 30-45 minutes total

---

## 📞 Support & Resources

**Supabase**:
- Dashboard: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl
- SQL Editor: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

**Production**:
- URL: https://leora-platform.vercel.app
- GitHub: https://github.com/ghogue02/leora-platform

**Prisma**:
- Schema: `/Users/greghogue/Leora/prisma/schema.prisma`
- Generate: `npx prisma generate`
- Studio: `npx prisma studio` (if you want to browse DB visually)

---

## 📝 Notes for Future Sessions

### If MCP Still Won't Connect:
Fallback options:
1. Use Supabase SQL Editor manually (paste `SIMPLE-DIAGNOSTIC.sql`)
2. Use `psql` command line directly
3. Use Prisma Studio to inspect schema
4. Check Supabase logs for connection issues

### If Migration Still Fails:
1. Don't panic - data is safe
2. Check which specific column error occurs
3. Add that column manually via ALTER TABLE
4. Regenerate migration SQL
5. Try again

### If You Get Stuck:
1. Check row counts (should always be 21,215 customers, etc.)
2. If counts changed, something went wrong - restore from backup
3. Read the error message carefully - it tells you which column is missing
4. Use MCP to verify that column exists before creating index on it

---

## ✅ Ready to Resume

**You are here**: Need to fix MCP connection, then diagnose real schema, then create perfect migration.

**Next action**:
```bash
cp /Users/greghogue/Leora/.claude-mcp-config.json ~/.claude.json
```

Then restart Claude Code and pick up at Phase 1.

**All context is documented. You're ready to succeed!** 🚀
