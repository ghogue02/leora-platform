-- ============================================================================
-- QUICK FIX: Critical Authentication Enum Conversion
-- ============================================================================
-- Date: October 16, 2025
-- Purpose: Convert ONLY the 2 critical authentication enums
-- Duration: ~5-10 seconds
-- Use Case: Fast fix to unblock authentication immediately
--
-- This migration converts:
-- 1. portal_users.role (CRITICAL - blocks portal login)
-- 2. users.role (CRITICAL - blocks admin login)
--
-- Run the FINAL-COMPLETE-ENUM-CONVERSION.sql later for remaining 26 columns
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '🚀 QUICK FIX: Converting critical authentication enums...';
    RAISE NOTICE '';

    -- portal_users.role (CRITICAL for portal authentication)
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
        RAISE NOTICE '✓ portal_users.role already text (skip)';
    END IF;

    RAISE NOTICE '';

    -- users.role (CRITICAL for admin authentication)
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
        RAISE NOTICE '✓ users.role already text (skip)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ AUTHENTICATION FIX COMPLETE';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Portal authentication: READY';
    RAISE NOTICE '✅ Admin authentication: READY';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Test login at your portal';
    RAISE NOTICE '2. Run FINAL-COMPLETE-ENUM-CONVERSION.sql for remaining 26 columns';
    RAISE NOTICE '3. Update Prisma schema and regenerate client';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Note: Dashboard data queries may still fail until full migration runs';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify auth enums are converted:
/*
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('portal_users', 'users')
  AND column_name = 'role';

-- Expected result:
-- portal_users | role | text
-- users        | role | text
*/
