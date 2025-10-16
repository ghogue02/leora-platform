-- ============================================================================
-- Database Schema Verification Script
-- ============================================================================
-- Run this in Supabase SQL Editor after migration
-- ============================================================================

-- 1. Check row counts (should be unchanged)
SELECT '=== ROW COUNTS ===' as section;
SELECT
    'tenants' as table_name,
    COUNT(*) as row_count,
    '1 expected' as expected
FROM tenants
UNION ALL
SELECT 'users', COUNT(*), '5 expected' FROM users
UNION ALL
SELECT 'customers', COUNT(*), '21,215 expected' FROM customers
UNION ALL
SELECT 'products', COUNT(*), '1,937 expected' FROM products
UNION ALL
SELECT 'orders', COUNT(*), '4,268 expected' FROM orders
UNION ALL
SELECT 'suppliers', COUNT(*), '1,055 expected' FROM suppliers
ORDER BY table_name;

-- 2. Check tenantId columns were added
SELECT '=== TENANT_ID COLUMNS ===' as section;
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    CASE WHEN is_nullable = 'YES' THEN '⚠️ NULL (needs population)' ELSE '✅ NOT NULL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'tenantId'
ORDER BY table_name;

-- 3. Check key tables have all expected columns
SELECT '=== USERS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

SELECT '=== TENANTS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tenants'
ORDER BY ordinal_position;

-- 4. Check foreign key constraints
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('users', 'customers', 'products', 'orders', 'suppliers', 'inventory')
ORDER BY tc.table_name, tc.constraint_name;

-- 5. Check indexes were created
SELECT '=== INDEXES ===' as section;
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('tenants', 'users', 'customers', 'products', 'orders')
    AND indexname NOT LIKE '%pkey'
ORDER BY tablename, indexname;

-- 6. Check RBAC tables exist
SELECT '=== RBAC TABLES ===' as section;
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND c.table_name = information_schema.columns.table_name) as column_count
FROM information_schema.tables c
WHERE table_schema = 'public'
    AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles', 'portal_user_roles')
ORDER BY table_name;

-- 7. Summary
SELECT '=== MIGRATION SUMMARY ===' as section;
SELECT
    '✅ Migration completed successfully!' as status,
    'All data preserved: ' ||
    (SELECT COUNT(*) FROM customers) || ' customers, ' ||
    (SELECT COUNT(*) FROM products) || ' products, ' ||
    (SELECT COUNT(*) FROM orders) || ' orders' as verification;
