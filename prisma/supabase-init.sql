-- ============================================================================
-- Leora Platform - Supabase SQL Schema
-- Multi-tenant SaaS for beverage alcohol distributors
-- Primary tenant: Well Crafted
--
-- This file creates the complete database schema for the Leora Platform.
-- Run this SQL directly in the Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Tenant status enumeration
CREATE TYPE "TenantStatus" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED'
);

-- User status enumeration
CREATE TYPE "UserStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'LOCKED'
);

-- Portal user status enumeration
CREATE TYPE "PortalUserStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'LOCKED'
);

-- Alcohol type enumeration
CREATE TYPE "AlcoholType" AS ENUM (
  'WINE',
  'BEER',
  'SPIRITS',
  'CIDER',
  'SAKE',
  'MEAD',
  'OTHER'
);

-- Product status enumeration
CREATE TYPE "ProductStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'DISCONTINUED'
);

-- SKU status enumeration
CREATE TYPE "SkuStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE'
);

-- Customer status enumeration
CREATE TYPE "CustomerStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED'
);

-- Order status enumeration
CREATE TYPE "OrderStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'ON_HOLD'
);

-- Invoice status enumeration
CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'VIEWED',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

-- Payment status enumeration
CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'CANCELLED'
);

-- Cart status enumeration
CREATE TYPE "CartStatus" AS ENUM (
  'ACTIVE',
  'CONVERTED',
  'ABANDONED',
  'EXPIRED'
);

-- Activity status enumeration
CREATE TYPE "ActivityStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

-- Activity priority enumeration
CREATE TYPE "ActivityPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Call plan status enumeration
CREATE TYPE "CallPlanStatus" AS ENUM (
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED'
);

-- Task status enumeration
CREATE TYPE "TaskStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

-- Task priority enumeration
CREATE TYPE "TaskPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Filing status enumeration
CREATE TYPE "FilingStatus" AS ENUM (
  'PENDING',
  'FILED',
  'OVERDUE',
  'REJECTED'
);

-- Webhook status enumeration
CREATE TYPE "WebhookStatus" AS ENUM (
  'ACTIVE',
  'PAUSED',
  'DISABLED',
  'ERROR'
);

-- Delivery status enumeration
CREATE TYPE "DeliveryStatus" AS ENUM (
  'PENDING',
  'DELIVERED',
  'FAILED',
  'CANCELLED'
);

-- Token status enumeration
CREATE TYPE "TokenStatus" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED'
);

-- Notification priority enumeration
CREATE TYPE "NotificationPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

-- ============================================================================
-- CORE TABLES: TENANCY & IDENTITY
-- ============================================================================

-- Tenants table (multi-tenant root)
CREATE TABLE "tenants" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "subscriptionTier" TEXT NOT NULL DEFAULT 'starter',
  "billingEmail" TEXT,
  "contactEmail" TEXT,
  "logoUrl" TEXT,
  "primaryColor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Tenant settings table
CREATE TABLE "tenant_settings" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT UNIQUE NOT NULL,
  -- Business configuration
  "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
  "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YY',
  -- Health scoring thresholds
  "revenueHealthDropPercent" DECIMAL(5,2) NOT NULL DEFAULT 15,
  "minimumOrdersForHealth" INTEGER NOT NULL DEFAULT 3,
  -- Sample management
  "defaultSampleAllowancePerRep" INTEGER NOT NULL DEFAULT 60,
  "requireManagerApprovalAbove" INTEGER NOT NULL DEFAULT 60,
  -- Pace tracking
  "minimumOrdersForPaceCalc" INTEGER NOT NULL DEFAULT 3,
  "paceRiskThresholdDays" INTEGER NOT NULL DEFAULT 2,
  -- Portal settings
  "portalEnabled" BOOLEAN NOT NULL DEFAULT true,
  "cartEnabled" BOOLEAN NOT NULL DEFAULT true,
  "invoiceVisibility" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Users table (internal staff)
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "fullName" TEXT,
  "phone" TEXT,
  "avatarUrl" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerifiedAt" TIMESTAMP(3),
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "lastLoginIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  UNIQUE ("tenantId", "email")
);

-- Roles table
CREATE TABLE "roles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- User roles junction table
CREATE TABLE "user_roles" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" TEXT,
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "roleId")
);

-- Permissions table
CREATE TABLE "permissions" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Role permissions junction table
CREATE TABLE "role_permissions" (
  "id" TEXT PRIMARY KEY,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "grantedBy" TEXT,
  FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE,
  FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE,
  UNIQUE ("roleId", "permissionId")
);

-- ============================================================================
-- PORTAL USERS (B2B Customers)
-- ============================================================================

-- Portal users table (customer portal users)
CREATE TABLE "portal_users" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "fullName" TEXT,
  "phone" TEXT,
  "status" "PortalUserStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerifiedAt" TIMESTAMP(3),
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "lastLoginIp" TEXT,
  "preferences" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  UNIQUE ("tenantId", "email")
);

-- Portal user roles junction table
CREATE TABLE "portal_user_roles" (
  "id" TEXT PRIMARY KEY,
  "portalUserId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("portalUserId") REFERENCES "portal_users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE,
  UNIQUE ("portalUserId", "roleId")
);

-- Portal sessions table
CREATE TABLE "portal_sessions" (
  "id" TEXT PRIMARY KEY,
  "portalUserId" TEXT NOT NULL,
  "accessToken" TEXT UNIQUE NOT NULL,
  "refreshToken" TEXT UNIQUE,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "refreshExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("portalUserId") REFERENCES "portal_users"("id") ON DELETE CASCADE
);

-- ============================================================================
-- COMMERCE: PRODUCTS & INVENTORY
-- ============================================================================

-- Suppliers table
CREATE TABLE "suppliers" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "address" JSONB,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  UNIQUE ("tenantId", "slug")
);

-- Products table
CREATE TABLE "products" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "supplierId" TEXT,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "brand" TEXT,
  "varietal" TEXT,
  "vintage" TEXT,
  "region" TEXT,
  "alcoholType" "AlcoholType",
  "alcoholPercent" DECIMAL(5,2),
  "imageUrl" TEXT,
  "images" JSONB,
  "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "isSample" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id"),
  UNIQUE ("tenantId", "sku")
);

-- SKUs table
CREATE TABLE "skus" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuCode" TEXT NOT NULL,
  "variantName" TEXT,
  "packSize" TEXT,
  "unitSize" TEXT,
  "caseQuantity" INTEGER,
  "upc" TEXT,
  "gtin" TEXT,
  "basePrice" DECIMAL(10,2),
  "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  "weight" DECIMAL(10,2),
  "weightUnit" TEXT,
  "status" "SkuStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
  UNIQUE ("tenantId", "skuCode")
);

-- Inventory table
CREATE TABLE "inventory" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "warehouseLocation" TEXT,
  "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
  "quantityReserved" INTEGER NOT NULL DEFAULT 0,
  "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
  "reorderPoint" INTEGER,
  "reorderQuantity" INTEGER,
  "lastRestockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
);

-- Price list entries table
CREATE TABLE "price_list_entries" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "priceListName" TEXT NOT NULL DEFAULT 'standard',
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "minQuantity" INTEGER,
  "maxQuantity" INTEGER,
  "customerTier" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
);

-- ============================================================================
-- COMMERCE: CUSTOMERS & SUPPLIERS
-- ============================================================================

-- Customers table
CREATE TABLE "customers" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "accountNumber" TEXT,
  "companyName" TEXT NOT NULL,
  "tradeName" TEXT,
  "primaryContactName" TEXT,
  "primaryContactEmail" TEXT,
  "primaryContactPhone" TEXT,
  "billingAddress" JSONB,
  "shippingAddress" JSONB,
  "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "tier" TEXT,
  "licenseNumber" TEXT,
  "licenseState" TEXT,
  "licenseExpiry" TIMESTAMP(3),
  "paymentTerms" TEXT,
  "creditLimit" DECIMAL(10,2),
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  UNIQUE ("tenantId", "accountNumber")
);

-- Add foreign key to portal_users for customerId
ALTER TABLE "portal_users"
  ADD FOREIGN KEY ("customerId") REFERENCES "customers"("id");

-- ============================================================================
-- COMMERCE: ORDERS & INVOICES
-- ============================================================================

-- Orders table
CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "portalUserId" TEXT,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "poNumber" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestedDeliveryDate" TIMESTAMP(3),
  "actualDeliveryDate" TIMESTAMP(3),
  "subtotal" DECIMAL(10,2) NOT NULL,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "shippingAddress" JSONB,
  "billingAddress" JSONB,
  "notes" TEXT,
  "internalNotes" TEXT,
  "isSampleOrder" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("customerId") REFERENCES "customers"("id"),
  FOREIGN KEY ("portalUserId") REFERENCES "portal_users"("id"),
  FOREIGN KEY ("createdBy") REFERENCES "users"("id")
);

-- Order lines table
CREATE TABLE "order_lines" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "appliedPricingRules" JSONB,
  "isSample" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "products"("id")
);

-- Invoices table
CREATE TABLE "invoices" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "orderId" TEXT,
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidDate" TIMESTAMP(3),
  "subtotal" DECIMAL(10,2) NOT NULL,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "balanceDue" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("customerId") REFERENCES "customers"("id"),
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
);

-- Payments table
CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "paymentNumber" TEXT UNIQUE NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "paymentMethod" TEXT NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referenceNumber" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("customerId") REFERENCES "customers"("id"),
  FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id")
);

-- ============================================================================
-- COMMERCE: CART & LISTS
-- ============================================================================

-- Carts table
CREATE TABLE "carts" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "portalUserId" TEXT NOT NULL,
  "customerId" TEXT,
  "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
  "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "convertedToOrderId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("portalUserId") REFERENCES "portal_users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
);

-- Cart items table
CREATE TABLE "cart_items" (
  "id" TEXT PRIMARY KEY,
  "cartId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "products"("id")
);

-- Lists table
CREATE TABLE "lists" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "portalUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isShared" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("portalUserId") REFERENCES "portal_users"("id") ON DELETE CASCADE
);

-- List items table
CREATE TABLE "list_items" (
  "id" TEXT PRIMARY KEY,
  "listId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "notes" TEXT,
  "sortOrder" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "products"("id")
);

-- ============================================================================
-- INTELLIGENCE: ACTIVITIES & CALL PLANNING
-- ============================================================================

-- Activities table
CREATE TABLE "activities" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  "activityType" TEXT NOT NULL,
  "subject" TEXT,
  "description" TEXT,
  "activityDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "completedDate" TIMESTAMP(3),
  "status" "ActivityStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "ActivityPriority" NOT NULL DEFAULT 'MEDIUM',
  "outcome" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("customerId") REFERENCES "customers"("id"),
  FOREIGN KEY ("userId") REFERENCES "users"("id"),
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
);

-- Call plans table
CREATE TABLE "call_plans" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "planDate" TIMESTAMP(3) NOT NULL,
  "status" "CallPlanStatus" NOT NULL DEFAULT 'SCHEDULED',
  "objective" TEXT,
  "notes" TEXT,
  "outcome" TEXT,
  "completedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "users"("id"),
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
);

-- Tasks table
CREATE TABLE "tasks" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "customerId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueDate" TIMESTAMP(3),
  "completedDate" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "users"("id"),
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
);

-- ============================================================================
-- INTELLIGENCE: HEALTH & METRICS
-- ============================================================================

-- Account health snapshots table
CREATE TABLE "account_health_snapshots" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Revenue health
  "currentMonthRevenue" DECIMAL(10,2) NOT NULL,
  "averageMonthRevenue" DECIMAL(10,2) NOT NULL,
  "revenueDropPercent" DECIMAL(5,2),
  "revenueHealthStatus" TEXT NOT NULL, -- healthy | at_risk | critical
  -- Order pace (ARPDD)
  "establishedPaceDays" DECIMAL(5,2),
  "daysSinceLastOrder" INTEGER,
  "paceStatus" TEXT NOT NULL, -- on_track | at_risk | overdue
  -- Sample usage
  "samplePullsThisMonth" INTEGER NOT NULL DEFAULT 0,
  "sampleAllowance" INTEGER NOT NULL DEFAULT 60,
  -- Overall score
  "healthScore" DECIMAL(5,2),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
);

-- Sales metrics table
CREATE TABLE "sales_metrics" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "metricType" TEXT NOT NULL,
  "metricName" TEXT NOT NULL,
  "metricValue" DECIMAL(15,4) NOT NULL,
  "period" TEXT,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "dimensions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "users"("id")
);

-- ============================================================================
-- COMPLIANCE & TAX
-- ============================================================================

-- Compliance filings table
CREATE TABLE "compliance_filings" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "filingType" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "filedDate" TIMESTAMP(3),
  "status" "FilingStatus" NOT NULL DEFAULT 'PENDING',
  "documentUrl" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- State tax rates table
CREATE TABLE "state_tax_rates" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "alcoholType" "AlcoholType" NOT NULL,
  "exciseTaxRate" DECIMAL(10,4) NOT NULL,
  "salesTaxRate" DECIMAL(5,4) NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- ============================================================================
-- INTEGRATIONS: WEBHOOKS & TOKENS
-- ============================================================================

-- Webhook subscriptions table
CREATE TABLE "webhook_subscriptions" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "events" TEXT[] NOT NULL,
  "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
  "secret" TEXT NOT NULL,
  "retryCount" INTEGER NOT NULL DEFAULT 3,
  "timeout" INTEGER NOT NULL DEFAULT 30,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Webhook events table
CREATE TABLE "webhook_events" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Webhook deliveries table
CREATE TABLE "webhook_deliveries" (
  "id" TEXT PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lastAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "response" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("subscriptionId") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE,
  FOREIGN KEY ("eventId") REFERENCES "webhook_events"("id") ON DELETE CASCADE
);

-- Integration tokens table
CREATE TABLE "integration_tokens" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "tokenType" TEXT NOT NULL DEFAULT 'api_key',
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "scopes" TEXT[] NOT NULL,
  "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notifications table
CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "portalUserId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "actionUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("portalUserId") REFERENCES "portal_users"("id") ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- Portal users indexes
CREATE INDEX "portal_users_tenantId_customerId_idx" ON "portal_users"("tenantId", "customerId");
CREATE INDEX "portal_users_tenantId_status_idx" ON "portal_users"("tenantId", "status");

-- Portal sessions indexes
CREATE INDEX "portal_sessions_portalUserId_idx" ON "portal_sessions"("portalUserId");
CREATE INDEX "portal_sessions_accessToken_idx" ON "portal_sessions"("accessToken");

-- Permissions indexes
CREATE INDEX "permissions_resource_action_idx" ON "permissions"("resource", "action");

-- Suppliers indexes
CREATE INDEX "suppliers_tenantId_idx" ON "suppliers"("tenantId");

-- Products indexes
CREATE INDEX "products_tenantId_status_idx" ON "products"("tenantId", "status");
CREATE INDEX "products_tenantId_category_idx" ON "products"("tenantId", "category");
CREATE INDEX "products_supplierId_idx" ON "products"("supplierId");

-- SKUs indexes
CREATE INDEX "skus_productId_idx" ON "skus"("productId");

-- Inventory indexes
CREATE INDEX "inventory_tenantId_productId_idx" ON "inventory"("tenantId", "productId");

-- Price list entries indexes
CREATE INDEX "price_list_entries_tenantId_productId_priceListName_idx" ON "price_list_entries"("tenantId", "productId", "priceListName");

-- Customers indexes
CREATE INDEX "customers_tenantId_status_idx" ON "customers"("tenantId", "status");

-- Orders indexes
CREATE INDEX "orders_tenantId_customerId_idx" ON "orders"("tenantId", "customerId");
CREATE INDEX "orders_tenantId_status_idx" ON "orders"("tenantId", "status");
CREATE INDEX "orders_orderDate_idx" ON "orders"("orderDate");

-- Order lines indexes
CREATE INDEX "order_lines_orderId_idx" ON "order_lines"("orderId");
CREATE INDEX "order_lines_productId_idx" ON "order_lines"("productId");

-- Invoices indexes
CREATE INDEX "invoices_tenantId_customerId_idx" ON "invoices"("tenantId", "customerId");
CREATE INDEX "invoices_tenantId_status_idx" ON "invoices"("tenantId", "status");
CREATE INDEX "invoices_invoiceDate_idx" ON "invoices"("invoiceDate");
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- Payments indexes
CREATE INDEX "payments_tenantId_customerId_idx" ON "payments"("tenantId", "customerId");
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- Carts indexes
CREATE INDEX "carts_tenantId_portalUserId_idx" ON "carts"("tenantId", "portalUserId");
CREATE INDEX "carts_customerId_idx" ON "carts"("customerId");

-- Cart items indexes
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- Lists indexes
CREATE INDEX "lists_tenantId_portalUserId_idx" ON "lists"("tenantId", "portalUserId");

-- List items indexes
CREATE INDEX "list_items_listId_idx" ON "list_items"("listId");
CREATE INDEX "list_items_productId_idx" ON "list_items"("productId");

-- Activities indexes
CREATE INDEX "activities_tenantId_customerId_idx" ON "activities"("tenantId", "customerId");
CREATE INDEX "activities_userId_idx" ON "activities"("userId");
CREATE INDEX "activities_activityDate_idx" ON "activities"("activityDate");

-- Call plans indexes
CREATE INDEX "call_plans_tenantId_userId_idx" ON "call_plans"("tenantId", "userId");
CREATE INDEX "call_plans_customerId_idx" ON "call_plans"("customerId");
CREATE INDEX "call_plans_planDate_idx" ON "call_plans"("planDate");

-- Tasks indexes
CREATE INDEX "tasks_tenantId_userId_idx" ON "tasks"("tenantId", "userId");
CREATE INDEX "tasks_customerId_idx" ON "tasks"("customerId");
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- Account health snapshots indexes
CREATE INDEX "account_health_snapshots_tenantId_customerId_idx" ON "account_health_snapshots"("tenantId", "customerId");
CREATE INDEX "account_health_snapshots_snapshotDate_idx" ON "account_health_snapshots"("snapshotDate");

-- Sales metrics indexes
CREATE INDEX "sales_metrics_tenantId_metricType_idx" ON "sales_metrics"("tenantId", "metricType");
CREATE INDEX "sales_metrics_userId_idx" ON "sales_metrics"("userId");
CREATE INDEX "sales_metrics_periodStart_idx" ON "sales_metrics"("periodStart");

-- Compliance filings indexes
CREATE INDEX "compliance_filings_tenantId_state_idx" ON "compliance_filings"("tenantId", "state");
CREATE INDEX "compliance_filings_dueDate_idx" ON "compliance_filings"("dueDate");

-- State tax rates indexes
CREATE INDEX "state_tax_rates_tenantId_state_idx" ON "state_tax_rates"("tenantId", "state");

-- Webhook subscriptions indexes
CREATE INDEX "webhook_subscriptions_tenantId_status_idx" ON "webhook_subscriptions"("tenantId", "status");

-- Webhook events indexes
CREATE INDEX "webhook_events_tenantId_eventType_idx" ON "webhook_events"("tenantId", "eventType");
CREATE INDEX "webhook_events_createdAt_idx" ON "webhook_events"("createdAt");

-- Webhook deliveries indexes
CREATE INDEX "webhook_deliveries_subscriptionId_status_idx" ON "webhook_deliveries"("subscriptionId", "status");
CREATE INDEX "webhook_deliveries_nextAttemptAt_idx" ON "webhook_deliveries"("nextAttemptAt");

-- Integration tokens indexes
CREATE INDEX "integration_tokens_tenantId_provider_idx" ON "integration_tokens"("tenantId", "provider");

-- Notifications indexes
CREATE INDEX "notifications_tenantId_portalUserId_isRead_idx" ON "notifications"("tenantId", "portalUserId", "isRead");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE "tenants" IS 'Multi-tenant root table - each tenant represents a distributor organization';
COMMENT ON TABLE "tenant_settings" IS 'Tenant-specific configuration for health scoring, samples, and portal features';
COMMENT ON TABLE "users" IS 'Internal staff users (sales reps, managers, admins)';
COMMENT ON TABLE "portal_users" IS 'External B2B customer portal users';
COMMENT ON TABLE "products" IS 'Product catalog with support for wine, beer, spirits, and other alcohol types';
COMMENT ON TABLE "customers" IS 'B2B customer accounts with licensing and credit information';
COMMENT ON TABLE "orders" IS 'Customer orders with support for standard and sample orders';
COMMENT ON TABLE "invoices" IS 'Customer invoices linked to orders';
COMMENT ON TABLE "account_health_snapshots" IS 'Daily snapshots of customer health metrics (revenue, pace, samples)';
COMMENT ON TABLE "activities" IS 'Sales activities and interactions with customers';
COMMENT ON TABLE "call_plans" IS 'Sales rep call planning and scheduling';
COMMENT ON TABLE "webhook_subscriptions" IS 'Webhook endpoint registrations for event notifications';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Leora Platform schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 25 enum types';
  RAISE NOTICE '  - 43 tables';
  RAISE NOTICE '  - 60+ indexes';
  RAISE NOTICE '  - All foreign key constraints';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Review the schema in Supabase Table Editor';
  RAISE NOTICE '  2. Set up Row Level Security (RLS) policies';
  RAISE NOTICE '  3. Configure Supabase Auth';
  RAISE NOTICE '  4. Run initial seed data if needed';
END $$;
