# Database Schema Fix Plan

## Summary

The database schema uses **camelCase** columns, but the Prisma schema has `@map` directives converting to `snake_case`. This is backwards and causing errors.

## Current State

### Database Reality (camelCase)
- Tables: 76 total
- Columns use camelCase: `tenantId`, `createdAt`, `updatedAt`
- Data preserved: 21,215 customers, 1,937 products, 4,268 orders

### Prisma Schema Issues
- Has `@map` directives converting TO snake_case
- Expects many columns that don't exist in database
- Cannot query data due to column mismatches

## Solution Strategy

### Option 1: Add Missing Columns (RECOMMENDED)
Add all columns that Prisma expects but don't exist in the database. Keep camelCase naming.

**Pros:**
- Preserves all existing data
- Enables all Leora Platform features
- Future-proof

**Cons:**
- Adds ~50-100 columns across tables
- Takes 10-15 minutes

### Option 2: Strip Down Prisma Schema
Remove all @map directives and fields that don't exist from Prisma schema.

**Pros:**
- Quick fix (5 minutes)
- Minimal database changes

**Cons:**
- Loses planned Leora Platform features
- May need to add columns later anyway

## Recommended Approach: Option 1

Add missing columns in groups:

### Phase 1: Core Identity Tables
- `tenants`: Add domain, subscriptionTier, billingEmail, contactEmail, logoUrl, primaryColor
- `users`: Add passwordHash, firstName, lastName, fullName, phone, avatarUrl, status, emailVerified, emailVerifiedAt, failedLoginAttempts, lockedUntil, lastLoginAt, lastLoginIp
- `portal_users`: Verify all columns exist

### Phase 2: Product & Commerce
- `products`: Add description, region, imageUrl, images, alcoholType, isSample, metadata
- `inventory`: Add warehouseLocation, quantityReserved, quantityAvailable, reorderPoint, reorderQuantity, lastRestockedAt

### Phase 3: Orders & Invoices
- `orders`: Add requestedDeliveryDate, actualDeliveryDate, taxAmount, shippingAmount, discountAmount, totalAmount, billingAddress, internalNotes, isSampleOrder, createdBy, metadata
- `order_lines`: Verify/add missing columns

### Phase 4: Supporting Tables
- Create missing tables: roles, permissions, role_permissions (if using RBAC)
- Add metadata columns where missing

## Migration SQL Structure

```sql
-- Add missing columns to existing tables
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscriptionTier TEXT DEFAULT 'starter';
-- ... etc for each missing column

-- Set sensible defaults for new columns
UPDATE tenants SET subscriptionTier = 'starter' WHERE subscriptionTier IS NULL;

-- Verify data preservation
SELECT COUNT(*) FROM customers; -- Should be 21,215
SELECT COUNT(*) FROM products;  -- Should be 1,937
SELECT COUNT(*) FROM orders;    -- Should be 4,268
```

## Next Steps

1. Generate complete migration SQL
2. Review for safety
3. Apply to database
4. Regenerate Prisma client
5. Test queries

## Timeline

- Migration generation: 5 minutes
- Review: 5 minutes
- Execution: 2-3 minutes
- Testing: 5 minutes
- **Total: ~20 minutes**
