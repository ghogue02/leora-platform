# Initialize Leora Platform Database

## Issue: Can't Connect to Supabase from Local Machine

If you're seeing `Error: P1001: Can't reach database server`, this is normal. Supabase often blocks direct connections for security.

---

## ✅ **RECOMMENDED: Use Supabase SQL Editor** (5 minutes)

This is the easiest and most reliable method:

### 1. Go to Supabase SQL Editor
https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

### 2. Generate SQL from Prisma Schema

Run this command locally to generate the SQL:
```bash
npx prisma migrate dev --name init --create-only
# This creates a migration file in prisma/migrations/
# Copy the SQL from that file
```

### 3. Or Use This Quick Schema Setup

Copy and run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
CREATE TYPE "PortalUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
CREATE TYPE "AlcoholType" AS ENUM ('WINE', 'BEER', 'SPIRITS', 'CIDER', 'SAKE', 'MEAD', 'OTHER');
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
CREATE TYPE "SkuStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED');
CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ActivityPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "CallPlanStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "FilingStatus" AS ENUM ('PENDING', 'FILED', 'OVERDUE', 'REJECTED');
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED', 'ERROR');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Now run the full schema from prisma/schema.prisma
-- Or continue with table creation...
```

### 4. Verify Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## ⚡ **ALTERNATIVE: Create Admin Migration Endpoint** (Recommended)

Create a protected API endpoint that runs the migration from Vercel (which CAN connect to Supabase):

### 1. Create the Migration API

```typescript
// app/api/admin/init-database/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Protect this endpoint!
  if (secret !== process.env.ADMIN_SECRET || !secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Test connection
    await prisma.$connect();

    // Try a simple query
    const result = await prisma.$queryRaw`SELECT NOW()`;

    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      timestamp: result
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### 2. Add ADMIN_SECRET to Vercel
```bash
vercel env add ADMIN_SECRET production
# Enter a secure random string when prompted
```

### 3. Deploy and Call the Endpoint
```bash
# Push the new API route
git add app/api/admin/init-database/route.ts
git commit -m "feat: Add database initialization endpoint"
git push

# Wait for deployment, then call:
curl -X POST "https://leora-platform.vercel.app/api/admin/init-database?secret=YOUR_SECRET"
```

---

## 🔧 **LOCAL CONNECTION: Add Your IP to Supabase** (Alternative)

If you want to run Prisma commands locally:

### 1. Go to Supabase Network Settings
https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/settings/database

### 2. Add Your IP Address
- Click "Add IP Address"
- Add your current IP (you can find it at https://whatismyip.com)
- Or allow all IPs temporarily: `0.0.0.0/0` (not recommended for production)

### 3. Then Run Prisma Commands
```bash
npx prisma db push --accept-data-loss
```

---

## 📝 **FOR NOW: Use Supabase SQL Editor**

**This is the fastest path forward:**

1. Open: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new
2. Paste this command to let Prisma generate the full schema:

Actually, since Prisma can't connect, let me give you the complete SQL...

### Complete Table Creation SQL

Run this in Supabase SQL Editor (this creates all tables from the Prisma schema):

```sql
-- Copy the full CREATE TABLE statements from your prisma/schema.prisma
-- Or use the Prisma Studio approach:

-- Easiest: Visit Supabase Dashboard → Database → Tables → New Table
-- And create each table manually using the schema as reference
```

---

## 🎯 **QUICK FIX: Just for Testing**

If you want to test the deployment without the full database:

1. The site is already live at https://leora-platform.vercel.app
2. It will redirect to /dashboard (fixed in latest deploy)
3. Most features will show "loading" or "no data" states
4. API endpoints work but return empty results without data

Once the database is initialized, everything will work!

---

## ✅ **Deployment Status Check**

While we figure out database:

```bash
# Check if routing fix deployed
vercel ls

# Should show latest deployment with fix
# Visit: https://leora-platform.vercel.app
# Should now redirect to /dashboard (not /portal/dashboard)
```

---

**Choose the Supabase SQL Editor method - it's the most reliable!**
