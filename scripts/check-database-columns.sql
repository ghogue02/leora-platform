-- Check actual column names in database
-- This will show us the exact column names that exist

-- Check all tables for status and priority columns
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name LIKE '%status%' OR column_name LIKE '%priority%')
ORDER BY table_name, column_name;

-- Specific tables check
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'portal_users'
ORDER BY ordinal_position;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
