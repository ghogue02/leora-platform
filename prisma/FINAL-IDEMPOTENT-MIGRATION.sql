-- =====================================================
-- LEORA PLATFORM - 100% SAFE IDEMPOTENT MIGRATION
-- =====================================================
-- Purpose: Add missing tables and columns to existing database
-- Safety: Preserves ALL existing data (27,000+ rows)
-- Date: 2025-10-15
-- Version: FINAL
-- =====================================================
--
-- CRITICAL SAFETY GUARANTEES:
-- ✅ Only creates tables that don't exist
-- ✅ Only adds columns that don't exist
-- ✅ Only creates indexes that don't exist
-- ✅ NO DROP, NO TRUNCATE, NO DELETE commands
-- ✅ New columns are nullable OR have safe defaults
-- ✅ All existing data is 100% preserved
-- ✅ Uses proper quoted identifiers for camelCase columns
-- ✅ Does NOT try to calculate values for new columns
--
-- HOW TO USE:
-- 1. Review this file carefully
-- 2. Run in Supabase SQL Editor
-- 3. Run verification queries at the end
-- =====================================================

-- =====================================================
-- SECTION 1: CREATE ENUM TYPES (IF NOT EXISTS)
-- =====================================================

DO $$ BEGIN
    CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PortalUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlcoholType" AS ENUM ('WINE', 'BEER', 'SPIRITS', 'CIDER', 'SAKE', 'MEAD', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SkuStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'ON_HOLD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ActivityPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CallPlanStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FilingStatus" AS ENUM ('PENDING', 'FILED', 'OVERDUE', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- SECTION 2: ADD MISSING COLUMNS WITH SAFE DEFAULTS
-- =====================================================
-- All new columns are nullable OR have safe defaults
-- No calculated values - data can be populated later

DO $$
BEGIN
    -- tenants table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT DEFAULT 'starter';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
    END IF;

    -- users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "firstName" TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "fullName" TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT;
    END IF;

    -- portal_users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portal_users') THEN
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "customerId" TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "firstName" TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "lastName" TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "fullName" TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT;
        ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS preferences JSONB;
    END IF;

    -- products table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE products ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS varietal TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS vintage TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS region TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS "alcoholType" "AlcoholType";
        ALTER TABLE products ADD COLUMN IF NOT EXISTS "alcoholPercent" DECIMAL(5,2);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN DEFAULT false;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB;
    END IF;

    -- customers table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "tradeName" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "primaryContactName" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "primaryContactEmail" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "primaryContactPhone" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "billingAddress" JSONB;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "licenseState" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "licenseExpiry" TIMESTAMP(3);
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(10,2);
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata JSONB;
    END IF;

    -- orders table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customerId" TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "portalUserId" TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "poNumber" TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "requestedDeliveryDate" TIMESTAMP(3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "actualDeliveryDate" TIMESTAMP(3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shippingAmount" DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "billingAddress" JSONB;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "isSampleOrder" BOOLEAN DEFAULT false;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS metadata JSONB;
    END IF;

    -- suppliers table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS slug TEXT;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "contactName" TEXT;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address JSONB;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS metadata JSONB;
    END IF;

    -- inventory table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "warehouseLocation" TEXT;
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "quantityOnHand" INTEGER DEFAULT 0;
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "quantityReserved" INTEGER DEFAULT 0;
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "quantityAvailable" INTEGER DEFAULT 0;
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "reorderPoint" INTEGER;
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "reorderQuantity" INTEGER;
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "lastRestockedAt" TIMESTAMP(3);
    END IF;

END $$;

-- =====================================================
-- SECTION 3: CREATE MISSING TABLES (IF NOT EXISTS)
-- =====================================================

-- Core Tenancy
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    status "TenantStatus" DEFAULT 'ACTIVE' NOT NULL,
    "subscriptionTier" TEXT DEFAULT 'starter' NOT NULL,
    "billingEmail" TEXT,
    "contactEmail" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_settings (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT UNIQUE NOT NULL,
    "defaultCurrency" TEXT DEFAULT 'USD' NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles' NOT NULL,
    "dateFormat" TEXT DEFAULT 'MM/DD/YY' NOT NULL,
    "revenueHealthDropPercent" DECIMAL(5,2) DEFAULT 15 NOT NULL,
    "minimumOrdersForHealth" INTEGER DEFAULT 3 NOT NULL,
    "defaultSampleAllowancePerRep" INTEGER DEFAULT 60 NOT NULL,
    "requireManagerApprovalAbove" INTEGER DEFAULT 60 NOT NULL,
    "minimumOrdersForPaceCalc" INTEGER DEFAULT 3 NOT NULL,
    "paceRiskThresholdDays" INTEGER DEFAULT 2 NOT NULL,
    "portalEnabled" BOOLEAN DEFAULT true NOT NULL,
    "cartEnabled" BOOLEAN DEFAULT true NOT NULL,
    "invoiceVisibility" BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Identity & Access
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    "displayName" TEXT NOT NULL,
    description TEXT,
    "isSystemRole" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    "displayName" TEXT NOT NULL,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "assignedBy" TEXT,
    UNIQUE("userId", "roleId")
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "grantedBy" TEXT,
    UNIQUE("roleId", "permissionId")
);

-- Portal Users
CREATE TABLE IF NOT EXISTS portal_user_roles (
    id TEXT PRIMARY KEY,
    "portalUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    UNIQUE("portalUserId", "roleId")
);

CREATE TABLE IF NOT EXISTS portal_sessions (
    id TEXT PRIMARY KEY,
    "portalUserId" TEXT NOT NULL,
    "accessToken" TEXT UNIQUE NOT NULL,
    "refreshToken" TEXT UNIQUE,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "lastActiveAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Products & Inventory (remaining tables)
CREATE TABLE IF NOT EXISTS skus (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "variantName" TEXT,
    "packSize" TEXT,
    "unitSize" TEXT,
    "caseQuantity" INTEGER,
    upc TEXT,
    gtin TEXT,
    "basePrice" DECIMAL(10,2),
    "baseCurrency" TEXT DEFAULT 'USD' NOT NULL,
    weight DECIMAL(10,2),
    "weightUnit" TEXT,
    status "SkuStatus" DEFAULT 'ACTIVE' NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    UNIQUE("tenantId", "skuCode")
);

CREATE TABLE IF NOT EXISTS price_list_entries (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceListName" TEXT DEFAULT 'standard' NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "customerTier" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Commerce: Orders & Invoices
CREATE TABLE IF NOT EXISTS order_lines (
    id TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "discountAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "appliedPricingRules" JSONB,
    "isSample" BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "invoiceNumber" TEXT UNIQUE NOT NULL,
    status "InvoiceStatus" DEFAULT 'DRAFT' NOT NULL,
    "invoiceDate" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    subtotal DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "shippingAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "discountAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "balanceDue" DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    notes TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "paymentNumber" TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "referenceNumber" TEXT,
    status "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
    notes TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Cart & Lists
CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "customerId" TEXT,
    status "CartStatus" DEFAULT 'ACTIVE' NOT NULL,
    subtotal DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "taxAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "shippingAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "discountAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    "totalAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
    notes TEXT,
    "convertedToOrderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    notes TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    "isDefault" BOOLEAN DEFAULT false NOT NULL,
    "isShared" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS list_items (
    id TEXT PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    notes TEXT,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Activities & Metrics
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "activityType" TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    "activityDate" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    status "ActivityStatus" DEFAULT 'PENDING' NOT NULL,
    priority "ActivityPriority" DEFAULT 'MEDIUM' NOT NULL,
    outcome TEXT,
    notes TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS call_plans (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    status "CallPlanStatus" DEFAULT 'SCHEDULED' NOT NULL,
    objective TEXT,
    notes TEXT,
    outcome TEXT,
    "completedAt" TIMESTAMP(3),
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status "TaskStatus" DEFAULT 'PENDING' NOT NULL,
    priority "TaskPriority" DEFAULT 'MEDIUM' NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS account_health_snapshots (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "currentMonthRevenue" DECIMAL(10,2) NOT NULL,
    "averageMonthRevenue" DECIMAL(10,2) NOT NULL,
    "revenueDropPercent" DECIMAL(5,2),
    "revenueHealthStatus" TEXT NOT NULL,
    "establishedPaceDays" DECIMAL(5,2),
    "daysSinceLastOrder" INTEGER,
    "paceStatus" TEXT NOT NULL,
    "samplePullsThisMonth" INTEGER DEFAULT 0 NOT NULL,
    "sampleAllowance" INTEGER DEFAULT 60 NOT NULL,
    "healthScore" DECIMAL(5,2),
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_metrics (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "metricType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DECIMAL(15,4) NOT NULL,
    period TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    dimensions JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Compliance & Tax
CREATE TABLE IF NOT EXISTS compliance_filings (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    state TEXT NOT NULL,
    "filingType" TEXT NOT NULL,
    period TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "filedDate" TIMESTAMP(3),
    status "FilingStatus" DEFAULT 'PENDING' NOT NULL,
    "documentUrl" TEXT,
    notes TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS state_tax_rates (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    state TEXT NOT NULL,
    "alcoholType" "AlcoholType" NOT NULL,
    "exciseTaxRate" DECIMAL(10,4) NOT NULL,
    "salesTaxRate" DECIMAL(5,4) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    notes TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Webhooks & Integrations
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    status "WebhookStatus" DEFAULT 'ACTIVE' NOT NULL,
    secret TEXT NOT NULL,
    "retryCount" INTEGER DEFAULT 3 NOT NULL,
    timeout INTEGER DEFAULT 30 NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    payload JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id TEXT PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    status "DeliveryStatus" DEFAULT 'PENDING' NOT NULL,
    "attemptCount" INTEGER DEFAULT 0 NOT NULL,
    "maxAttempts" INTEGER DEFAULT 3 NOT NULL,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    response JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_tokens (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    provider TEXT NOT NULL,
    "tokenType" TEXT DEFAULT 'api_key' NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    scopes TEXT[] NOT NULL,
    status "TokenStatus" DEFAULT 'ACTIVE' NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority "NotificationPriority" DEFAULT 'NORMAL' NOT NULL,
    "isRead" BOOLEAN DEFAULT false NOT NULL,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- =====================================================
-- SECTION 4: ADD FOREIGN KEY CONSTRAINTS (SAFE)
-- =====================================================

DO $$
BEGIN
    -- tenant_settings -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_settings_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_settings') THEN
            ALTER TABLE tenant_settings ADD CONSTRAINT "tenant_settings_tenantId_fkey"
                FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- users -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenantId') THEN
                ALTER TABLE users ADD CONSTRAINT "users_tenantId_fkey"
                    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- portal_users -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_users_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portal_users') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'tenantId') THEN
                ALTER TABLE portal_users ADD CONSTRAINT "portal_users_tenantId_fkey"
                    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- products -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tenantId') THEN
                ALTER TABLE products ADD CONSTRAINT "products_tenantId_fkey"
                    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- customers -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenantId') THEN
                ALTER TABLE customers ADD CONSTRAINT "customers_tenantId_fkey"
                    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- orders -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tenantId') THEN
                ALTER TABLE orders ADD CONSTRAINT "orders_tenantId_fkey"
                    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- suppliers -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'tenantId') THEN
                ALTER TABLE suppliers ADD CONSTRAINT "suppliers_tenantId_fkey"
                    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- inventory -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_tenantId_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'tenantId') THEN
                ALTER TABLE inventory ADD CONSTRAINT "inventory_tenantId_fkey"
                    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

END $$;

-- =====================================================
-- SECTION 5: CREATE INDEXES (IF NOT EXISTS)
-- =====================================================

-- Tenants
CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON tenants("slug");
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON tenants("status");

-- Users (only create if ALL columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS "users_tenantId_status_idx" ON users("tenantId", "status");
    END IF;
END $$;

-- Portal Users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'customerId') THEN
        CREATE INDEX IF NOT EXISTS "portal_users_tenantId_customerId_idx" ON portal_users("tenantId", "customerId");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS "portal_users_tenantId_status_idx" ON portal_users("tenantId", "status");
    END IF;
END $$;

-- Products
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS "products_tenantId_status_idx" ON products("tenantId", "status");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
        CREATE INDEX IF NOT EXISTS "products_tenantId_category_idx" ON products("tenantId", "category");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplierId') THEN
        CREATE INDEX IF NOT EXISTS "products_supplierId_idx" ON products("supplierId");
    END IF;
END $$;

-- Customers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS "customers_tenantId_status_idx" ON customers("tenantId", "status");
    END IF;
END $$;

-- Orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customerId') THEN
        CREATE INDEX IF NOT EXISTS "orders_tenantId_customerId_idx" ON orders("tenantId", "customerId");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tenantId')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS "orders_tenantId_status_idx" ON orders("tenantId", "status");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'orderDate') THEN
        CREATE INDEX IF NOT EXISTS "orders_orderDate_idx" ON orders("orderDate");
    END IF;
END $$;

-- Inventory
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'tenantId') THEN
        CREATE INDEX IF NOT EXISTS "inventory_tenantId_productId_idx" ON inventory("tenantId", "productId");
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT 'Migration completed successfully!' as status;

-- Check tenant_id columns added
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenantId'
ORDER BY table_name;

-- Check row counts (should match before migration)
SELECT 'tenants' as table_name, COUNT(*) as row_count FROM tenants
UNION ALL
SELECT 'users', COUNT(*) FROM users WHERE users.id IS NOT NULL
UNION ALL
SELECT 'customers', COUNT(*) FROM customers WHERE customers.id IS NOT NULL
UNION ALL
SELECT 'products', COUNT(*) FROM products WHERE products.id IS NOT NULL
UNION ALL
SELECT 'orders', COUNT(*) FROM orders WHERE orders.id IS NOT NULL
ORDER BY table_name;

-- Expected: customers≈21,215, products≈1,937, orders≈4,268
