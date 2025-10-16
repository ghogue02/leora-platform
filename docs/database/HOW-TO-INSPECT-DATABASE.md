# How to Inspect the Leora Database

**Quick guide for checking what's actually in the production database**

---

## Method 1: Use the Admin API (Recommended)

### Step 1: Get Your Admin Secret

```bash
# Check if ADMIN_SECRET is set in Vercel
vercel env ls

# If not set, add it
vercel env add ADMIN_SECRET production
# Enter a secure random string when prompted
```

### Step 2: Call the Inspection Endpoint

```bash
# Get full inspection report
curl "https://leora-platform.vercel.app/api/admin/inspect-database?secret=YOUR_ADMIN_SECRET" \
  | jq . > docs/database/current-database-state.json

# Quick view
curl "https://leora-platform.vercel.app/api/admin/inspect-database?secret=YOUR_ADMIN_SECRET" | jq .

# Just table count
curl -s "https://leora-platform.vercel.app/api/admin/inspect-database?secret=YOUR_ADMIN_SECRET" \
  | jq '.schema.tableCount'

# Just table names
curl -s "https://leora-platform.vercel.app/api/admin/inspect-database?secret=YOUR_ADMIN_SECRET" \
  | jq '.schema.tables[]'

# Tables with data
curl -s "https://leora-platform.vercel.app/api/admin/inspect-database?secret=YOUR_ADMIN_SECRET" \
  | jq '.summary.tablesWithData'
```

### Step 3: Save Results

```bash
# Save to file with timestamp
DATE=$(date +%Y%m%d-%H%M%S)
curl -s "https://leora-platform.vercel.app/api/admin/inspect-database?secret=$ADMIN_SECRET" \
  > "docs/database/inspection-$DATE.json"

# View summary
jq '.summary' "docs/database/inspection-$DATE.json"
```

---

## Method 2: Use Supabase Dashboard

### Option A: SQL Editor

1. Go to: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new
2. Run this query:

```sql
-- Get all tables
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Option B: Table Editor

1. Go to: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/editor
2. Browse tables visually
3. Click each table to see structure and data

---

## Method 3: Use Prisma CLI

### Step 1: Pull Current Schema

```bash
# Pull schema from database to Prisma
npx prisma db pull --force

# This updates prisma/schema.prisma with actual database structure
```

### Step 2: Compare

```bash
# View what Prisma detected
cat prisma/schema.prisma | grep "model " | wc -l

# Expected: 43 models
```

---

## Method 4: Direct psql Connection

### Step 1: Get Connection String

From `.env.local`:
```bash
# Use DIRECT_URL (not DATABASE_URL with pooler)
DIRECT_URL="postgresql://postgres.xxx:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

### Step 2: Connect

```bash
# Install psql if needed (macOS)
brew install postgresql

# Connect
psql "postgresql://postgres.xxx:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

### Step 3: Run Queries

```sql
-- List tables
\dt

-- Describe a table
\d tenants

-- Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- List ENUMs
\dT+

-- Exit
\q
```

---

## Quick Inspection Queries

Once connected to the database (via SQL Editor or psql):

### Count Everything

```sql
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as tables,
  (SELECT COUNT(*) FROM pg_type
   WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as enums,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as indexes,
  (SELECT COUNT(*) FROM information_schema.table_constraints
   WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public') as foreign_keys;
```

Expected results:
- tables: 43
- enums: 17
- indexes: 60+
- foreign_keys: 50+

### List Tables with Row Counts

```sql
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows
FROM pg_stat_user_tables
ORDER BY live_rows DESC;
```

### Find Empty Tables

```sql
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE n_live_tup = 0
ORDER BY tablename;
```

### Check Specific Table Structure

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;
```

### Verify Foreign Keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

---

## Interpreting Results

### Scenario 1: Empty Database (0 tables)

```json
{
  "schema": {
    "tableCount": 0,
    "tables": []
  }
}
```

**Action:** Run full `prisma/supabase-init.sql` in Supabase SQL Editor

### Scenario 2: Partial Database (1-42 tables)

```json
{
  "schema": {
    "tableCount": 15,
    "tables": ["tenants", "users", "roles", ...]
  }
}
```

**Action:**
1. Compare with expected 43 tables
2. Generate additive migration SQL
3. Use `CREATE TABLE IF NOT EXISTS` for missing tables

### Scenario 3: Complete Database (43 tables)

```json
{
  "schema": {
    "tableCount": 43,
    "tables": [/* all 43 tables */]
  }
}
```

**Action:**
1. Verify column completeness for each table
2. Check for missing indexes
3. Validate foreign key constraints
4. Test with sample queries

### Scenario 4: Over-complete Database (44+ tables)

```json
{
  "schema": {
    "tableCount": 45,
    "tables": [/* includes old/test tables */]
  }
}
```

**Action:**
1. Identify extra tables
2. Check if they're test tables (e.g., `test_*`)
3. Archive or drop unused tables
4. Verify no production data in extra tables

---

## Creating the Inspection Report

After running the inspection API, create a formatted report:

```bash
# Get data
curl -s "https://leora-platform.vercel.app/api/admin/inspect-database?secret=$ADMIN_SECRET" \
  > inspection.json

# Create markdown report
cat << 'EOF' > docs/database/EXISTING-SCHEMA-INSPECTION.md
# Leora Database Inspection Report

**Date:** $(date)
**Database:** Supabase (Leora Production)

## Summary

$(jq '.summary' inspection.json)

## Tables

$(jq '.schema.tables[]' inspection.json)

## Tables with Data

$(jq -r '.tables | to_entries[] | select(.value.rowCount > 0) | "\(.key): \(.value.rowCount) rows"' inspection.json)

## ENUM Types

$(jq '.enums' inspection.json)

## Detailed Schema

$(jq '.tables' inspection.json)
EOF
```

---

## Troubleshooting

### "Unauthorized" Error

```bash
# Check your secret
echo $ADMIN_SECRET

# Verify it matches Vercel env
vercel env pull .env.local
cat .env.local | grep ADMIN_SECRET
```

### "Can't reach database server"

```bash
# Check DATABASE_URL is set
vercel env get DATABASE_URL production

# Test connection from Vercel
vercel logs --follow
# Then call the API
```

### "Rate limit exceeded"

Wait a minute and try again. Or use Supabase dashboard directly.

---

## Next Steps After Inspection

1. **If 0 tables:**
   - Run `prisma/supabase-init.sql` in Supabase SQL Editor
   - Verify with another inspection call

2. **If partial (1-42 tables):**
   - Generate migration SQL using `docs/database/SAFE-MIGRATION-SQL.md`
   - Test in staging if available
   - Run migration
   - Verify with inspection

3. **If complete (43 tables):**
   - Compare column-level details with Prisma schema
   - Check for missing indexes
   - Run validation queries
   - Proceed with seed data

4. **Document findings:**
   - Save inspection JSON
   - Update `EXISTING-SCHEMA-INSPECTION.md`
   - Note any anomalies or issues

---

## Automated Inspection Script

Save this as `scripts/inspect-db.sh`:

```bash
#!/bin/bash
set -e

# Load environment
source .env.local

if [ -z "$ADMIN_SECRET" ]; then
  echo "Error: ADMIN_SECRET not set"
  exit 1
fi

# Create docs directory if needed
mkdir -p docs/database

# Get inspection data
echo "Inspecting database..."
RESPONSE=$(curl -s "https://leora-platform.vercel.app/api/admin/inspect-database?secret=$ADMIN_SECRET")

# Check for error
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo "Error inspecting database:"
  echo "$RESPONSE" | jq '.error'
  exit 1
fi

# Save results
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
echo "$RESPONSE" | jq . > "docs/database/inspection-$TIMESTAMP.json"

# Print summary
echo ""
echo "✅ Inspection complete!"
echo ""
echo "Summary:"
echo "$RESPONSE" | jq '.summary'

echo ""
echo "Saved to: docs/database/inspection-$TIMESTAMP.json"
```

Make it executable and run:

```bash
chmod +x scripts/inspect-db.sh
./scripts/inspect-db.sh
```

---

**Last Updated:** 2025-10-15
**Status:** Ready to Use
