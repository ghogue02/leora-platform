# ✅ Next Session Quick Checklist

## 🎯 Your Mission: Safe Database Migration

**You have 27,000+ rows of production data to preserve:**
- 21,215 customers
- 4,268 orders
- 1,937 products
- 5 users
- 1 tenant

---

## 📋 Step-by-Step Checklist

### **Before You Start**
- [ ] Read: `HANDOFF-SESSION-RESUME.md` (full context)
- [ ] Verify: MCP connection to Supabase is active
- [ ] Confirm: You see `mcp__supabase__*` tools available

### **Step 1: Inspect Existing Schema** (10 minutes)
- [ ] Use: `mcp__supabase__query` to list all tables
- [ ] Use: `mcp__supabase__describe_table` for each table
- [ ] Document: Column names, types, constraints
- [ ] Check: Snake_case vs camelCase naming

### **Step 2: Compare with Prisma Schema** (10 minutes)
- [ ] Open: `/Users/greghogue/Leora/prisma/schema.prisma`
- [ ] Compare: Existing tables vs Prisma models
- [ ] Identify: Missing tables (portal_users, notifications, carts, etc.)
- [ ] Identify: Missing columns in existing tables
- [ ] Identify: Type mismatches or naming differences

### **Step 3: Create Safe Migration** (15 minutes)
- [ ] Create: `prisma/safe-migration.sql`
- [ ] Use: `CREATE TABLE IF NOT EXISTS` for new tables
- [ ] Use: `ALTER TABLE ADD COLUMN IF NOT EXISTS` for new columns
- [ ] Use: `@map` directives in Prisma for naming differences
- [ ] Review: Every SQL statement for safety

### **Step 4: Backup (Recommended)** (5 minutes)
- [ ] Go to: Supabase Dashboard → Database → Backups
- [ ] Or: Export data via SQL queries
- [ ] Save: Backup before migration

### **Step 5: Apply Migration** (5 minutes)
- [ ] Open: Supabase SQL Editor
- [ ] Paste: Safe migration SQL
- [ ] Review: One final time
- [ ] Run: Execute the migration
- [ ] Verify: Check table counts haven't changed

### **Step 6: Update Prisma Schema** (If needed)
- [ ] Add: `@map` directives for column name differences
- [ ] Example: `firstName String? @map("first_name")`
- [ ] Run: `npx prisma generate`
- [ ] Test: Queries work with mapping

### **Step 7: Test Application** (10 minutes)
- [ ] Visit: https://leora-platform.vercel.app
- [ ] Test: Can load products (should see 1,937 items)
- [ ] Test: Can load orders (should see 4,268 items)
- [ ] Test: Can load customers (should see 21,215 items)
- [ ] Test: Login works
- [ ] Test: Cart functionality
- [ ] Test: AI chat (Ask Leora)

### **Step 8: Deploy Final Updates**
- [ ] Commit: Any Prisma schema updates
- [ ] Push: `git push` (auto-deploys to Vercel)
- [ ] Verify: Production site works with real data

---

## 🚨 DO NOT DO THESE

- ❌ Run `prisma/supabase-init.sql` (destroys data)
- ❌ Run `npx prisma db push --accept-data-loss` (dangerous)
- ❌ DROP any existing tables
- ❌ TRUNCATE any tables
- ❌ DELETE any data without backup

---

## ✅ SAFE Commands Only

- ✅ `CREATE TABLE IF NOT EXISTS` - Safe
- ✅ `ALTER TABLE ADD COLUMN IF NOT EXISTS` - Safe
- ✅ `CREATE INDEX IF NOT EXISTS` - Safe
- ✅ MCP query tools for inspection - Safe
- ✅ Supabase Table Editor for viewing - Safe

---

## 📞 Quick References

**Handoff Doc**: `HANDOFF-SESSION-RESUME.md` (694 lines, complete context)
**Prisma Schema**: `prisma/schema.prisma` (target schema)
**Supabase Dashboard**: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl
**Production Site**: https://leora-platform.vercel.app
**GitHub**: https://github.com/ghogue02/leora-platform

---

## 🎯 Success = Schema Migration Without Data Loss

**You'll know you're done when:**
- ✅ All Prisma models can query existing tables
- ✅ All 27,000+ rows of data are intact
- ✅ Application works with real Well Crafted data
- ✅ No "table not found" or "column not found" errors
- ✅ Dashboard shows real metrics from existing orders

---

**Start with: Open `HANDOFF-SESSION-RESUME.md` for full context**
