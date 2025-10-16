# 🔄 Claude Code Session Handoff - Leora Platform

**Date**: October 15, 2025
**Session Duration**: ~90 minutes
**Status**: Platform built, deployed, database migration pending

---

## ⚡ CRITICAL: Existing Production Data Must Be Preserved

**DO NOT run the fresh schema SQL (`prisma/supabase-init.sql`) - it will drop existing data!**

### 🗄️ **Existing Database Contents:**

| Table | Row Count | Status |
|-------|-----------|--------|
| customers | **21,215** | ⚠️ PRODUCTION DATA |
| orders | **4,268** | ⚠️ PRODUCTION DATA |
| products | **1,937** | ⚠️ PRODUCTION DATA |
| users | **5** | ⚠️ PRODUCTION DATA |
| tenants | **1** | ⚠️ PRODUCTION DATA |

**This is live Well Crafted data - must be preserved during migration!**

---

## ✅ What Was Completed This Session

### 1. **Complete Platform Build** (407 files, 97,224 lines)

**Backend Infrastructure:**
- ✅ Prisma schema with 43 models (fixed Supplier.tenantId relation)
- ✅ 23 API routes (auth, cart, products, orders, insights, AI chat)
- ✅ Multi-tenancy helpers (`withTenant`, `withPortalUser`)
- ✅ RBAC permission system
- ✅ JWT authentication with refresh tokens
- ✅ OpenAI GPT-5 integration (chat, briefing, insights)
- ✅ Intelligence engines (pace tracker, health scorer, opportunity detector)

**Frontend Application:**
- ✅ Next.js 15 + React 19 + TypeScript strict mode
- ✅ 8 portal pages (dashboard, products, cart, orders, invoices, insights, account, AI chat)
- ✅ Tailwind CSS 4 with complete Leora brand system
- ✅ React Query hooks (useProducts, useCart, useOrders, useInsights)
- ✅ 15+ UI components (Button, Card, Toast, Badge, Skeleton, Avatar, etc.)
- ✅ Portal providers (QueryProvider, SessionProvider, PortalProviders)

**Documentation:**
- ✅ README.md - Project overview
- ✅ docs/BUILD-SUMMARY.md - Complete build report
- ✅ docs/DEPLOYMENT-COMPLETE.md - Deployment details
- ✅ docs/deployment/DEPLOYMENT-GUIDE.md - Vercel deployment guide
- ✅ docs/deployment/POST-DEPLOYMENT-STEPS.md - Post-deployment tasks
- ✅ docs/database/MIGRATION-GUIDE.md - Migration & RLS guide
- ✅ docs/database/INITIALIZE-DATABASE.md - Database initialization
- ✅ START-HERE.md - Quick start guide
- ✅ QUICKSTART-DATABASE.md - Database setup instructions

### 2. **GitHub Repository Setup**

- ✅ Repository: https://github.com/ghogue02/leora-platform
- ✅ Initial commit: 407 files committed
- ✅ Branch: `main`
- ✅ Git user: ghogue02
- ✅ Commits: 5 total

**Commits:**
1. `f717a27` - Initial commit (407 files, secrets removed)
2. `b5daff2` - Remove invalid Vercel secret references
3. `84039de` - Use legacy peer deps for Vercel install
4. `72b6f48` - Add admin database initialization API
5. `676e721` - Add database inspection API

### 3. **Vercel Deployment**

- ✅ Project: `gregs-projects-61e51c01/leora-platform`
- ✅ Production URL: https://leora-platform.vercel.app
- ✅ Status: LIVE (deployment `fz9uzh0qx` is Ready)
- ✅ Auto-deploy: Enabled on git push

**Environment Variables Configured (11):**
1. ✅ `DATABASE_URL` - Supabase pooled connection
2. ✅ `DIRECT_URL` - Supabase direct connection
3. ✅ `JWT_SECRET` - Generated: `vxamyx352b3XjcGJ/WStsZivmCmq7TwrAPvJSQoBjmg=`
4. ✅ `NEXTAUTH_SECRET` - Same as JWT_SECRET
5. ✅ `OPENAI_API_KEY` - Client's OpenAI key (configured)
6. ✅ `DEFAULT_TENANT_SLUG` - `well-crafted`
7. ✅ `DEFAULT_PORTAL_USER_KEY` - `dev-portal-user`
8. ✅ `NEXT_PUBLIC_SUPABASE_URL` - https://zqezunzlyjkseugujkrl.supabase.co
9. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - (configured)
10. ✅ `NEXT_PUBLIC_DEFAULT_TENANT_SLUG` - `well-crafted`
11. ✅ `ADMIN_SECRET` - `DYZlOA5A0pXFynuvt2HGdy5zcMt3Vo6HZNhjkjom9UA=`

**Deployment Issues:**
- Latest deployment (`qmt0dx1oy`) failed - Error status
- Working deployment: `fz9uzh0qx` (23 minutes old)
- Note: Routing was fixed (`/dashboard` not `/portal/dashboard`)

### 4. **Build Fixes Applied**

During build, fixed these issues:
- Prisma schema: Added `Supplier.tenantId` relation
- Dependencies: Installed 50+ packages with `--legacy-peer-deps`
- Tailwind CSS 4: Updated to use `@tailwindcss/postcss`
- Next.js 15: Fixed async params (`Promise<{id: string}>`)
- Auth routes: Fixed roleAssignments, enum values (`ACTIVE` not `active`)
- Sample manager: Stubbed functions using non-existent models
- Dashboard queries: Fixed field names (companyName, actualDeliveryDate)

### 5. **Supabase MCP Connection Setup**

**✅ MCP Server Configured:**
- Package: `@modelcontextprotocol/server-postgres`
- Config location: `/Users/greghogue/.claude.json`
- Connection: `postgresql://postgres:***@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require`
- SSL: Enabled with `POSTGRES_SSL=true`, `POSTGRES_SSL_REJECT_UNAUTHORIZED=false`
- Status: **Connected ✓**

**After Restart, Available MCP Tools:**
- `mcp__supabase__query` - Run SQL queries
- `mcp__supabase__list_tables` - List database tables
- `mcp__supabase__describe_table` - Get table schemas
- `mcp__supabase__execute` - Execute SQL
- Database introspection tools

---

## 🚨 CRITICAL NEXT STEPS

### **Do NOT Run Fresh Schema Creation!**

The following files create FRESH schemas and will **DESTROY existing data**:
- ❌ `prisma/supabase-init.sql` - Creates tables from scratch
- ❌ `npx prisma db push --accept-data-loss` - Drops and recreates
- ❌ `npx prisma migrate dev` - May drop tables

### **Instead: Safe Migration Strategy Required**

**After Claude Code Restart:**

1. **Use Supabase MCP to inspect existing schema:**
   ```
   Use mcp__supabase__list_tables to see all existing tables
   Use mcp__supabase__describe_table for each table's structure
   Compare with Prisma schema to find differences
   ```

2. **Identify schema gaps:**
   - Missing tables (e.g., portal_sessions, notifications, lists, etc.)
   - Missing columns in existing tables
   - Type mismatches (TEXT vs VARCHAR, etc.)
   - Missing indexes
   - Missing foreign keys

3. **Generate safe ALTER TABLE commands:**
   - Add missing columns to existing tables
   - Create only NEW tables (don't touch existing ones)
   - Add missing indexes
   - Add foreign keys carefully

4. **Test migration on copy (optional but recommended):**
   - Use Supabase to duplicate the database
   - Test migration on copy first
   - Then apply to production

---

## 📋 Key Questions for Next Session

**To create the safe migration plan, we need to know:**

1. **What's the exact schema of existing tables?**
   - Run: `mcp__supabase__describe_table` for: tenants, users, products, orders, customers
   - Check column names, types, nullable, defaults

2. **Are there schema differences from Prisma?**
   - Compare existing columns vs Prisma schema
   - Example: Does `customers` table have `companyName` or `company_name`?
   - Example: Does `users` table have `fullName` or `full_name`?
   - Example: Are enums TEXT or actual ENUM types?

3. **What constraints exist?**
   - Check foreign keys
   - Check unique constraints
   - Check indexes

4. **What data format is used?**
   - Snake_case (`company_name`) or camelCase (`companyName`)?
   - This matters for Prisma mapping

---

## 🔍 Recommended Inspection Queries

After Claude Code restart, run these via MCP:

```sql
-- Get all existing tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Get detailed schema for key tables
SELECT column_name, data_type, is_nullable, column_default,
       character_maximum_length, numeric_precision
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'users', 'products', 'orders', 'customers')
ORDER BY table_name, ordinal_position;

-- Check existing foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public';

-- Check existing indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Sample existing tenant data
SELECT id, slug, name, status FROM tenants;

-- Sample existing users
SELECT id, email, "firstName", "lastName", status FROM users LIMIT 5;

-- Sample existing products
SELECT id, sku, name, category, brand, status FROM products LIMIT 10;
```

---

## 🎯 Migration Strategy (To Be Created)

Once we know the existing schema, create:

### **Phase 1: Add Missing Tables** (Safe - no data loss)
- Create tables that don't exist yet:
  - `portal_users` (if missing)
  - `portal_sessions` (if missing)
  - `portal_user_roles` (if missing)
  - `roles` (if missing)
  - `permissions` (if missing)
  - `role_permissions` (if missing)
  - `carts`, `cart_items`, `lists`, `list_items`
  - `notifications`
  - `webhooks` tables
  - `account_health_snapshots`
  - etc.

### **Phase 2: Alter Existing Tables** (Careful - preserve data)
- Add missing columns to existing tables
- Example: If `users` table is missing `fullName`, add it:
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "fullName" TEXT;
  ```
- Convert data types if needed
- Add constraints carefully

### **Phase 3: Add Indexes and Constraints**
- Create indexes for performance
- Add foreign keys (check if data integrity allows)
- Add unique constraints where appropriate

### **Phase 4: Data Migration** (If column names changed)
- If switching from snake_case to camelCase:
  ```sql
  UPDATE users SET "firstName" = first_name WHERE "firstName" IS NULL;
  UPDATE users SET "lastName" = last_name WHERE "lastName" IS NULL;
  ```

### **Phase 5: Verify and Test**
- Check all existing data still accessible
- Test queries work with new schema
- Verify application can read/write

---

## 📁 Important Files

### **Schema & Migration:**
- `/Users/greghogue/Leora/prisma/schema.prisma` - Target schema (1,264 lines)
- `/Users/greghogue/Leora/prisma/supabase-init.sql` - FRESH schema (DON'T USE - will destroy data)
- `/Users/greghogue/Leora/docs/database/MIGRATION-GUIDE.md` - RLS policies

### **Configuration:**
- `/Users/greghogue/Leora/.env.local` - Local environment (has all secrets)
- `/Users/greghogue/.claude.json` - MCP server config (Supabase connected)
- `/Users/greghogue/Leora/vercel.json` - Vercel deployment config

### **API Endpoints Created:**
- `/app/api/admin/init-database/route.ts` - Runs `prisma db push` (DANGEROUS with existing data)
- `/app/api/admin/inspect-database/route.ts` - Inspects database schema via API

### **Documentation:**
- All docs in `/Users/greghogue/Leora/docs/`
- `START-HERE.md` - Quick orientation
- `QUICKSTART-DATABASE.md` - Database setup (needs revision for existing data)
- `DEPLOYMENT-STATUS.txt` - Deployment summary

---

## 🔧 Supabase Connection Details

### **Database Credentials:**
```
Host: db.zqezunzlyjkseugujkrl.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: UHXGhJvhEPRGpL06
SSL: Required

Pooled URL: postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require
Direct URL: postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require
```

### **MCP Server Configured:**
Location: `/Users/greghogue/.claude.json`

```json
{
  "supabase": {
    "command": "npx",
    "args": [
      "@modelcontextprotocol/server-postgres",
      "postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require"
    ],
    "env": {
      "POSTGRES_SSL": "true",
      "POSTGRES_SSL_REJECT_UNAUTHORIZED": "false"
    }
  }
}
```

**Status**: ✅ Connected (verified)

---

## 🎯 Immediate Next Steps (For Fresh Session)

### **Step 1: Restart Claude Code**
The Supabase MCP server requires a restart to load database tools.

### **Step 2: Inspect Existing Database Schema**

Use MCP tools to analyze current schema:

```
1. List all tables:
   mcp__supabase__query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")

2. For each existing table (tenants, users, products, orders, customers):
   mcp__supabase__describe_table("table_name")

3. Check column names and types
4. Compare with Prisma schema at /Users/greghogue/Leora/prisma/schema.prisma
```

### **Step 3: Create Safe Migration Plan**

Based on inspection results:

1. **Identify missing tables** - Create these with CREATE TABLE (safe)
2. **Identify missing columns** - Add with ALTER TABLE ADD COLUMN (safe)
3. **Identify type mismatches** - Plan careful type conversions
4. **Identify naming differences** - Plan renames or use Prisma @map

### **Step 4: Generate Safe Migration SQL**

Create a new file: `prisma/safe-migration-from-existing.sql`

This should:
- Add ONLY missing tables (don't recreate existing ones)
- Add ONLY missing columns to existing tables
- Preserve ALL existing data
- Add indexes and constraints last

### **Step 5: Test and Apply Migration**

1. Review the safe migration SQL carefully
2. Consider backing up the database first
3. Run migration via Supabase SQL Editor
4. Verify data integrity
5. Test the application

---

## 📊 Schema Comparison Needed

### **Known Prisma Schema Expectations:**

**Tenants Table:**
```
- id (TEXT, PK)
- slug (TEXT, unique)
- name (TEXT)
- status (TenantStatus ENUM)
- domain, logoUrl, primaryColor (TEXT, nullable)
- subscriptionTier, billingEmail, contactEmail (TEXT, nullable)
- createdAt, updatedAt (TIMESTAMP)
```

**Users Table:**
```
- id (TEXT, PK)
- tenantId (TEXT, FK to tenants)
- email (TEXT)
- passwordHash (TEXT, nullable)
- firstName, lastName, fullName (TEXT, nullable)
- phone, avatarUrl (TEXT, nullable)
- status (UserStatus ENUM)
- emailVerified (BOOLEAN)
- emailVerifiedAt (TIMESTAMP, nullable)
- failedLoginAttempts (INTEGER)
- lockedUntil, lastLoginAt (TIMESTAMP, nullable)
- lastLoginIp (TEXT, nullable)
- createdAt, updatedAt (TIMESTAMP)
```

**Compare these with your existing tables to find differences!**

---

## ⚠️ Critical Warnings

### **DO NOT:**
- ❌ Run `prisma/supabase-init.sql` - Creates fresh schema
- ❌ Run `prisma db push --accept-data-loss` - May drop data
- ❌ Run `prisma migrate dev` without review - May alter schema unsafely
- ❌ Delete or truncate any existing tables
- ❌ Drop any columns before verifying they're unused

### **DO:**
- ✅ Use MCP tools to inspect before changing anything
- ✅ Create ALTER TABLE commands, not CREATE TABLE
- ✅ Add IF NOT EXISTS clauses
- ✅ Test on a database copy if possible
- ✅ Backup before applying migrations
- ✅ Review all SQL before execution

---

## 🔑 Secrets Reference

**Stored in `/Users/greghogue/Leora/.env.local`:**
- DATABASE_URL, DIRECT_URL (Supabase)
- JWT_SECRET, NEXTAUTH_SECRET
- OPENAI_API_KEY
- DEFAULT_TENANT_SLUG, DEFAULT_PORTAL_USER_KEY
- NEXT_PUBLIC_* variables
- SUPABASE_SERVICE_ROLE_KEY

**Stored in Vercel:**
- All of the above (11 variables configured)
- ADMIN_SECRET (for admin API endpoints)

---

## 📞 Deployment URLs

- **Production**: https://leora-platform.vercel.app
- **Working Deploy**: https://leora-platform-fz9uzh0qx-gregs-projects-61e51c01.vercel.app
- **GitHub**: https://github.com/ghogue02/leora-platform
- **Vercel Dashboard**: https://vercel.com/gregs-projects-61e51c01/leora-platform
- **Supabase Dashboard**: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl

---

## 🎯 Success Criteria for Next Session

### **Must Achieve:**
1. ✅ Successfully connect to Supabase via MCP (already done)
2. ✅ Inspect all existing tables and their schemas
3. ✅ Identify schema differences between existing DB and Prisma schema
4. ✅ Create safe migration SQL that preserves all existing data
5. ✅ Apply migration without data loss
6. ✅ Verify application works with migrated schema
7. ✅ Test all features (login, products, cart, orders, AI chat)

### **Testing Checklist:**
- [ ] Can query existing products (1,937 rows)
- [ ] Can query existing orders (4,268 rows)
- [ ] Can query existing customers (21,215 rows)
- [ ] Portal users can log in
- [ ] Cart functionality works
- [ ] Order creation works
- [ ] AI chat (Ask Leora) responds
- [ ] Dashboard shows real metrics

---

## 💡 Likely Schema Differences to Address

Based on common patterns, expect:

### **Column Naming Convention:**
- Existing DB probably uses `snake_case` (first_name, last_name)
- Prisma schema uses `camelCase` (firstName, lastName)
- **Solution**: Use Prisma's `@map` directive:
  ```prisma
  firstName String? @map("first_name")
  ```

### **Missing Portal Tables:**
- `portal_users` - Likely doesn't exist (needs creation)
- `portal_sessions` - Likely doesn't exist
- `portal_user_roles` - Likely doesn't exist

### **Missing Intelligence Tables:**
- `account_health_snapshots` - New feature
- `sales_metrics` - New feature
- `call_plans` - May not exist
- `activities` - May exist but need schema updates
- `tasks` - May not exist

### **Missing Integration Tables:**
- `webhook_subscriptions`, `webhook_events`, `webhook_deliveries`
- `integration_tokens`
- `notifications`, `lists`, `list_items`
- `carts`, `cart_items`

### **Role & Permission System:**
- `roles`, `permissions`, `role_permissions`
- `user_roles`, `portal_user_roles`
- Likely need to be created

---

## 📝 Commands for New Session

### **After Restart:**

```bash
# 1. Verify MCP connection
# (MCP tools should be available automatically)

# 2. List existing tables via MCP
Use: mcp__supabase__list_tables

# 3. Describe key tables
Use: mcp__supabase__describe_table for each table

# 4. Query sample data to understand format
Use: mcp__supabase__query("SELECT * FROM users LIMIT 1")
Use: mcp__supabase__query("SELECT * FROM products LIMIT 1")

# 5. Create safe migration plan based on findings

# 6. Generate and review migration SQL

# 7. Apply migration via Supabase SQL Editor (safest)
```

---

## 🏗️ Project Structure Reference

```
/Users/greghogue/Leora/
├── app/
│   ├── (portal)/              # Portal pages (8 routes)
│   │   ├── dashboard/page.tsx
│   │   ├── products/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── orders/page.tsx
│   │   └── ... (4 more)
│   ├── api/                   # API routes (23 endpoints)
│   │   ├── portal/auth/*
│   │   ├── portal/cart/*
│   │   ├── portal/products/*
│   │   ├── portal/orders/*
│   │   ├── leora/chat/*
│   │   └── admin/*            # Database init & inspect
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Homepage (redirects to /dashboard)
│   └── globals.css            # Tailwind styles
├── lib/
│   ├── prisma.ts              # Prisma client with tenant helpers
│   ├── ai/                    # OpenAI integration
│   ├── auth/                  # JWT, RBAC, rate limiting
│   ├── intelligence/          # Pace, health, opportunities
│   ├── hooks/                 # React Query hooks
│   └── queries/               # Dashboard queries
├── components/
│   ├── ui/                    # 15+ components
│   ├── providers/             # React Query, Session
│   └── portal/                # Portal layout, Leora chat
├── prisma/
│   ├── schema.prisma          # Target schema (1,264 lines)
│   └── supabase-init.sql      # FRESH schema (DON'T USE)
├── docs/                      # 7 comprehensive guides
├── .env.local                 # All secrets (local)
└── HANDOFF-SESSION-RESUME.md  # This file
```

---

## 🚀 Tech Stack Deployed

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Database**: Prisma ORM → Supabase Postgres
- **Auth**: JWT with jose library
- **State**: TanStack Query v5
- **AI**: OpenAI GPT-5
- **Hosting**: Vercel (gregs-projects-61e51c01)
- **Source**: GitHub (ghogue02/leora-platform)

---

## 📞 Support Resources

**For Questions:**
- Blueprint: `/Users/greghogue/Leora/leora-platform-blueprint.md`
- Build Summary: `/Users/greghogue/Leora/docs/BUILD-SUMMARY.md`
- Deployment Guide: `/Users/greghogue/Leora/docs/deployment/DEPLOYMENT-GUIDE.md`

**For Database:**
- Prisma Schema: `/Users/greghogue/Leora/prisma/schema.prisma`
- Migration Guide: `/Users/greghogue/Leora/docs/database/MIGRATION-GUIDE.md`
- This Handoff: `/Users/greghogue/Leora/HANDOFF-SESSION-RESUME.md`

---

## ✅ Session Complete Summary

**What Worked:**
- Complete platform built in ~45 minutes using concurrent agents
- Deployed to Vercel successfully
- GitHub repository created
- All environment variables configured
- Routing issues fixed
- MCP connection to Supabase established

**What's Pending:**
- Database schema migration (need to preserve existing 27k+ rows)
- Safe ALTER TABLE commands to add missing tables/columns
- Testing with real data after migration

---

## 🎯 Resume Point for Next Session

**Start Here:**

1. **Verify MCP connection** works after restart
2. **Inspect existing schema** using MCP query tools
3. **Compare with Prisma schema** to identify gaps
4. **Create safe migration SQL** (ALTER TABLE, not CREATE TABLE)
5. **Apply migration** via Supabase SQL Editor
6. **Test application** with real data

**Expected Time**: 15-30 minutes for safe migration

---

## 🚨 Data Preservation Checklist

Before any schema changes:

- [ ] Confirmed existing table structures via MCP
- [ ] Identified all differences from Prisma schema
- [ ] Created ALTER TABLE commands (not DROP/CREATE)
- [ ] Tested migration on database copy (optional)
- [ ] Backed up existing data (recommended)
- [ ] Reviewed all SQL for safety
- [ ] Applied migration via Supabase SQL Editor
- [ ] Verified data integrity after migration
- [ ] Tested application functionality

---

**Ready for next session. Restart Claude Code to activate Supabase MCP tools.**

**REMEMBER: 27,000+ rows of production data must be preserved!**
