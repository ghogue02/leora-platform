# Database Security & Row-Level Security (RLS)

Security configuration for Leora Platform's multi-tenant Supabase PostgreSQL database.

## Overview

The Leora Platform implements a **shared schema, multi-tenant architecture** with security enforced through:

1. **Row-Level Security (RLS)** - PostgreSQL policies for data isolation
2. **Session Parameters** - `app.current_tenant_id` for tenant context
3. **Prisma Middleware** - Automatic tenant injection in queries
4. **API Middleware** - Request validation and tenant resolution

---

## Row-Level Security (RLS)

### What is RLS?

Row-Level Security is a PostgreSQL feature that restricts which rows can be returned by SELECT queries, inserted by INSERT, updated by UPDATE, or deleted by DELETE commands based on policies.

### Benefits

- ✅ Defense in depth (database-level security)
- ✅ Prevents cross-tenant data leakage
- ✅ Protects against SQL injection
- ✅ Enforced even if application logic has bugs
- ✅ Required for Supabase production deployments

---

## Enabling RLS

### Step 1: Enable RLS on All Tables

Run this SQL against your Supabase database:

```sql
-- Enable RLS on core tenant tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on portal tables
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on commerce tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on intelligence tables
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on compliance tables
ALTER TABLE compliance_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_tax_rates ENABLE ROW LEVEL SECURITY;

-- Enable RLS on integration tables
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
```

### Step 2: Verify RLS Status

```sql
-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: `rowsecurity = true` for all business tables.

---

## Creating RLS Policies

### Tenant Isolation Policies

These policies ensure users only see data for their tenant.

#### Basic Tenant Policy Template

```sql
-- Example: Products table
CREATE POLICY tenant_isolation ON products
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
```

#### Comprehensive Policy Set

```sql
-- Tenants table (users can only see their own tenant)
CREATE POLICY tenant_isolation ON tenants
  USING (id::text = current_setting('app.current_tenant_id', true));

-- Users table
CREATE POLICY tenant_isolation ON users
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Products table
CREATE POLICY tenant_isolation ON products
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Orders table
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Invoices table
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Activities table
CREATE POLICY tenant_isolation ON activities
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Webhook subscriptions
CREATE POLICY tenant_isolation ON webhook_subscriptions
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
```

### Portal User Policies

For tables accessed by portal users (customers), add additional scoping:

```sql
-- Portal users can only see their own data
CREATE POLICY portal_user_isolation ON portal_users
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    AND (
      id::text = current_setting('app.current_portal_user_id', true)
      OR current_setting('app.current_user_role', true) = 'admin'
    )
  );

-- Orders: Portal users see only their company's orders
CREATE POLICY portal_order_access ON orders
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    AND (
      customer_id IN (
        SELECT company_id FROM portal_users
        WHERE id::text = current_setting('app.current_portal_user_id', true)
      )
      OR current_setting('app.current_user_role', true) IN ('admin', 'sales_rep')
    )
  );

-- Invoices: Portal users see only their company's invoices
CREATE POLICY portal_invoice_access ON invoices
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    AND (
      customer_id IN (
        SELECT company_id FROM portal_users
        WHERE id::text = current_setting('app.current_portal_user_id', true)
      )
      OR current_setting('app.current_user_role', true) IN ('admin', 'sales_rep')
    )
  );
```

### Write Policies

By default, policies apply to SELECT. Add INSERT/UPDATE/DELETE policies:

```sql
-- Allow inserts for same tenant
CREATE POLICY tenant_insert ON products
  FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Allow updates for same tenant
CREATE POLICY tenant_update ON products
  FOR UPDATE
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Allow deletes for same tenant
CREATE POLICY tenant_delete ON products
  FOR DELETE
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
```

### Admin Bypass Policies

For system operations, create policies that allow bypass with service role:

```sql
-- Service role bypass (use with SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY service_role_bypass ON products
  USING (current_user = 'service_role');

-- Apply to all tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE '_prisma_%'
  LOOP
    EXECUTE format(
      'CREATE POLICY service_role_bypass ON %I USING (current_user = ''service_role'')',
      tbl.tablename
    );
  END LOOP;
END $$;
```

---

## Session Parameters

### Setting Tenant Context

The application sets session parameters before executing queries:

```sql
-- Set current tenant
SELECT set_config('app.current_tenant_id', 'uuid-of-tenant', false);

-- Set current portal user (for portal endpoints)
SELECT set_config('app.current_portal_user_id', 'uuid-of-portal-user', false);

-- Set current user role (for role-based policies)
SELECT set_config('app.current_user_role', 'admin', false);
```

### Prisma Integration

The `lib/prisma.ts` helper automatically sets tenant context:

```typescript
// Automatic tenant injection
export async function withTenant(tenantId: string, callback: Function) {
  await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
  return callback();
}

// Usage in API routes
export async function GET(request: Request) {
  const tenantId = getTenantIdFromRequest(request);

  return withTenant(tenantId, async () => {
    const products = await prisma.product.findMany();
    // RLS automatically filters by tenant_id
    return Response.json(products);
  });
}
```

---

## Testing RLS Policies

### Manual Testing

```sql
-- Test as specific tenant
SELECT set_config('app.current_tenant_id', 'tenant-1-uuid', false);
SELECT * FROM products;
-- Should only return tenant-1's products

-- Test as different tenant
SELECT set_config('app.current_tenant_id', 'tenant-2-uuid', false);
SELECT * FROM products;
-- Should only return tenant-2's products

-- Test without tenant context
SELECT set_config('app.current_tenant_id', '', false);
SELECT * FROM products;
-- Should return nothing (or error)
```

### Automated Testing

Create a test script:

```sql
-- test-rls-policies.sql

DO $$
DECLARE
  tenant1 UUID := '550e8400-e29b-41d4-a716-446655440000';
  tenant2 UUID := '550e8400-e29b-41d4-a716-446655440001';
  product_count INT;
BEGIN
  -- Set tenant 1 context
  PERFORM set_config('app.current_tenant_id', tenant1::text, false);

  -- Count products (should only see tenant 1)
  SELECT COUNT(*) INTO product_count FROM products;
  RAISE NOTICE 'Tenant 1 sees % products', product_count;

  -- Set tenant 2 context
  PERFORM set_config('app.current_tenant_id', tenant2::text, false);

  -- Count products (should only see tenant 2)
  SELECT COUNT(*) INTO product_count FROM products;
  RAISE NOTICE 'Tenant 2 sees % products', product_count;

  -- Clear context
  PERFORM set_config('app.current_tenant_id', '', false);

  -- Count products (should see nothing)
  SELECT COUNT(*) INTO product_count FROM products;
  RAISE NOTICE 'No tenant context sees % products', product_count;

  IF product_count > 0 THEN
    RAISE EXCEPTION 'RLS policy failed: data visible without tenant context';
  END IF;

  RAISE NOTICE 'All RLS tests passed!';
END $$;
```

---

## Security Best Practices

### 1. Always Enable RLS in Production

**Before going live:**
```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

If any tables show `rowsecurity = false`, enable RLS immediately.

### 2. Never Use Service Role Key Client-Side

```typescript
// ❌ NEVER DO THIS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Bypasses RLS!
);

// ✅ CORRECT (client-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // RLS enforced
);
```

### 3. Test Every Policy

For each policy, verify:
- ✅ Users see only their tenant's data
- ✅ Users cannot see other tenants' data
- ✅ Users cannot modify other tenants' data
- ✅ Policies work for INSERT, UPDATE, DELETE
- ✅ Portal users see only their company's data

### 4. Audit Policy Changes

```sql
-- Log all policy changes
CREATE TABLE policy_audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'CREATE', 'ALTER', 'DROP'
  changed_by TEXT DEFAULT current_user,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to log policy changes
CREATE OR REPLACE FUNCTION log_policy_changes()
RETURNS event_trigger AS $$
BEGIN
  -- Log policy creation/modification
  INSERT INTO policy_audit_log (table_name, policy_name, action)
  SELECT
    objid::regclass::text,
    command_tag,
    'CREATE'
  FROM pg_event_trigger_ddl_commands();
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER log_policy_ddl
ON ddl_command_end
WHEN TAG IN ('CREATE POLICY', 'ALTER POLICY', 'DROP POLICY')
EXECUTE FUNCTION log_policy_changes();
```

### 5. Regular Security Audits

Schedule quarterly reviews:
- Review all RLS policies
- Test policy effectiveness
- Check for policy bypasses
- Audit service role usage
- Review tenant isolation
- Verify no data leakage

---

## Migration Strategy

### Enabling RLS on Existing Production Database

**⚠️ CRITICAL: Test thoroughly in staging first!**

#### Phase 1: Enable RLS (No Policies)

```sql
-- Enable RLS without policies (allows all access temporarily)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create permissive policy
CREATE POLICY allow_all ON products USING (true);
```

#### Phase 2: Test Application

- Verify all queries still work
- Check for performance impact
- Monitor error logs

#### Phase 3: Add Tenant Policies

```sql
-- Add tenant isolation policy
CREATE POLICY tenant_isolation ON products
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Remove permissive policy
DROP POLICY allow_all ON products;
```

#### Phase 4: Validate

```sql
-- Test queries with different tenants
SELECT set_config('app.current_tenant_id', 'tenant-1-uuid', false);
SELECT * FROM products; -- Should only see tenant 1 data

SELECT set_config('app.current_tenant_id', 'tenant-2-uuid', false);
SELECT * FROM products; -- Should only see tenant 2 data
```

#### Phase 5: Repeat for All Tables

Gradually enable RLS on all tables, one at a time, with thorough testing between each.

---

## Troubleshooting

### Issue: Queries Return No Data

**Symptom:** Queries return empty results even though data exists

**Cause:** Tenant context not set or incorrect

**Fix:**
```typescript
// Ensure tenant context is set
await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;

// Verify context
const result = await prisma.$queryRaw`SELECT current_setting('app.current_tenant_id', true)`;
console.log('Current tenant:', result);
```

### Issue: "Insufficient Privileges" Error

**Symptom:** `permission denied for table products`

**Cause:** RLS enabled but no policies grant access

**Fix:**
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'products';

-- Add missing policy
CREATE POLICY tenant_isolation ON products
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
```

### Issue: Performance Degradation

**Symptom:** Queries slow after enabling RLS

**Cause:** Policies may need index optimization

**Fix:**
```sql
-- Add index on tenant_id if not exists
CREATE INDEX CONCURRENTLY idx_products_tenant_id ON products(tenant_id);

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM products
WHERE tenant_id::text = current_setting('app.current_tenant_id', true);
```

---

## Emergency Procedures

### Disable RLS (Emergency Only)

**⚠️ USE ONLY IN CRITICAL PRODUCTION INCIDENTS**

```sql
-- Temporarily disable RLS on a table
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Re-enable after incident resolved
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

Document in incident report:
- Why RLS was disabled
- How long it was disabled
- What data was potentially exposed
- Steps taken to prevent recurrence

---

## Compliance & Auditing

### PCI/HIPAA/SOC2 Requirements

If handling sensitive data:

1. **Enable audit logging**
```sql
-- Log all data access
ALTER TABLE products ADD COLUMN accessed_at TIMESTAMP;
ALTER TABLE products ADD COLUMN accessed_by TEXT;
```

2. **Implement change tracking**
```sql
-- Track all modifications
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT,
  record_id UUID,
  action TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

3. **Regular access reviews**
- Weekly: Review service role usage
- Monthly: Audit policy effectiveness
- Quarterly: External security assessment

---

**Last Updated**: 2025-10-15
**Version**: 1.0.0
**Security Review Date**: Pre-production
