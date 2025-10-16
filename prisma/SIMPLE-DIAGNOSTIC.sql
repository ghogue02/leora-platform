-- =====================================================
-- SIMPLE DATABASE DIAGNOSTIC - ALL IN ONE QUERY
-- =====================================================
-- Copy this entire result and paste it back
-- =====================================================

SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('tenants', 'customers', 'products', 'orders', 'users', 'suppliers')
ORDER BY c.table_name, c.ordinal_position;
