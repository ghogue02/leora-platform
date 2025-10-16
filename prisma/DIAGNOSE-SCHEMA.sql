-- =====================================================
-- DATABASE SCHEMA DIAGNOSTIC SCRIPT
-- =====================================================
-- Run this in Supabase SQL Editor and paste the results back
-- This will show EXACTLY what columns exist in your database
-- =====================================================

-- 1. List all tables
SELECT '=== EXISTING TABLES ===' as section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Get columns for customers table
SELECT '=== CUSTOMERS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'
ORDER BY ordinal_position;

-- 3. Get columns for products table
SELECT '=== PRODUCTS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- 4. Get columns for orders table
SELECT '=== ORDERS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- 5. Get columns for users table
SELECT '=== USERS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Get columns for suppliers table
SELECT '=== SUPPLIERS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'suppliers'
ORDER BY ordinal_position;

-- 7. Get columns for tenants table (if exists)
SELECT '=== TENANTS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tenants'
ORDER BY ordinal_position;

-- 8. Get existing ENUMs
SELECT '=== EXISTING ENUM TYPES ===' as section;
SELECT t.typname as enum_name, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- 9. Check for row counts
SELECT '=== ROW COUNTS ===' as section;
SELECT
    'tenants' as table_name,
    (SELECT COUNT(*) FROM tenants) as row_count
UNION ALL
SELECT 'customers', (SELECT COUNT(*) FROM customers)
UNION ALL
SELECT 'products', (SELECT COUNT(*) FROM products)
UNION ALL
SELECT 'orders', (SELECT COUNT(*) FROM orders)
UNION ALL
SELECT 'users', (SELECT COUNT(*) FROM users)
UNION ALL
SELECT 'suppliers', (SELECT COUNT(*) FROM suppliers WHERE suppliers.id IS NOT NULL);
