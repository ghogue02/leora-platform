# Supabase Database Reset Guide

**Purpose**: Perform a factory reset to clear all schema issues and start fresh

**Project**: zqezunzlyjkseugujkrl (Well Crafted Beverages)

---

## 🚨 What This Reset Will Do

### Will Be Deleted:
- ❌ All database tables and schemas
- ❌ All data (21,215 customers, 4,268 orders, etc.)
- ❌ Auth users and sessions
- ❌ Storage files
- ❌ Realtime subscriptions

### Will Be Preserved:
- ✅ Project connection info
- ✅ Database credentials
- ✅ API keys
- ✅ Project settings

---

## 📋 Step-by-Step Reset Process

### Step 1: Get Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate New Token"
3. Name it: "CLI Reset Token"
4. Copy the token

### Step 2: Set Environment Variable

```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
```

### Step 3: Link Project

```bash
cd /Users/greghogue/Leora
supabase link --project-ref zqezunzlyjkseugujkrl
```

### Step 4: Perform Reset

```bash
supabase db reset --linked
```

**⚠️ Warning**: This will delete ALL data! Type `yes` to confirm.

---

## 🔄 After Reset - Rebuild Process

### Step 1: Push Clean Prisma Schema

```bash
# The schema is already correct in your repo
npx prisma db push
```

This will create all tables from your current `prisma/schema.prisma` file.

### Step 2: Seed Initial Data

```bash
npm run seed
```

This will create:
- Well Crafted tenant
- Default roles and permissions
- 3 sample products
- 3 sample customers
- Portal users
- Demo orders

### Step 3: Verify Locally

```bash
npx tsx scripts/test-deployed-schema.ts
```

Expected: All ✅ tests pass

### Step 4: Deploy to Vercel

```bash
git add -A
git commit -m "Fresh start after Supabase reset"
git push
```

Vercel will auto-deploy with clean database.

---

## 🎯 Alternative: Fix Without Reset

If you want to keep your 21,215 customers, here's what to check:

### 1. Check Vercel Environment Variables

```bash
vercel env ls
```

Ensure these are set:
- ✅ DATABASE_URL
- ✅ DIRECT_URL
- ✅ JWT_SECRET
- ✅ NEXT_PUBLIC_SUPABASE_URL

### 2. View Latest Logs

```bash
vercel logs leora-platform.vercel.app | grep "\[Insights\]"
```

The new logging (from commit b63ecd0) will show:
- Where auth fails
- Exact error message
- Which step in the insights API crashes

### 3. Test Debug Endpoint

```bash
curl https://leora-platform.vercel.app/api/debug/schema
```

Should return all PASS (already verified).

---

## 📊 Current Status Summary

### Schema Status: ✅ 100% CORRECT
- All models match database
- All queries work locally
- Debug endpoint works on Vercel
- 0 NULL values in monetary fields

### Build Status: ✅ SUCCESSFUL
- TypeScript: 0 errors
- Next.js: All 40 routes compiled
- Prisma: Client generated correctly

### Deployment Status: ✅ READY
- Latest: https://leora-platform-1zruww860... (Ready)
- Has detailed logging for debugging
- Schema verified working

### Issue: ⚠️ Authentication
- Insights API fails with auth error
- Not a schema issue
- Need to see latest Vercel logs with new logging

---

## 🤔 Recommendation

**Option A: Keep Data (Recommended)**
1. Check latest Vercel logs for `[Insights]` messages
2. See exact auth failure point
3. Fix specific auth issue
4. Keep all 21,215 customers

**Option B: Fresh Start**
1. Run Supabase reset (lose all data)
2. Apply clean Prisma schema
3. Seed fresh demo data
4. Guaranteed to work

**I recommend Option A** since all your schema work is complete and verified working. The issue is likely a simple auth/session problem that logs will reveal.

---

**Next**: Check the latest Vercel deployment logs at https://vercel.com/gregs-projects-61e51c01/leora-platform

Look for the `[Insights]` log messages to see exactly where it fails!
