-- ============================================================================
-- Leora Platform: Add Missing Columns Migration (FIXED - Case-Sensitive)
-- ============================================================================
--
-- Purpose: Add columns that Prisma schema expects but don't exist in database
-- Database uses camelCase (tenantId, createdAt) with QUOTED identifiers
--
-- Safe: Uses IF NOT EXISTS, preserves all existing data
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- TENANTS: Add missing columns
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS "billingEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;

-- ============================================================================
-- USERS: Add missing columns
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "fullName" TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT;

-- Update existing users to have ACTIVE status if using old 'role' enum
UPDATE users SET "status" = 'ACTIVE' WHERE "status" IS NULL AND "active" = true;
UPDATE users SET "status" = 'INACTIVE' WHERE "status" IS NULL AND "active" = false;

-- ============================================================================
-- PORTAL_USERS: Add missing columns
-- ============================================================================

ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS "customerId" TEXT,
  ADD COLUMN IF NOT EXISTS "fullName" TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Add foreign key if customerId doesn't have one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'portal_users_customerId_fkey'
  ) THEN
    ALTER TABLE portal_users
      ADD CONSTRAINT "portal_users_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES customers(id);
  END IF;
END $$;

-- ============================================================================
-- PRODUCTS: Add missing columns
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB,
  ADD COLUMN IF NOT EXISTS "alcoholType" TEXT,
  ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================================
-- CUSTOMERS: Add missing columns
-- ============================================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS "accountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "tradeName" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryContactName" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryContactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryContactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "billingAddress" JSONB,
  ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseState" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseExpiry" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create unique index on accountNumber if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenantId_accountNumber_key"
  ON customers("tenantId", "accountNumber") WHERE "accountNumber" IS NOT NULL;

-- ============================================================================
-- ORDERS: Add missing columns
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "requestedDeliveryDate" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shippingAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB,
  ADD COLUMN IF NOT EXISTS "billingAddress" JSONB,
  ADD COLUMN IF NOT EXISTS "internalNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "isSampleOrder" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Calculate totalAmount for existing orders
UPDATE orders
SET "totalAmount" = "subtotal" + COALESCE("taxAmount", 0) + COALESCE("shippingAmount", 0) - COALESCE("discountAmount", 0)
WHERE "totalAmount" IS NULL;

-- ============================================================================
-- ORDER_LINES: Add missing columns
-- ============================================================================

ALTER TABLE order_lines
  ADD COLUMN IF NOT EXISTS "lineNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "appliedPricingRules" JSONB,
  ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Set line numbers for existing order lines
WITH numbered_lines AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "orderId" ORDER BY "createdAt") as line_num
  FROM order_lines
  WHERE "lineNumber" IS NULL
)
UPDATE order_lines ol
SET "lineNumber" = nl.line_num
FROM numbered_lines nl
WHERE ol.id = nl.id;

-- Calculate totalAmount for existing order lines
UPDATE order_lines
SET "totalAmount" = "subtotal" + COALESCE("taxAmount", 0) - COALESCE("discountAmount", 0)
WHERE "totalAmount" IS NULL;

-- ============================================================================
-- INVENTORY: Add missing columns
-- ============================================================================

ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS "warehouseLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "quantityOnHand" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quantityReserved" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quantityAvailable" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reorderPoint" INTEGER,
  ADD COLUMN IF NOT EXISTS "reorderQuantity" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastRestockedAt" TIMESTAMP;

-- Migrate existing inventory data
UPDATE inventory
SET
  "quantityOnHand" = COALESCE("casesOnHand"::INTEGER * 12, "unitsOnHand", 0),
  "warehouseLocation" = "warehouse"
WHERE "quantityOnHand" = 0;

UPDATE inventory
SET "quantityAvailable" = "quantityOnHand" - "quantityReserved"
WHERE "quantityAvailable" = 0;

-- ============================================================================
-- SUPPLIERS: Add missing columns
-- ============================================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS "contactName" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================================
-- Create missing RBAC tables (if they don't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  description TEXT,
  "isSystemRole" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS permissions_resource_action_idx ON permissions(resource, action);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  "roleId" TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  "permissionId" TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  "grantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "grantedBy" TEXT,
  UNIQUE("roleId", "permissionId")
);

-- Fix table name mismatches (rename to match Prisma expectations)
ALTER TABLE IF EXISTS user_role_assignments RENAME TO user_roles;
ALTER TABLE IF EXISTS portal_user_role_assignments RENAME TO portal_user_roles;
ALTER TABLE IF EXISTS product_lists RENAME TO lists;
ALTER TABLE IF EXISTS product_list_items RENAME TO list_items;

-- ============================================================================
-- Add TenantSettings table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_settings (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "defaultCurrency" TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'America/Los_Angeles',
  "dateFormat" TEXT DEFAULT 'MM/DD/YY',
  "revenueHealthDropPercent" DECIMAL(5,2) DEFAULT 15,
  "minimumOrdersForHealth" INTEGER DEFAULT 3,
  "defaultSampleAllowancePerRep" INTEGER DEFAULT 60,
  "requireManagerApprovalAbove" INTEGER DEFAULT 60,
  "minimumOrdersForPaceCalc" INTEGER DEFAULT 3,
  "paceRiskThresholdDays" INTEGER DEFAULT 2,
  "portalEnabled" BOOLEAN DEFAULT true,
  "cartEnabled" BOOLEAN DEFAULT true,
  "invoiceVisibility" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

-- Create default settings for existing tenant
INSERT INTO tenant_settings (id, "tenantId", "updatedAt")
SELECT
  'settings_' || id,
  id,
  CURRENT_TIMESTAMP
FROM tenants
ON CONFLICT ("tenantId") DO NOTHING;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify row counts unchanged
DO $$
DECLARE
  customer_count INTEGER;
  product_count INTEGER;
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO customer_count FROM customers;
  SELECT COUNT(*) INTO product_count FROM products;
  SELECT COUNT(*) INTO order_count FROM orders;

  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  Customers: %', customer_count;
  RAISE NOTICE '  Products: %', product_count;
  RAISE NOTICE '  Orders: %', order_count;

  IF customer_count != 21215 THEN
    RAISE EXCEPTION 'Customer count mismatch! Expected 21215, got %', customer_count;
  END IF;

  IF product_count != 1937 THEN
    RAISE EXCEPTION 'Product count mismatch! Expected 1937, got %', product_count;
  END IF;

  IF order_count != 4268 THEN
    RAISE EXCEPTION 'Order count mismatch! Expected 4268, got %', order_count;
  END IF;

  RAISE NOTICE '✅ All row counts verified successfully!';
END $$;

COMMIT;

-- ============================================================================
-- Success Message
-- ============================================================================

SELECT
  'Migration completed successfully!' as status,
  '✅ Added missing columns to existing tables' as step1,
  '✅ Created missing RBAC tables' as step2,
  '✅ Fixed table name mismatches' as step3,
  '✅ Verified data preservation' as step4,
  'Next: Remove @map directives from Prisma schema' as next_step;
