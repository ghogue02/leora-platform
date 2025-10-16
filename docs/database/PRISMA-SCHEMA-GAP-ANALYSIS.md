# Prisma Schema Gap Analysis
## Columns Defined in Prisma That May Not Exist in Supabase

This document identifies all Prisma schema fields that may not exist in the actual Supabase database, organized by table.

**Key Assumption**: The actual Supabase database uses camelCase column names (e.g., `tenantId`, `createdAt`) without snake_case mapping.

---

## 1. Tenant (tenants)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| subscriptionTier | subscription_tier | String | No | 'starter' | @map directive |
| billingEmail | billing_email | String | Yes | NULL | @map directive |
| contactEmail | contact_email | String | Yes | NULL | @map directive |
| logoUrl | logo_url | String | Yes | NULL | @map directive |
| primaryColor | primary_color | String | Yes | NULL | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 7 columns need snake_case versions created

---

## 2. TenantSettings (tenant_settings)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| tenantId | tenant_id | String | No | - | FK, @map directive |
| defaultCurrency | default_currency | String | No | 'USD' | @map directive |
| dateFormat | date_format | String | No | 'MM/DD/YY' | @map directive |
| revenueHealthDropPercent | revenue_health_drop_percent | Decimal(5,2) | No | 15 | @map directive |
| minimumOrdersForHealth | minimum_orders_for_health | Int | No | 3 | @map directive |
| defaultSampleAllowancePerRep | default_sample_allowance_per_rep | Int | No | 60 | @map directive |
| requireManagerApprovalAbove | require_manager_approval_above | Int | No | 60 | @map directive |
| minimumOrdersForPaceCalc | minimum_orders_for_pace_calc | Int | No | 3 | @map directive |
| paceRiskThresholdDays | pace_risk_threshold_days | Int | No | 2 | @map directive |
| portalEnabled | portal_enabled | Boolean | No | true | @map directive |
| cartEnabled | cart_enabled | Boolean | No | true | @map directive |
| invoiceVisibility | invoice_visibility | Boolean | No | true | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 14 columns need snake_case versions created

---

## 3. User (users)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| tenantId | tenant_id | String | No | - | FK, @map directive |
| passwordHash | password_hash | String | Yes | NULL | @map directive |
| firstName | first_name | String | Yes | NULL | @map directive |
| lastName | last_name | String | Yes | NULL | @map directive |
| fullName | full_name | String | Yes | NULL | @map directive |
| avatarUrl | avatar_url | String | Yes | NULL | @map directive |
| emailVerified | email_verified | Boolean | No | false | @map directive |
| emailVerifiedAt | email_verified_at | DateTime | Yes | NULL | @map directive |
| failedLoginAttempts | failed_login_attempts | Int | No | 0 | @map directive |
| lockedUntil | locked_until | DateTime | Yes | NULL | @map directive |
| lastLoginAt | last_login_at | DateTime | Yes | NULL | @map directive |
| lastLoginIp | last_login_ip | String | Yes | NULL | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 14 columns need snake_case versions created

---

## 4. PortalUser (portal_users)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| tenantId | tenant_id | String | No | - | FK, @map directive |
| customerId | customer_id | String | Yes | NULL | FK, @map directive |
| passwordHash | password_hash | String | Yes | NULL | @map directive |
| firstName | first_name | String | Yes | NULL | @map directive |
| lastName | last_name | String | Yes | NULL | @map directive |
| fullName | full_name | String | Yes | NULL | @map directive |
| emailVerified | email_verified | Boolean | No | false | @map directive |
| emailVerifiedAt | email_verified_at | DateTime | Yes | NULL | @map directive |
| failedLoginAttempts | failed_login_attempts | Int | No | 0 | @map directive |
| lockedUntil | locked_until | DateTime | Yes | NULL | @map directive |
| lastLoginAt | last_login_at | DateTime | Yes | NULL | @map directive |
| lastLoginIp | last_login_ip | String | Yes | NULL | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 14 columns need snake_case versions created

---

## 5. Product (products)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| tenantId | tenant_id | String | No | - | FK, @map directive |
| supplierId | supplier_id | String | Yes | NULL | FK, @map directive |
| alcoholType | alcohol_type | AlcoholType | Yes | NULL | @map directive, ENUM |
| alcoholPercent | alcohol_percent | Decimal(5,2) | Yes | NULL | @map directive |
| imageUrl | image_url | String | Yes | NULL | @map directive |
| isSample | is_sample | Boolean | No | false | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 8 columns need snake_case versions created

---

## 6. Customer (customers)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| tenantId | tenant_id | String | No | - | FK, @map directive |
| accountNumber | account_number | String | Yes | NULL | @map directive |
| companyName | company_name | String | No | - | @map directive |
| tradeName | trade_name | String | Yes | NULL | @map directive |
| primaryContactName | primary_contact_name | String | Yes | NULL | @map directive |
| primaryContactEmail | primary_contact_email | String | Yes | NULL | @map directive |
| primaryContactPhone | primary_contact_phone | String | Yes | NULL | @map directive |
| billingAddress | billing_address | Json | Yes | NULL | @map directive |
| shippingAddress | shipping_address | Json | Yes | NULL | @map directive |
| licenseNumber | license_number | String | Yes | NULL | @map directive |
| licenseState | license_state | String | Yes | NULL | @map directive |
| licenseExpiry | license_expiry | DateTime | Yes | NULL | @map directive |
| paymentTerms | payment_terms | String | Yes | NULL | @map directive |
| creditLimit | credit_limit | Decimal(10,2) | Yes | NULL | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 16 columns need snake_case versions created

---

## 7. Order (orders)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| tenantId | tenant_id | String | No | - | FK, @map directive |
| customerId | customer_id | String | No | - | FK, @map directive |
| portalUserId | portal_user_id | String | Yes | NULL | FK, @map directive |
| orderNumber | order_number | String | No | - | @map directive, UNIQUE |
| poNumber | po_number | String | Yes | NULL | @map directive |
| orderDate | order_date | DateTime | No | now() | @map directive |
| requestedDeliveryDate | requested_delivery_date | DateTime | Yes | NULL | @map directive |
| actualDeliveryDate | actual_delivery_date | DateTime | Yes | NULL | @map directive |
| taxAmount | tax_amount | Decimal(10,2) | No | 0 | @map directive |
| shippingAmount | shipping_amount | Decimal(10,2) | No | 0 | @map directive |
| discountAmount | discount_amount | Decimal(10,2) | No | 0 | @map directive |
| totalAmount | total_amount | Decimal(10,2) | No | - | @map directive |
| shippingAddress | shipping_address | Json | Yes | NULL | @map directive |
| billingAddress | billing_address | Json | Yes | NULL | @map directive |
| internalNotes | internal_notes | String | Yes | NULL | @map directive |
| isSampleOrder | is_sample_order | Boolean | No | false | @map directive |
| createdBy | created_by | String | Yes | NULL | FK, @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 19 columns need snake_case versions created

---

## 8. OrderLine (order_lines)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| orderId | order_id | String | No | - | FK, @map directive |
| productId | product_id | String | No | - | FK, @map directive |
| lineNumber | line_number | Int | No | - | @map directive |
| unitPrice | unit_price | Decimal(10,2) | No | - | @map directive |
| taxAmount | tax_amount | Decimal(10,2) | No | 0 | @map directive |
| discountAmount | discount_amount | Decimal(10,2) | No | 0 | @map directive |
| totalAmount | total_amount | Decimal(10,2) | No | - | @map directive |
| appliedPricingRules | applied_pricing_rules | Json | Yes | NULL | @map directive |
| isSample | is_sample | Boolean | No | false | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 11 columns need snake_case versions created

---

## 9. Invoice (invoices)

| Prisma Field | Expected DB Column | Data Type | Nullable | Default | Notes |
|--------------|-------------------|-----------|----------|---------|-------|
| tenantId | tenant_id | String | No | - | FK, @map directive |
| customerId | customer_id | String | No | - | FK, @map directive |
| orderId | order_id | String | Yes | NULL | FK, @map directive |
| invoiceNumber | invoice_number | String | No | - | @map directive, UNIQUE |
| invoiceDate | invoice_date | DateTime | No | now() | @map directive |
| dueDate | due_date | DateTime | No | - | @map directive |
| paidDate | paid_date | DateTime | Yes | NULL | @map directive |
| taxAmount | tax_amount | Decimal(10,2) | No | 0 | @map directive |
| shippingAmount | shipping_amount | Decimal(10,2) | No | 0 | @map directive |
| discountAmount | discount_amount | Decimal(10,2) | No | 0 | @map directive |
| totalAmount | total_amount | Decimal(10,2) | No | - | @map directive |
| paidAmount | paid_amount | Decimal(10,2) | No | 0 | @map directive |
| balanceDue | balance_due | Decimal(10,2) | No | - | @map directive |
| createdAt | created_at | DateTime | No | now() | @map directive |
| updatedAt | updated_at | DateTime | No | now() (auto) | @map directive |

**Impact**: 15 columns need snake_case versions created

---

## Summary Statistics

### Total Impact by Table

| Table | Total Fields | Fields Needing Migration | Percentage |
|-------|-------------|-------------------------|------------|
| Tenant | 12 | 7 | 58% |
| TenantSettings | 17 | 14 | 82% |
| User | 17 | 14 | 82% |
| PortalUser | 17 | 14 | 82% |
| Product | 18 | 8 | 44% |
| Customer | 21 | 16 | 76% |
| Order | 25 | 19 | 76% |
| OrderLine | 14 | 11 | 79% |
| Invoice | 19 | 15 | 79% |

### Critical Foreign Keys

All foreign key columns need snake_case versions:
- `tenant_id` (in almost all tables)
- `customer_id` (in orders, invoices, etc.)
- `user_id` (in activities, tasks, etc.)
- `product_id` (in order_lines, cart_items, etc.)
- `portal_user_id` (in orders, carts, etc.)

### Pattern Analysis

**Most Common Missing Patterns:**
1. **Timestamps**: `created_at`, `updated_at` (in ALL tables)
2. **Foreign Keys**: All `*_id` fields need snake_case
3. **Status Fields**: `email_verified`, `is_sample`, etc.
4. **Amount Fields**: `tax_amount`, `total_amount`, `discount_amount`
5. **Contact Info**: `first_name`, `last_name`, `full_name`

### Data Type Considerations

**Special attention needed for:**
1. **Enums**: Need to verify enum type creation in Supabase
   - `TenantStatus`, `UserStatus`, `PortalUserStatus`
   - `AlcoholType`, `ProductStatus`, `OrderStatus`
   - `InvoiceStatus`, `PaymentStatus`, etc.

2. **Decimal Fields**: Precision must match
   - `Decimal(10,2)` for amounts
   - `Decimal(5,2)` for percentages
   - `Decimal(5,4)` for tax rates

3. **Json Fields**: Type compatibility
   - `preferences`, `metadata`, `billing_address`, etc.

---

## Recommended Migration Strategy

### Phase 1: Add Missing Columns (Safe, Non-Breaking)
```sql
-- For each table, add snake_case columns while keeping camelCase
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email TEXT;
-- etc.
```

### Phase 2: Data Sync (Optional)
```sql
-- Update snake_case columns from camelCase if they exist
UPDATE tenants SET subscription_tier = "subscriptionTier" WHERE "subscriptionTier" IS NOT NULL;
```

### Phase 3: Update Prisma Config
```prisma
// Remove @map directives after confirming snake_case columns exist
// OR keep them for backward compatibility
```

### Phase 4: Testing
1. Verify Prisma Client generates correctly
2. Test all CRUD operations
3. Verify indexes work on new columns
4. Check foreign key constraints

---

## Next Steps

1. **Review actual database schema** using:
   ```sql
   SELECT * FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name IN ('tenants', 'users', 'portal_users', 'products', 'customers', 'orders', 'order_lines', 'invoices')
   ORDER BY table_name, ordinal_position;
   ```

2. **Generate ALTER TABLE statements** for missing columns

3. **Create migration SQL file** with all necessary changes

4. **Test migration** in development environment first

5. **Run migration** in production with backup

---

## Risk Assessment

**Low Risk:**
- Adding new columns with defaults (non-breaking)
- Creating indexes on new columns

**Medium Risk:**
- Enum type creation (may conflict if different enums exist)
- Foreign key constraints on new columns

**High Risk:**
- Removing old camelCase columns (breaking change - DON'T DO THIS)
- Changing existing column types

**Recommendation:** Add snake_case columns alongside existing camelCase columns for zero-downtime migration.
