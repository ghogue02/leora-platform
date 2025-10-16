-- Migration: Convert all enum status columns to text type (CORRECTED for camelCase columns)
-- Database columns are in camelCase per schema comment
-- This fixes Prisma error: "Error converting field status of expected non-nullable type String, found incompatible value of ACTIVE"

BEGIN;

-- Check if columns exist first, then convert
-- Using camelCase column names as per schema

-- 1. PortalUser status (camelCase column name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'portal_users' AND column_name = 'status') THEN
    ALTER TABLE portal_users ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 2. User status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 3. Tenant status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'tenants' AND column_name = 'status') THEN
    ALTER TABLE tenants ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 4. Product status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'products' AND column_name = 'status') THEN
    ALTER TABLE products ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 5. SKU status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'skus' AND column_name = 'status') THEN
    ALTER TABLE skus ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 6. Customer status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'customers' AND column_name = 'status') THEN
    ALTER TABLE customers ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 7. Order status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'orders' AND column_name = 'status') THEN
    ALTER TABLE orders ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 8. Invoice status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'invoices' AND column_name = 'status') THEN
    ALTER TABLE invoices ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 9. Payment status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'payments' AND column_name = 'status') THEN
    ALTER TABLE payments ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 10. Cart status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'carts' AND column_name = 'status') THEN
    ALTER TABLE carts ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 11. Activity status and priority
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'activities' AND column_name = 'status') THEN
    ALTER TABLE activities ALTER COLUMN status TYPE text USING status::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'activities' AND column_name = 'priority') THEN
    ALTER TABLE activities ALTER COLUMN priority TYPE text USING priority::text;
  END IF;
END $$;

-- 12. CallPlan status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'call_plans' AND column_name = 'status') THEN
    ALTER TABLE call_plans ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 13. Task status and priority
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'tasks' AND column_name = 'status') THEN
    ALTER TABLE tasks ALTER COLUMN status TYPE text USING status::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'tasks' AND column_name = 'priority') THEN
    ALTER TABLE tasks ALTER COLUMN priority TYPE text USING priority::text;
  END IF;
END $$;

-- 14. ComplianceFiling status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'compliance_filings' AND column_name = 'status') THEN
    ALTER TABLE compliance_filings ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 15. WebhookSubscription status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'webhook_subscriptions' AND column_name = 'status') THEN
    ALTER TABLE webhook_subscriptions ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 16. WebhookDelivery status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'webhook_deliveries' AND column_name = 'status') THEN
    ALTER TABLE webhook_deliveries ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 17. IntegrationToken status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'integration_tokens' AND column_name = 'status') THEN
    ALTER TABLE integration_tokens ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 18. Notification priority
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ALTER COLUMN priority TYPE text USING priority::text;
  END IF;
END $$;

COMMIT;

-- Verification: Show all status/priority columns and their types
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name = 'status' OR column_name = 'priority')
ORDER BY table_name, column_name;
