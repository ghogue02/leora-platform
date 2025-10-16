# Enum to Text Migration Guide

## Problem

Vercel deployment is failing with Prisma error:
```
Error converting field "status" of expected non-nullable type "String",
found incompatible value of "ACTIVE"
```

## Root Cause

The Supabase database has PostgreSQL **enum types** for status columns (e.g., `PortalUserStatus`, `OrderStatus`), but our Prisma schema now expects plain **text** columns.

## Why This Happened

1. Original schema used Prisma enums (which creates PostgreSQL enum types)
2. Database was created with these enum types
3. We changed Prisma schema to use String (to avoid type comparison issues)
4. Now there's a mismatch: DB has enums, Prisma expects text

## Solution

Run the migration SQL to convert all enum columns to text type.

### Option 1: Run via Supabase SQL Editor (Recommended)

**Step 1: Run main migration**
1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create new query
4. Copy contents of `prisma/migrations/convert-enums-to-text-v2.sql`
5. Execute the migration
6. Verify with the queries at the bottom

**Step 2: Run cleanup migration for remaining enums**
1. Create another new query in SQL Editor
2. Copy contents of `prisma/migrations/convert-remaining-enums.sql`
3. Execute the migration
4. Verify all enums are converted (query should return 0 rows)

### Option 2: Run via Command Line

```bash
# Using psql with your DATABASE_URL
psql "$DATABASE_URL" -f prisma/migrations/convert-enums-to-text.sql
```

### What the Migration Does

Converts 18 enum columns to text:

1. **portal_users.status** - PortalUserStatus → text
2. **users.status** - UserStatus → text
3. **tenants.status** - TenantStatus → text
4. **products.status** - ProductStatus → text
5. **skus.status** - SkuStatus → text
6. **customers.status** - CustomerStatus → text
7. **orders.status** - OrderStatus → text
8. **invoices.status** - InvoiceStatus → text
9. **payments.status** - PaymentStatus → text
10. **carts.status** - CartStatus → text
11. **activities.status** - ActivityStatus → text
12. **activities.priority** - ActivityPriority → text
13. **call_plans.status** - CallPlanStatus → text
14. **tasks.status** - TaskStatus → text
15. **tasks.priority** - TaskPriority → text
16. **compliance_filings.status** - FilingStatus → text
17. **webhook_subscriptions.status** - WebhookStatus → text
18. **webhook_deliveries.status** - DeliveryStatus → text
19. **integration_tokens.status** - TokenStatus → text
20. **notifications.priority** - NotificationPriority → text

### Safety

- Uses `ALTER COLUMN ... TYPE text USING column::text` for safe conversion
- Preserves all existing values (ACTIVE stays "ACTIVE")
- Wrapped in transaction (BEGIN/COMMIT)
- Includes verification queries

### After Migration

1. Redeploy Vercel (or it will auto-deploy from the commit)
2. Login should work
3. All routes should work
4. No more enum type errors

### Rollback (if needed)

If you need to rollback, you'd need to recreate the enum types and convert back, but that's unlikely since the text type is more flexible.

## Verification

After running the migration, check:

```sql
-- Should show 'text' not 'USER-DEFINED'
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'portal_users' AND column_name = 'status';
```

Expected result: `data_type = 'text'`
