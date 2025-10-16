-- Migration: Convert remaining enum columns to text
-- Based on actual database inspection and error logs showing these columns still have USER-DEFINED enums:
-- - automated_tasks.priority (TaskPriority)
-- - automated_tasks.status (TaskStatus)
-- - call_plan_items.status (CallPlanItemStatus)
-- - customer_notifications.priority (NotificationPriority)
-- - notification_logs.status (DeliveryStatus)
-- - webhook_events.status (WebhookEventStatus)
-- - roles.roleType (RoleType) - CRITICAL: Causing auth failures
-- - products.alcoholType (AlcoholType)
-- - state_tax_rates.alcoholType (AlcoholType)

BEGIN;

-- CRITICAL: Convert roleType (blocking authentication)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'roles' AND column_name = 'roleType') THEN
    ALTER TABLE roles ALTER COLUMN "roleType" TYPE text USING "roleType"::text;
  END IF;
END $$;

-- Convert alcoholType columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'products' AND column_name = 'alcoholType') THEN
    ALTER TABLE products ALTER COLUMN "alcoholType" TYPE text USING "alcoholType"::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'state_tax_rates' AND column_name = 'alcoholType') THEN
    ALTER TABLE state_tax_rates ALTER COLUMN "alcoholType" TYPE text USING "alcoholType"::text;
  END IF;
END $$;

-- 1. automated_tasks table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'automated_tasks' AND column_name = 'status') THEN
    ALTER TABLE automated_tasks ALTER COLUMN status TYPE text USING status::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'automated_tasks' AND column_name = 'priority') THEN
    ALTER TABLE automated_tasks ALTER COLUMN priority TYPE text USING priority::text;
  END IF;
END $$;

-- 2. call_plan_items table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'call_plan_items' AND column_name = 'status') THEN
    ALTER TABLE call_plan_items ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 3. customer_notifications table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'customer_notifications' AND column_name = 'priority') THEN
    ALTER TABLE customer_notifications ALTER COLUMN priority TYPE text USING priority::text;
  END IF;
END $$;

-- 4. notification_logs table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'notification_logs' AND column_name = 'status') THEN
    ALTER TABLE notification_logs ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- 5. webhook_events table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'webhook_events' AND column_name = 'status') THEN
    ALTER TABLE webhook_events ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

COMMIT;

-- Verification: Show remaining USER-DEFINED columns (should be empty after this migration)
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'USER-DEFINED'
  AND (column_name = 'status' OR column_name = 'priority')
ORDER BY table_name, column_name;
