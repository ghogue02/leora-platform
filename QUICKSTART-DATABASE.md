# 🚀 Leora Database - 5-Minute Setup

## ⚡ Fastest Path to Get Your Site Working

Your platform is deployed at **https://leora-platform.vercel.app** but needs the database initialized.

---

## 📝 **OPTION 1: Supabase SQL Editor** (Recommended - 5 minutes)

### Step 1: Open Supabase SQL Editor
Go to: **https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new**

### Step 2: Copy & Run the Init SQL
Open the file: **`prisma/supabase-init.sql`** (being generated now)

Copy the entire contents and paste into the SQL Editor.

Click **"Run"** or press `Cmd+Enter`

### Step 3: Verify Tables Created
Run this query to check:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see ~20+ tables (tenants, users, portal_users, products, orders, etc.)

### Step 4: Create First Tenant (Well Crafted)
```sql
-- Insert tenant
INSERT INTO tenants (id, slug, name, status, created_at, updated_at)
VALUES (
  'well-crafted-' || gen_random_uuid()::text,
  'well-crafted',
  'Well Crafted',
  'ACTIVE',
  NOW(),
  NOW()
);

-- Insert tenant settings
INSERT INTO tenant_settings (
  id, tenant_id, default_currency, timezone, date_format,
  revenue_health_drop_percent, minimum_orders_for_health,
  default_sample_allowance_per_rep, require_manager_approval_above,
  minimum_orders_for_pace_calc, pace_risk_threshold_days,
  portal_enabled, cart_enabled, invoice_visibility,
  created_at, updated_at
)
VALUES (
  gen_random_uuid()::text,
  (SELECT id FROM tenants WHERE slug = 'well-crafted'),
  'USD',
  'America/Los_Angeles',
  'MM/DD/YY',
  15.00,
  3,
  60,
  60,
  3,
  2,
  true,
  true,
  true,
  NOW(),
  NOW()
);
```

### Step 5: Create Test Portal User
```sql
-- Create a test user (password: password123)
INSERT INTO portal_users (
  id, tenant_id, email, password_hash,
  first_name, last_name, full_name,
  status, email_verified, email_verified_at,
  created_at, updated_at
)
VALUES (
  gen_random_uuid()::text,
  (SELECT id FROM tenants WHERE slug = 'well-crafted'),
  'demo@wellcrafted.com',
  '$2a$10$N9qo8uLOickgx2ZE.Z6.YeZ5YsOqPqIwdCqZpqJmQjPtPvSmUZmua',
  'Demo',
  'User',
  'Demo User',
  'ACTIVE',
  true,
  NOW(),
  NOW(),
  NOW()
);
```

### Step 6: Test Your Site!
Go to: **https://leora-platform.vercel.app**

- Should redirect to `/dashboard`
- Try logging in: `demo@wellcrafted.com` / `password123`
- Browse products, cart, orders
- Test AI chat at `/leora`

---

## 🔐 **OPTION 2: Admin API Endpoint** (If you prefer automation)

I've created `/api/admin/init-database` but the secret needs to be available.

The secret is: `DYZlOA5A0pXFynuvt2HGdy5zcMt3Vo6HZNhjkjom9UA=`

Once the latest deployment finishes, run:

```bash
curl -X POST \
  "https://leora-platform.vercel.app/api/admin/init-database?secret=DYZlOA5A0pXFynuvt2HGdy5zcMt3Vo6HZNhjkjom9UA=" \
  -H "Content-Type: application/json"
```

This will run `prisma db push` from Vercel's network.

---

## 🎯 **Recommended: Use Supabase SQL Editor**

It's the most reliable method since:
- ✅ Direct database access (no network issues)
- ✅ Visual feedback
- ✅ Can review before executing
- ✅ See results immediately
- ✅ No dependencies on API endpoints

---

## ✅ **After Database Init**

Once tables are created:

1. **Visit site**: https://leora-platform.vercel.app
2. **Login**: demo@wellcrafted.com / password123
3. **Test features**:
   - Dashboard (should show empty state)
   - Products (add test products via Supabase)
   - Cart (add items, checkout)
   - Orders (create test order)
   - AI Chat (ask Leora a question)

4. **Add real data**:
   - Products via Supabase Table Editor
   - Customers via Supabase
   - Or use the seed script (if local DB connection works later)

---

**The SQL file `prisma/supabase-init.sql` is being generated now!**
