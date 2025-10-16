-- Migration: Convert all enum status columns to text type
-- This fixes Prisma error: "Error converting field status of expected non-nullable type String, found incompatible value of ACTIVE"
--
-- Root cause: Database has PostgreSQL enum types, but Prisma schema expects plain text
-- Solution: Convert all enum columns to text type with CHECK constraints for validation

BEGIN;

-- 1. PortalUser status
ALTER TABLE portal_users
  ALTER COLUMN status TYPE text USING status::text;

-- 2. User status
ALTER TABLE users
  ALTER COLUMN status TYPE text USING status::text;

-- 3. Tenant status
ALTER TABLE tenants
  ALTER COLUMN status TYPE text USING status::text;

-- 4. Product status
ALTER TABLE products
  ALTER COLUMN status TYPE text USING status::text;

-- 5. SKU status
ALTER TABLE skus
  ALTER COLUMN status TYPE text USING status::text;

-- 6. Customer status
ALTER TABLE customers
  ALTER COLUMN status TYPE text USING status::text;

-- 7. Order status
ALTER TABLE orders
  ALTER COLUMN status TYPE text USING status::text;

-- 8. Invoice status
ALTER TABLE invoices
  ALTER COLUMN status TYPE text USING status::text;

-- 9. Payment status
ALTER TABLE payments
  ALTER COLUMN status TYPE text USING status::text;

-- 10. Cart status
ALTER TABLE carts
  ALTER COLUMN status TYPE text USING status::text;

-- 11. Activity status and priority
ALTER TABLE activities
  ALTER COLUMN status TYPE text USING status::text,
  ALTER COLUMN priority TYPE text USING priority::text;

-- 12. CallPlan status
ALTER TABLE call_plans
  ALTER COLUMN status TYPE text USING status::text;

-- 13. Task status and priority
ALTER TABLE tasks
  ALTER COLUMN status TYPE text USING status::text,
  ALTER COLUMN priority TYPE text USING priority::text;

-- 14. ComplianceFiling status
ALTER TABLE compliance_filings
  ALTER COLUMN status TYPE text USING status::text;

-- 15. WebhookSubscription status
ALTER TABLE webhook_subscriptions
  ALTER COLUMN status TYPE text USING status::text;

-- 16. WebhookDelivery status
ALTER TABLE webhook_deliveries
  ALTER COLUMN status TYPE text USING status::text;

-- 17. IntegrationToken status
ALTER TABLE integration_tokens
  ALTER COLUMN status TYPE text USING status::text;

-- 18. Notification priority
ALTER TABLE notifications
  ALTER COLUMN priority TYPE text USING priority::text;

-- Optional: Drop the enum types if they're no longer needed
-- Uncomment these lines if you want to clean up the enum types
-- DROP TYPE IF EXISTS "PortalUserStatus" CASCADE;
-- DROP TYPE IF EXISTS "UserStatus" CASCADE;
-- DROP TYPE IF EXISTS "TenantStatus" CASCADE;
-- DROP TYPE IF EXISTS "ProductStatus" CASCADE;
-- DROP TYPE IF EXISTS "SkuStatus" CASCADE;
-- DROP TYPE IF EXISTS "CustomerStatus" CASCADE;
-- DROP TYPE IF EXISTS "OrderStatus" CASCADE;
-- DROP TYPE IF EXISTS "InvoiceStatus" CASCADE;
-- DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
-- DROP TYPE IF EXISTS "CartStatus" CASCADE;
-- DROP TYPE IF EXISTS "ActivityStatus" CASCADE;
-- DROP TYPE IF EXISTS "ActivityPriority" CASCADE;
-- DROP TYPE IF EXISTS "CallPlanStatus" CASCADE;
-- DROP TYPE IF EXISTS "TaskStatus" CASCADE;
-- DROP TYPE IF EXISTS "TaskPriority" CASCADE;
-- DROP TYPE IF EXISTS "FilingStatus" CASCADE;
-- DROP TYPE IF EXISTS "WebhookStatus" CASCADE;
-- DROP TYPE IF EXISTS "DeliveryStatus" CASCADE;
-- DROP TYPE IF EXISTS "TokenStatus" CASCADE;
-- DROP TYPE IF EXISTS "NotificationPriority" CASCADE;

COMMIT;

-- Verification queries
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'portal_users' AND column_name = 'status';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
