-- ============================================================================
-- Verify New Columns Were Added Successfully
-- ============================================================================
-- Run this in Supabase SQL Editor to confirm migration worked
-- ============================================================================

-- Check TENANTS has new columns
SELECT '=== TENANTS - New Columns ===' as check;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN ('domain', 'subscriptionTier', 'billingEmail', 'contactEmail', 'logoUrl', 'primaryColor')
ORDER BY column_name;
-- Expected: 6 rows

-- Check USERS has new columns
SELECT '=== USERS - New Columns ===' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('passwordHash', 'firstName', 'lastName', 'fullName', 'phone', 'avatarUrl', 'status', 'emailVerified', 'emailVerifiedAt', 'failedLoginAttempts', 'lockedUntil', 'lastLoginAt', 'lastLoginIp')
ORDER BY column_name;
-- Expected: 13 rows

-- Check PORTAL_USERS has new columns
SELECT '=== PORTAL_USERS - New Columns ===' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'portal_users'
  AND column_name IN ('customerId', 'fullName', 'status', 'preferences')
ORDER BY column_name;
-- Expected: 4 rows

-- Check PRODUCTS has new columns
SELECT '=== PRODUCTS - New Columns ===' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('description', 'region', 'imageUrl', 'images', 'alcoholType', 'isSample', 'metadata')
ORDER BY column_name;
-- Expected: 7 rows

-- Check CUSTOMERS has new columns
SELECT '=== CUSTOMERS - New Columns ===' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name IN ('accountNumber', 'tradeName', 'primaryContactName', 'primaryContactEmail', 'primaryContactPhone', 'billingAddress', 'shippingAddress', 'status', 'tier', 'licenseNumber', 'licenseState', 'licenseExpiry', 'notes', 'metadata')
ORDER BY column_name;
-- Expected: 14 rows

-- Check ORDERS has new columns
SELECT '=== ORDERS - New Columns ===' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('requestedDeliveryDate', 'shippingAmount', 'discountAmount', 'currency', 'shippingAddress', 'billingAddress', 'internalNotes', 'isSampleOrder', 'createdBy', 'metadata')
ORDER BY column_name;
-- Expected: 10 rows

-- Check new RBAC tables exist
SELECT '=== RBAC TABLES ===' as check;
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND information_schema.columns.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles', 'portal_user_roles')
ORDER BY table_name;
-- Expected: 5 rows

-- Check TENANT_SETTINGS table exists
SELECT '=== TENANT_SETTINGS ===' as check;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenant_settings'
ORDER BY ordinal_position;
-- Expected: 15 rows

-- Final summary
SELECT '=== FINAL VERIFICATION ===' as check;
SELECT
    '✅ Migration successful!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
    (SELECT COUNT(*) FROM customers) as customers,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM orders) as orders;
