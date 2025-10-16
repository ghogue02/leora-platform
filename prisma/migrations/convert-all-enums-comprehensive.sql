-- COMPREHENSIVE Migration: Convert ALL remaining enum columns to text
-- Based on your database inspection showing these USER-DEFINED enum columns:
--
-- CRITICAL (blocking authentication):
-- - roles.roleType
--
-- From your inspection:
-- - automated_tasks.priority (TaskPriority)
-- - automated_tasks.status (TaskStatus)
-- - call_plan_items.status (CallPlanItemStatus)
-- - customer_notifications.priority (NotificationPriority)
-- - notification_logs.status (DeliveryStatus)
-- - webhook_events.status (WebhookEventStatus)
-- - products.alcoholType (AlcoholType)
-- - state_tax_rates.alcoholType (AlcoholType)

BEGIN;

-- ============================================================================
-- CRITICAL: roles.roleType (MUST BE FIRST - blocks auth)
-- ============================================================================
DO $$
BEGIN
  -- Check if column exists and is an enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles'
      AND column_name = 'roleType'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting roles.roleType from enum to text';
    ALTER TABLE roles ALTER COLUMN "roleType" TYPE text USING "roleType"::text;
  ELSE
    RAISE NOTICE 'roles.roleType already text or does not exist';
  END IF;
END $$;

-- ============================================================================
-- AlcoholType enums
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'alcoholType'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting products.alcoholType from enum to text';
    ALTER TABLE products ALTER COLUMN "alcoholType" TYPE text USING "alcoholType"::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'state_tax_rates'
      AND column_name = 'alcoholType'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting state_tax_rates.alcoholType from enum to text';
    ALTER TABLE state_tax_rates ALTER COLUMN "alcoholType" TYPE text USING "alcoholType"::text;
  END IF;
END $$;

-- ============================================================================
-- Remaining status and priority enums
-- ============================================================================

-- automated_tasks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automated_tasks'
      AND column_name = 'status'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting automated_tasks.status from enum to text';
    ALTER TABLE automated_tasks ALTER COLUMN status TYPE text USING status::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automated_tasks'
      AND column_name = 'priority'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting automated_tasks.priority from enum to text';
    ALTER TABLE automated_tasks ALTER COLUMN priority TYPE text USING priority::text;
  END IF;
END $$;

-- call_plan_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_plan_items'
      AND column_name = 'status'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting call_plan_items.status from enum to text';
    ALTER TABLE call_plan_items ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- customer_notifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_notifications'
      AND column_name = 'priority'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting customer_notifications.priority from enum to text';
    ALTER TABLE customer_notifications ALTER COLUMN priority TYPE text USING priority::text;
  END IF;
END $$;

-- notification_logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_logs'
      AND column_name = 'status'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting notification_logs.status from enum to text';
    ALTER TABLE notification_logs ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- webhook_events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events'
      AND column_name = 'status'
      AND data_type = 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'Converting webhook_events.status from enum to text';
    ALTER TABLE webhook_events ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Should return 0 rows after successful migration
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'USER-DEFINED'
  AND (column_name LIKE '%status%'
    OR column_name LIKE '%priority%'
    OR column_name LIKE '%Type'
    OR column_name LIKE '%type')
ORDER BY table_name, column_name;

-- Verify critical tables
SELECT
  'roles' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'roles'
  AND column_name = 'roleType'
UNION ALL
SELECT
  'products' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name = 'alcoholType'
ORDER BY table_name, column_name;
