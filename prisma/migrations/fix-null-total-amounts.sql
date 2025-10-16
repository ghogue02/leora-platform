-- ============================================================================
-- Migration: Fix NULL totals for commerce tables
-- Purpose:
--   * Backfill NULL monetary columns introduced before NOT NULL constraint
--   * Enforce NOT NULL + sane defaults so Prisma decimal mappings stop failing
-- Context:
--   API dashboard requests are currently failing with:
--     Error converting field "totalAmount" of expected non-nullable type "Decimal", found incompatible value of "null"
--   This happens because older seed/imported data left NULL totals in orders,
--   order_lines, invoices, and carts. Prisma expects non-null decimals and
--   aborts queries even when performing simple counts/aggregations.
-- Safety:
--   * Updates compute totals from existing numeric components when possible.
--   * Defaults are only applied where the underlying domain already assumes zero.
-- ============================================================================+

BEGIN;

-- ----------------------------------------------------------------------------
-- Orders: ensure subtotal components exist before fixing totals
-- ----------------------------------------------------------------------------
UPDATE orders
SET
  "subtotal" = COALESCE("subtotal", 0),
  "taxAmount" = COALESCE("taxAmount", 0),
  "shippingAmount" = COALESCE("shippingAmount", 0),
  "discountAmount" = COALESCE("discountAmount", 0),
  "totalAmount" = COALESCE(
    "totalAmount",
    COALESCE("subtotal", 0)
    + COALESCE("taxAmount", 0)
    + COALESCE("shippingAmount", 0)
    - COALESCE("discountAmount", 0)
  )
WHERE
  "totalAmount" IS NULL
  OR "subtotal" IS NULL
  OR "taxAmount" IS NULL
  OR "shippingAmount" IS NULL
  OR "discountAmount" IS NULL;

ALTER TABLE orders
  ALTER COLUMN "subtotal" SET NOT NULL,
  ALTER COLUMN "taxAmount" SET DEFAULT 0,
  ALTER COLUMN "taxAmount" SET NOT NULL,
  ALTER COLUMN "shippingAmount" SET DEFAULT 0,
  ALTER COLUMN "shippingAmount" SET NOT NULL,
  ALTER COLUMN "discountAmount" SET DEFAULT 0,
  ALTER COLUMN "discountAmount" SET NOT NULL,
  ALTER COLUMN "totalAmount" SET NOT NULL;

-- ----------------------------------------------------------------------------
-- Order Lines
-- ----------------------------------------------------------------------------
UPDATE order_lines
SET
  quantity = COALESCE(quantity, 0),
  "unitPrice" = COALESCE("unitPrice", 0),
  subtotal = COALESCE(subtotal, COALESCE("unitPrice", 0) * COALESCE(quantity, 0)),
  "taxAmount" = COALESCE("taxAmount", 0),
  "discountAmount" = COALESCE("discountAmount", 0),
  "totalAmount" = COALESCE(
    "totalAmount",
    COALESCE(subtotal, 0)
    + COALESCE("taxAmount", 0)
    - COALESCE("discountAmount", 0)
  )
WHERE
  "totalAmount" IS NULL
  OR subtotal IS NULL
  OR "taxAmount" IS NULL
  OR "discountAmount" IS NULL
  OR quantity IS NULL
  OR "unitPrice" IS NULL;

ALTER TABLE order_lines
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN "unitPrice" SET NOT NULL,
  ALTER COLUMN subtotal SET NOT NULL,
  ALTER COLUMN "taxAmount" SET DEFAULT 0,
  ALTER COLUMN "taxAmount" SET NOT NULL,
  ALTER COLUMN "discountAmount" SET DEFAULT 0,
  ALTER COLUMN "discountAmount" SET NOT NULL,
  ALTER COLUMN "totalAmount" SET NOT NULL;

-- ----------------------------------------------------------------------------
-- Invoices
-- ----------------------------------------------------------------------------
UPDATE invoices
SET
  subtotal = COALESCE(subtotal, 0),
  "taxAmount" = COALESCE("taxAmount", 0),
  "shippingAmount" = COALESCE("shippingAmount", 0),
  "discountAmount" = COALESCE("discountAmount", 0),
  "paidAmount" = COALESCE("paidAmount", 0),
  "balanceDue" = COALESCE(
    "balanceDue",
    COALESCE(subtotal, 0)
    + COALESCE("taxAmount", 0)
    + COALESCE("shippingAmount", 0)
    - COALESCE("discountAmount", 0)
    - COALESCE("paidAmount", 0)
  ),
  "totalAmount" = COALESCE(
    "totalAmount",
    COALESCE(subtotal, 0)
    + COALESCE("taxAmount", 0)
    + COALESCE("shippingAmount", 0)
    - COALESCE("discountAmount", 0)
  )
WHERE
  "totalAmount" IS NULL
  OR subtotal IS NULL
  OR "taxAmount" IS NULL
  OR "shippingAmount" IS NULL
  OR "discountAmount" IS NULL
  OR "paidAmount" IS NULL
  OR "balanceDue" IS NULL;

ALTER TABLE invoices
  ALTER COLUMN subtotal SET NOT NULL,
  ALTER COLUMN "taxAmount" SET DEFAULT 0,
  ALTER COLUMN "taxAmount" SET NOT NULL,
  ALTER COLUMN "shippingAmount" SET DEFAULT 0,
  ALTER COLUMN "shippingAmount" SET NOT NULL,
  ALTER COLUMN "discountAmount" SET DEFAULT 0,
  ALTER COLUMN "discountAmount" SET NOT NULL,
  ALTER COLUMN "paidAmount" SET DEFAULT 0,
  ALTER COLUMN "paidAmount" SET NOT NULL,
  ALTER COLUMN "balanceDue" SET NOT NULL,
  ALTER COLUMN "totalAmount" SET NOT NULL;

-- ----------------------------------------------------------------------------
-- Carts: totals should always exist, default zero
-- ----------------------------------------------------------------------------
UPDATE carts
SET
  subtotal = COALESCE(subtotal, 0),
  "taxAmount" = COALESCE("taxAmount", 0),
  "shippingAmount" = COALESCE("shippingAmount", 0),
  "discountAmount" = COALESCE("discountAmount", 0),
  "totalAmount" = COALESCE(
    "totalAmount",
    COALESCE(subtotal, 0)
    + COALESCE("taxAmount", 0)
    + COALESCE("shippingAmount", 0)
    - COALESCE("discountAmount", 0)
  )
WHERE
  subtotal IS NULL
  OR "taxAmount" IS NULL
  OR "shippingAmount" IS NULL
  OR "discountAmount" IS NULL
  OR "totalAmount" IS NULL;

ALTER TABLE carts
  ALTER COLUMN subtotal SET DEFAULT 0,
  ALTER COLUMN subtotal SET NOT NULL,
  ALTER COLUMN "taxAmount" SET DEFAULT 0,
  ALTER COLUMN "taxAmount" SET NOT NULL,
  ALTER COLUMN "shippingAmount" SET DEFAULT 0,
  ALTER COLUMN "shippingAmount" SET NOT NULL,
  ALTER COLUMN "discountAmount" SET DEFAULT 0,
  ALTER COLUMN "discountAmount" SET NOT NULL,
  ALTER COLUMN "totalAmount" SET DEFAULT 0,
  ALTER COLUMN "totalAmount" SET NOT NULL;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT table_name, column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('orders', 'order_lines', 'invoices', 'carts')
--   AND is_nullable = 'YES'
--   AND column_name IN (
--     'subtotal', 'taxAmount', 'shippingAmount', 'discountAmount', 'totalAmount',
--     'paidAmount', 'balanceDue'
--   );
