-- Leora Platform - Row Level Security (RLS) Policies
-- Multi-tenant data isolation using app.current_tenant_id session parameter
-- Apply these policies after running Prisma migrations

-- ============================================================================
-- HELPER FUNCTION: Get Current Tenant ID from Session
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TENANTS & SETTINGS
-- ============================================================================

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Allow viewing own tenant
CREATE POLICY tenant_select_own ON tenants
  FOR SELECT
  USING (id = get_current_tenant_id());

-- Tenant settings - must match tenant
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_settings_all ON tenant_settings
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- USERS & ROLES
-- ============================================================================

-- Users table - tenant scoped
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_all ON users
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Roles - system-wide but can reference tenant context
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_select_all ON roles
  FOR SELECT
  USING (true); -- Roles visible across system

CREATE POLICY roles_modify_own_tenant ON roles
  FOR INSERT
  USING (true); -- Insert allowed if tenant context set

-- User roles - tenant scoped via user relation
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_all ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_roles.user_id
      AND users.tenant_id = get_current_tenant_id()
    )
  );

-- Permissions - system-wide
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY permissions_select_all ON permissions
  FOR SELECT
  USING (true);

-- Role permissions - system-wide
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_permissions_select_all ON role_permissions
  FOR SELECT
  USING (true);

-- ============================================================================
-- PORTAL USERS
-- ============================================================================

-- Portal users - tenant scoped
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_users_all ON portal_users
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Portal user roles
ALTER TABLE portal_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_user_roles_all ON portal_user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = portal_user_roles.portal_user_id
      AND portal_users.tenant_id = get_current_tenant_id()
    )
  );

-- Portal sessions
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_sessions_all ON portal_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = portal_sessions.portal_user_id
      AND portal_users.tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================================
-- PRODUCTS & INVENTORY
-- ============================================================================

-- Products - tenant scoped
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_all ON products
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- SKUs - tenant scoped
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;

CREATE POLICY skus_all ON skus
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Inventory - tenant scoped via product relation
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_all ON inventory
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Price list entries - tenant scoped
ALTER TABLE price_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_list_entries_all ON price_list_entries
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- CUSTOMERS & SUPPLIERS
-- ============================================================================

-- Customers - tenant scoped
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_all ON customers
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Suppliers - currently no tenant_id, system-wide
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select_all ON suppliers
  FOR SELECT
  USING (true);

CREATE POLICY suppliers_modify_all ON suppliers
  FOR INSERT
  USING (true);

-- ============================================================================
-- ORDERS & INVOICES
-- ============================================================================

-- Orders - tenant scoped
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_all ON orders
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Order lines - scoped via order relation
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_lines_all ON order_lines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_lines.order_id
      AND orders.tenant_id = get_current_tenant_id()
    )
  );

-- Invoices - tenant scoped
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_all ON invoices
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Payments - tenant scoped
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_all ON payments
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- CART & LISTS
-- ============================================================================

-- Carts - tenant scoped
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY carts_all ON carts
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Cart items - scoped via cart relation
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY cart_items_all ON cart_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.tenant_id = get_current_tenant_id()
    )
  );

-- Lists - tenant scoped
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY lists_all ON lists
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- List items - scoped via list relation
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY list_items_all ON list_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================================
-- INTELLIGENCE: ACTIVITIES & METRICS
-- ============================================================================

-- Activities - tenant scoped
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY activities_all ON activities
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Call plans - tenant scoped
ALTER TABLE call_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY call_plans_all ON call_plans
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Tasks - tenant scoped
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_all ON tasks
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Account health snapshots - tenant scoped
ALTER TABLE account_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_health_snapshots_all ON account_health_snapshots
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Sales metrics - tenant scoped
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_metrics_all ON sales_metrics
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- COMPLIANCE
-- ============================================================================

-- Compliance filings - tenant scoped
ALTER TABLE compliance_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_filings_all ON compliance_filings
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- State tax rates - tenant scoped
ALTER TABLE state_tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY state_tax_rates_all ON state_tax_rates
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

-- Webhook subscriptions - tenant scoped
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_subscriptions_all ON webhook_subscriptions
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Webhook events - tenant scoped
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_all ON webhook_events
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Webhook deliveries - scoped via subscription relation
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_deliveries_all ON webhook_deliveries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM webhook_subscriptions
      WHERE webhook_subscriptions.id = webhook_deliveries.subscription_id
      AND webhook_subscriptions.tenant_id = get_current_tenant_id()
    )
  );

-- Integration tokens - tenant scoped
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_tokens_all ON integration_tokens
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notifications - tenant scoped
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_all ON notifications
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- To apply these policies to Supabase:
-- 1. Run Prisma migrations: `npx prisma migrate deploy`
-- 2. Execute this SQL file: `psql $DATABASE_URL -f prisma/rls-policies.sql`
-- 3. Test tenant isolation by setting session parameter:
--    SET app.current_tenant_id = 'your-tenant-id';
--    SELECT * FROM products; -- Should only return tenant's products
-- 4. Verify policies are enabled:
--    SELECT schemaname, tablename, policyname
--    FROM pg_policies
--    WHERE schemaname = 'public';
