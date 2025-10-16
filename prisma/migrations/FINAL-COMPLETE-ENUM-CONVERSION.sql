-- ============================================================================
-- COMPLETE ENUM TO TEXT CONVERSION MIGRATION
-- ============================================================================
-- Date: October 16, 2025
-- Purpose: Convert all 28 remaining PostgreSQL enum columns to TEXT
-- Status: SAFE - All conversions use ::text casting
-- Duration: ~30-60 seconds for full execution
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CRITICAL AUTHENTICATION ENUMS (Priority: 🔴 CRITICAL)
-- ============================================================================

DO $$
BEGIN
    -- portal_users.role (CRITICAL for portal auth)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'portal_users'
          AND column_name = 'role'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting portal_users.role from enum to text...';
        ALTER TABLE portal_users
            ALTER COLUMN role TYPE text USING role::text;
        RAISE NOTICE '✅ portal_users.role converted to text';
    ELSE
        RAISE NOTICE '✓ portal_users.role already text';
    END IF;

    -- users.role (CRITICAL for admin auth)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'role'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting users.role from enum to text...';
        ALTER TABLE users
            ALTER COLUMN role TYPE text USING role::text;
        RAISE NOTICE '✅ users.role converted to text';
    ELSE
        RAISE NOTICE '✓ users.role already text';
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: HIGH PRIORITY BUSINESS ENUMS (Priority: 🟡 HIGH)
-- ============================================================================

DO $$
BEGIN
    -- customers.establishedPace
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers'
          AND column_name = 'establishedPace'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting customers.establishedPace...';
        ALTER TABLE customers
            ALTER COLUMN "establishedPace" TYPE text USING "establishedPace"::text;
        RAISE NOTICE '✅ customers.establishedPace converted';
    ELSE
        RAISE NOTICE '✓ customers.establishedPace already text';
    END IF;

    -- customers.healthStatus
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers'
          AND column_name = 'healthStatus'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting customers.healthStatus...';
        ALTER TABLE customers
            ALTER COLUMN "healthStatus" TYPE text USING "healthStatus"::text;
        RAISE NOTICE '✅ customers.healthStatus converted';
    ELSE
        RAISE NOTICE '✓ customers.healthStatus already text';
    END IF;

    -- orders.source
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders'
          AND column_name = 'source'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting orders.source...';
        ALTER TABLE orders
            ALTER COLUMN source TYPE text USING source::text;
        RAISE NOTICE '✅ orders.source converted';
    ELSE
        RAISE NOTICE '✓ orders.source already text';
    END IF;

    -- orders.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting orders.type...';
        ALTER TABLE orders
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ orders.type converted';
    ELSE
        RAISE NOTICE '✓ orders.type already text';
    END IF;

    -- payments.paymentMethod
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'paymentMethod'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting payments.paymentMethod...';
        ALTER TABLE payments
            ALTER COLUMN "paymentMethod" TYPE text USING "paymentMethod"::text;
        RAISE NOTICE '✅ payments.paymentMethod converted';
    ELSE
        RAISE NOTICE '✓ payments.paymentMethod already text';
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: MEDIUM PRIORITY ENUMS (Priority: 🟢 MEDIUM)
-- ============================================================================

DO $$
BEGIN
    -- account_health_snapshots.healthStatus
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'account_health_snapshots'
          AND column_name = 'healthStatus'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting account_health_snapshots.healthStatus...';
        ALTER TABLE account_health_snapshots
            ALTER COLUMN "healthStatus" TYPE text USING "healthStatus"::text;
        RAISE NOTICE '✅ account_health_snapshots.healthStatus converted';
    ELSE
        RAISE NOTICE '✓ account_health_snapshots.healthStatus already text';
    END IF;

    -- activity_types.weightCategory
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activity_types'
          AND column_name = 'weightCategory'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting activity_types.weightCategory...';
        ALTER TABLE activity_types
            ALTER COLUMN "weightCategory" TYPE text USING "weightCategory"::text;
        RAISE NOTICE '✅ activity_types.weightCategory converted';
    ELSE
        RAISE NOTICE '✓ activity_types.weightCategory already text';
    END IF;

    -- addresses.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'addresses'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting addresses.type...';
        ALTER TABLE addresses
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ addresses.type converted';
    ELSE
        RAISE NOTICE '✓ addresses.type already text';
    END IF;

    -- automated_tasks.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'automated_tasks'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting automated_tasks.type...';
        ALTER TABLE automated_tasks
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ automated_tasks.type converted';
    ELSE
        RAISE NOTICE '✓ automated_tasks.type already text';
    END IF;

    -- companies.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting companies.type...';
        ALTER TABLE companies
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ companies.type converted';
    ELSE
        RAISE NOTICE '✓ companies.type already text';
    END IF;

    -- compliance_transactions.customerType
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'compliance_transactions'
          AND column_name = 'customerType'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting compliance_transactions.customerType...';
        ALTER TABLE compliance_transactions
            ALTER COLUMN "customerType" TYPE text USING "customerType"::text;
        RAISE NOTICE '✅ compliance_transactions.customerType converted';
    ELSE
        RAISE NOTICE '✓ compliance_transactions.customerType already text';
    END IF;

    -- compliance_transactions.wineType
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'compliance_transactions'
          AND column_name = 'wineType'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting compliance_transactions.wineType...';
        ALTER TABLE compliance_transactions
            ALTER COLUMN "wineType" TYPE text USING "wineType"::text;
        RAISE NOTICE '✅ compliance_transactions.wineType converted';
    ELSE
        RAISE NOTICE '✓ compliance_transactions.wineType already text';
    END IF;

    -- customer_activity_logs.action
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_activity_logs'
          AND column_name = 'action'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting customer_activity_logs.action...';
        ALTER TABLE customer_activity_logs
            ALTER COLUMN action TYPE text USING action::text;
        RAISE NOTICE '✅ customer_activity_logs.action converted';
    ELSE
        RAISE NOTICE '✓ customer_activity_logs.action already text';
    END IF;

    -- customer_documents.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_documents'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting customer_documents.type...';
        ALTER TABLE customer_documents
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ customer_documents.type converted';
    ELSE
        RAISE NOTICE '✓ customer_documents.type already text';
    END IF;

    -- customer_documents.visibility
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_documents'
          AND column_name = 'visibility'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting customer_documents.visibility...';
        ALTER TABLE customer_documents
            ALTER COLUMN visibility TYPE text USING visibility::text;
        RAISE NOTICE '✅ customer_documents.visibility converted';
    ELSE
        RAISE NOTICE '✓ customer_documents.visibility already text';
    END IF;

    -- customer_notifications.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_notifications'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting customer_notifications.type...';
        ALTER TABLE customer_notifications
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ customer_notifications.type converted';
    ELSE
        RAISE NOTICE '✓ customer_notifications.type already text';
    END IF;

    -- inventory.pool
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory'
          AND column_name = 'pool'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting inventory.pool...';
        ALTER TABLE inventory
            ALTER COLUMN pool TYPE text USING pool::text;
        RAISE NOTICE '✅ inventory.pool converted';
    ELSE
        RAISE NOTICE '✓ inventory.pool already text';
    END IF;

    -- notes.noteType
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes'
          AND column_name = 'noteType'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting notes.noteType...';
        ALTER TABLE notes
            ALTER COLUMN "noteType" TYPE text USING "noteType"::text;
        RAISE NOTICE '✅ notes.noteType converted';
    ELSE
        RAISE NOTICE '✓ notes.noteType already text';
    END IF;

    -- notification_logs.channel
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notification_logs'
          AND column_name = 'channel'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting notification_logs.channel...';
        ALTER TABLE notification_logs
            ALTER COLUMN channel TYPE text USING channel::text;
        RAISE NOTICE '✅ notification_logs.channel converted';
    ELSE
        RAISE NOTICE '✓ notification_logs.channel already text';
    END IF;

    -- notification_preferences.emailFrequency
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notification_preferences'
          AND column_name = 'emailFrequency'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting notification_preferences.emailFrequency...';
        ALTER TABLE notification_preferences
            ALTER COLUMN "emailFrequency" TYPE text USING "emailFrequency"::text;
        RAISE NOTICE '✅ notification_preferences.emailFrequency converted';
    ELSE
        RAISE NOTICE '✓ notification_preferences.emailFrequency already text';
    END IF;

    -- notifications.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting notifications.type...';
        ALTER TABLE notifications
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ notifications.type converted';
    ELSE
        RAISE NOTICE '✓ notifications.type already text';
    END IF;

    -- state_configurations.filingFrequency
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'state_configurations'
          AND column_name = 'filingFrequency'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting state_configurations.filingFrequency...';
        ALTER TABLE state_configurations
            ALTER COLUMN "filingFrequency" TYPE text USING "filingFrequency"::text;
        RAISE NOTICE '✅ state_configurations.filingFrequency converted';
    ELSE
        RAISE NOTICE '✓ state_configurations.filingFrequency already text';
    END IF;

    -- state_filing_info.frequency
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'state_filing_info'
          AND column_name = 'frequency'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting state_filing_info.frequency...';
        ALTER TABLE state_filing_info
            ALTER COLUMN frequency TYPE text USING frequency::text;
        RAISE NOTICE '✅ state_filing_info.frequency converted';
    ELSE
        RAISE NOTICE '✓ state_filing_info.frequency already text';
    END IF;

    -- state_tax_rates.wineType
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'state_tax_rates'
          AND column_name = 'wineType'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting state_tax_rates.wineType...';
        ALTER TABLE state_tax_rates
            ALTER COLUMN "wineType" TYPE text USING "wineType"::text;
        RAISE NOTICE '✅ state_tax_rates.wineType converted';
    ELSE
        RAISE NOTICE '✓ state_tax_rates.wineType already text';
    END IF;

    -- tasks.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting tasks.type...';
        ALTER TABLE tasks
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ tasks.type converted';
    ELSE
        RAISE NOTICE '✓ tasks.type already text';
    END IF;

    -- uploaded_files.type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'uploaded_files'
          AND column_name = 'type'
          AND data_type = 'USER-DEFINED'
    ) THEN
        RAISE NOTICE '🔧 Converting uploaded_files.type...';
        ALTER TABLE uploaded_files
            ALTER COLUMN type TYPE text USING type::text;
        RAISE NOTICE '✅ uploaded_files.type converted';
    ELSE
        RAISE NOTICE '✓ uploaded_files.type already text';
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: CLEANUP - DROP UNUSED ENUM TYPES
-- ============================================================================
-- Note: This section is commented out for safety. Uncomment after verifying
-- all enum columns are converted and no application code references these types.

/*
DO $$
BEGIN
    RAISE NOTICE '🧹 Dropping unused enum types...';

    DROP TYPE IF EXISTS "PortalUserRole" CASCADE;
    DROP TYPE IF EXISTS "UserRole" CASCADE;
    DROP TYPE IF EXISTS "AccountPace" CASCADE;
    DROP TYPE IF EXISTS "AccountHealthStatus" CASCADE;
    DROP TYPE IF EXISTS "OrderSource" CASCADE;
    DROP TYPE IF EXISTS "OrderType" CASCADE;
    DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
    DROP TYPE IF EXISTS "ActivityWeightCategory" CASCADE;
    DROP TYPE IF EXISTS "AddressType" CASCADE;
    DROP TYPE IF EXISTS "TaskType" CASCADE;
    DROP TYPE IF EXISTS "CompanyType" CASCADE;
    DROP TYPE IF EXISTS "CustomerType" CASCADE;
    DROP TYPE IF EXISTS "WineType" CASCADE;
    DROP TYPE IF EXISTS "CustomerActionType" CASCADE;
    DROP TYPE IF EXISTS "CustomerDocumentType" CASCADE;
    DROP TYPE IF EXISTS "DocumentVisibility" CASCADE;
    DROP TYPE IF EXISTS "CustomerNotificationType" CASCADE;
    DROP TYPE IF EXISTS "InventoryPool" CASCADE;
    DROP TYPE IF EXISTS "NoteType" CASCADE;
    DROP TYPE IF EXISTS "NotificationChannel" CASCADE;
    DROP TYPE IF EXISTS "EmailFrequency" CASCADE;
    DROP TYPE IF EXISTS "NotificationType" CASCADE;
    DROP TYPE IF EXISTS "FilingFrequency" CASCADE;
    DROP TYPE IF EXISTS "FileType" CASCADE;

    RAISE NOTICE '✅ Enum types dropped successfully';
END $$;
*/

-- ============================================================================
-- SECTION 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    remaining_enums INTEGER;
BEGIN
    -- Count remaining enum columns
    SELECT COUNT(*)
    INTO remaining_enums
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'USER-DEFINED';

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRATION COMPLETE';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';

    IF remaining_enums = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All enum columns converted to TEXT!';
        RAISE NOTICE '✅ Your database is now fully Prisma-compatible';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % enum columns still remain', remaining_enums;
        RAISE NOTICE '   Run verification query to identify them';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update prisma/schema.prisma (remove enums, change to String)';
    RAISE NOTICE '2. Run: npx prisma generate';
    RAISE NOTICE '3. Test authentication and data queries';
    RAISE NOTICE '4. Deploy to production';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY (Run separately to check results)
-- ============================================================================
/*
-- Run this to verify all enums are converted:
SELECT
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'USER-DEFINED'
ORDER BY table_name, column_name;

-- Should return 0 rows if successful!
*/
