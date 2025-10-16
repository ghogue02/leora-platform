# Leora Platform Deployment Guide

This guide covers local development setup, Vercel deployment, database configuration, and post-deployment validation for the Leora platform.

---

## Prerequisites

Before deploying Leora, ensure you have:

- **Node.js** 20+ and **npm** 10+ installed
- **Supabase project** (existing project: `zqezunzlyjkseugujkrl`)
- **Vercel account** with CLI installed (`npm i -g vercel`)
- **Git** for version control
- **OpenAI API key** for Leora AI Copilot (GPT-5 access required)

---

## 1. Local Development Setup

### 1.1 Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd Leora

# Install dependencies
npm install

# This triggers prisma generate via postinstall script
```

### 1.2 Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` with the following required variables:

```bash
# Database (use pooled connection for serverless)
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require"

# Direct connection for migrations
DIRECT_URL="postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require"

# Generate a secure JWT secret (32+ characters)
JWT_SECRET="$(openssl rand -base64 32)"

# Tenant configuration
DEFAULT_TENANT_SLUG="well-crafted"
DEFAULT_PORTAL_USER_KEY="dev-portal-user"

# OpenAI API key for Leora AI Copilot
OPENAI_API_KEY="sk-proj-..."
```

**Security reminder**: Never commit `.env.local` to version control.

### 1.3 Database Migrations

```bash
# Apply all pending migrations to Supabase
npx prisma migrate deploy

# Generate Prisma client (if not already done)
npx prisma generate

# Verify database connection
npx prisma db pull
```

### 1.4 Seed Data (Optional)

```bash
# Seed Well Crafted tenant data
npm run seed

# Or use the dedicated script
npx ts-node scripts/seed-well-crafted-tenant.ts
```

**Note**: Well Crafted data already exists in Supabase. Only seed for fresh databases or test environments.

### 1.5 Start Development Server

```bash
# Run Next.js development server
npm run dev

# Server starts at http://localhost:3000
```

**Verify local setup**:
- Navigate to `http://localhost:3000/portal/login`
- Login with test credentials
- Check dashboard loads without errors

---

## 2. Vercel Deployment

### 2.1 Link Project to Vercel

```bash
# Login to Vercel
vercel login

# Link repository to Vercel project
vercel link

# Follow prompts to create or link existing project
```

### 2.2 Configure Environment Variables

Add all required secrets to Vercel:

```bash
# Core Database & Prisma
vercel env add DATABASE_URL production
# Paste: postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require

vercel env add DIRECT_URL production
# Paste: postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require

# Authentication & Security
vercel env add JWT_SECRET production
# Generate: openssl rand -base64 32

vercel env add JWT_ACCESS_EXPIRY production
# Value: 15m

vercel env add JWT_REFRESH_EXPIRY production
# Value: 7d

# Tenant Defaults
vercel env add DEFAULT_TENANT_SLUG production
# Value: well-crafted

vercel env add DEFAULT_PORTAL_USER_KEY production
# Value: dev-portal-user

# AI & OpenAI
vercel env add OPENAI_API_KEY production
# Paste your OpenAI API key (sk-proj-...)

vercel env add OPENAI_MODEL production
# Value: gpt-4-turbo-preview

# Supabase Credentials (client-side safe)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Value: https://zqezunzlyjkseugujkrl.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste anon key from .env.example

# NextAuth (when implemented)
vercel env add NEXTAUTH_URL production
# Value: https://your-domain.vercel.app

vercel env add NEXTAUTH_SECRET production
# Generate: openssl rand -base64 32
```

**Repeat for preview and development environments** as needed:

```bash
# Add to preview environment
vercel env add DATABASE_URL preview

# Add to development environment
vercel env add DATABASE_URL development
```

### 2.3 Configure Build Settings

In Vercel project settings (or `vercel.json`):

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "env": {
    "PRISMA_GENERATE_SKIP_POSTINSTALL": "false"
  }
}
```

**Build configuration notes**:
- Framework preset: **Next.js**
- Node version: **20.x** (set in Vercel dashboard)
- Root directory: `.` (default)

### 2.4 Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or trigger via Git push
git push origin main
# Vercel auto-deploys from main branch
```

### 2.5 Custom Domain Configuration

**In Vercel dashboard**:
1. Navigate to **Project Settings** → **Domains**
2. Add custom domain (e.g., `app.leora.io`)
3. Configure DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` environment variable to match custom domain

---

## 3. Database Setup

### 3.1 Run Migrations on Production

After first deployment:

```bash
# Connect to production environment
vercel env pull .env.production

# Run migrations against production database
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma migrate deploy
```

**Alternative**: Use Supabase CLI or SQL editor to apply migrations manually.

### 3.2 Enable Row-Level Security (RLS)

**Critical for production**: Enable RLS on all business tables per blueprint Section 4.2.

Execute in Supabase SQL Editor:

```sql
-- Enable RLS on core tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
-- Continue for all business tables...

-- Create tenant-scoped policies
CREATE POLICY "tenant_isolation" ON "Product"
  USING (current_setting('app.current_tenant_id')::uuid = "tenantId");

CREATE POLICY "tenant_isolation" ON "Order"
  USING (current_setting('app.current_tenant_id')::uuid = "tenantId");

-- Add policies for portal user access
CREATE POLICY "portal_user_access" ON "Order"
  USING (
    current_setting('app.current_tenant_id')::uuid = "tenantId"
    AND "customerId" IN (
      SELECT "customerId" FROM "PortalUser"
      WHERE id = current_setting('app.current_portal_user_id')::uuid
    )
  );
```

**Reference**: See `docs/database/supabase-schema-overview.md` for complete table list.

### 3.3 Seed Production Data (If Needed)

```bash
# Connect to production environment
vercel env pull .env.production

# Run seed script
npm run seed
```

**Note**: Well Crafted data already exists. Only seed if database is empty or for new tenants.

### 3.4 Verify Database Connection

```bash
# Test Prisma connection to production database
npx prisma db pull

# Check schema matches deployed migrations
npx prisma migrate status
```

---

## 4. Post-Deployment Checklist

### 4.1 Smoke Tests

**Test these critical user flows** after deployment:

#### Login & Authentication
```bash
# Navigate to login page
curl -I https://your-domain.vercel.app/portal/login

# Expected: 200 OK
```

**Manual test**:
1. Visit `/portal/login`
2. Enter valid credentials
3. Verify redirect to `/portal/dashboard`
4. Check JWT cookies set correctly

#### Dashboard
```bash
# Test dashboard API
curl -H "Cookie: access_token=..." https://your-domain.vercel.app/api/sales/dashboard

# Expected: JSON with metrics
```

**Manual test**:
1. Navigate to `/portal/dashboard`
2. Verify metrics load (or show "no data" messaging)
3. Check Leora AI briefing appears (if configured)

#### Orders & Invoices
**Manual test**:
1. Visit `/portal/orders`
2. Verify order list loads from Supabase
3. Click order detail → verify data displays
4. Visit `/portal/invoices`
5. Verify invoice list and payment status

### 4.2 Health Checks

Create an API health check endpoint for monitoring:

```typescript
// app/api/health/route.ts
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Environment variables
    const envCheck = {
      database: !!process.env.DATABASE_URL,
      jwt: !!process.env.JWT_SECRET,
      openai: !!process.env.OPENAI_API_KEY,
    };

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envCheck,
    });
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    );
  }
}
```

**Test health endpoint**:
```bash
curl https://your-domain.vercel.app/api/health
```

### 4.3 AI Copilot Verification

**Test Leora AI Copilot** (blueprint Section 1.4):

```bash
# Test chat API
curl -X POST https://your-domain.vercel.app/api/leora/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{"message": "Show customers who slipped pace this week"}'

# Expected: JSON response with GPT-5 analysis
```

**Manual test**:
1. Navigate to dashboard or chat interface
2. Type query: "Show sell-through by region last 30 days"
3. Verify GPT-5 response with real Supabase data
4. Check fallback messaging if data missing

### 4.4 Webhook Worker Setup

Deploy the webhook delivery worker (blueprint Section 5.3):

**Option A: Vercel Cron**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/webhook-delivery",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Option B: Supabase Scheduler**

```sql
-- Create Supabase cron job
SELECT cron.schedule(
  'webhook-delivery-worker',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-domain.vercel.app/api/workers/webhook-delivery',
    headers := '{"Authorization": "Bearer <token>"}'::jsonb
  );
  $$
);
```

**Verify worker execution**:
```bash
# Check webhook delivery logs
curl -H "Cookie: access_token=..." https://your-domain.vercel.app/api/admin/webhooks/deliveries?status=pending
```

---

## 5. Troubleshooting

### 5.1 Common Errors

#### Build Failures

**Error**: `Prisma schema not found`

```bash
# Solution: Ensure prisma generate runs during build
npm run build

# Check Vercel build logs for prisma generate output
```

**Error**: `Cannot find module '@prisma/client'`

```bash
# Solution: Add to package.json postinstall
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

#### Runtime Errors

**Error**: `P1001: Can't reach database server`

```bash
# Solution: Verify DATABASE_URL environment variable
vercel env ls

# Check Supabase connection string includes ?sslmode=require
# Verify Vercel IPs are allowed in Supabase network policies
```

**Error**: `401 Unauthorized` on protected routes

```bash
# Solution: Check JWT_SECRET matches between environments
vercel env get JWT_SECRET production

# Verify access_token cookie is set correctly
# Check cookie SameSite and Secure flags
```

### 5.2 Database Connection Issues

**Problem**: Migrations fail with SSL errors

```bash
# Solution: Add SSL mode to connection string
DATABASE_URL="...postgres?sslmode=require"

# Or disable SSL verification for development
DATABASE_URL="...postgres?sslmode=no-verify"
```

**Problem**: Connection pool exhausted

```bash
# Solution: Use Supabase connection pooler
DATABASE_URL="postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"

# Increase pool size in Supabase dashboard if needed
```

### 5.3 JWT & Authentication Problems

**Problem**: Token verification fails after deployment

```bash
# Solution: Ensure JWT_SECRET is identical across environments
vercel env pull .env.production
grep JWT_SECRET .env.production

# Regenerate all tokens if secret changed
# Force users to re-login
```

**Problem**: Refresh token rotation broken

```bash
# Solution: Check refresh token expiry and cookie settings
# Verify /api/portal/auth/refresh endpoint works

curl -X POST https://your-domain.vercel.app/api/portal/auth/refresh \
  -H "Cookie: refresh_token=..."

# Check Set-Cookie headers in response
```

### 5.4 OpenAI API Issues

**Problem**: Leora AI copilot returns errors

```bash
# Solution: Verify OpenAI API key is valid
vercel env get OPENAI_API_KEY production

# Test API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits and billing status
```

**Problem**: GPT-5 responses timeout

```bash
# Solution: Increase timeout in OpenAI client wrapper
# Implement streaming responses
# Add retry logic with exponential backoff

# Check Vercel function timeout settings (default 10s, max 300s)
```

### 5.5 Debugging Tools

**Enable debug logging**:

```bash
# Add to Vercel environment
vercel env add DEBUG production
# Value: true

# Check logs
vercel logs --follow
```

**Prisma query logging**:

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

**API error monitoring**:

```bash
# Install Sentry (optional)
npm install @sentry/nextjs

# Configure in next.config.js
# Add SENTRY_DSN to environment variables
```

---

## 6. Rollback & Recovery

### 6.1 Rollback Deployment

```bash
# List recent deployments
vercel ls

# Promote previous deployment to production
vercel promote <deployment-url>
```

### 6.2 Database Rollback

```bash
# Undo last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Reapply previous migration
npx prisma migrate deploy
```

**Note**: Always test rollback procedures in staging first.

---

## 7. Performance Optimization

### 7.1 Vercel Configuration

```json
// vercel.json
{
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

### 7.2 Database Optimization

```bash
# Enable Prisma connection pooling
# Use pgBouncer via Supabase connection pooler

# Create indexes for common queries
CREATE INDEX idx_orders_tenant_customer ON "Order"("tenantId", "customerId");
CREATE INDEX idx_products_tenant_active ON "Product"("tenantId", "isActive");
```

---

## 8. Monitoring & Maintenance

### 8.1 Uptime Monitoring

Set up Vercel monitoring or external service (e.g., UptimeRobot):

- Monitor: `https://your-domain.vercel.app/api/health`
- Check interval: 5 minutes
- Alert on 5xx errors or >5s response time

### 8.2 Database Backups

**Supabase automatic backups**:
- Daily automatic backups (retained 7 days on free tier)
- Manual backups via Supabase dashboard
- Point-in-time recovery (paid plans)

### 8.3 Log Retention

```bash
# View recent Vercel logs
vercel logs --since 24h

# Export logs for analysis
vercel logs --output json > logs.json
```

---

## 9. Security Hardening

### 9.1 Environment Variables

- Rotate `JWT_SECRET` every 90 days
- Store all secrets in Vercel environment (never commit)
- Use separate secrets for production/preview/development
- Audit environment variable access regularly

### 9.2 Database Security

- Enable RLS on all tables (Section 3.2)
- Use least-privilege database users
- Regularly review RLS policies
- Enable Supabase audit logging

### 9.3 API Security

- Implement rate limiting on auth endpoints
- Add CSRF protection for mutations
- Enable CORS only for trusted origins
- Sanitize all user inputs

---

## 10. Support & Resources

**Documentation**:
- Leora Platform Blueprint: `/docs/leora-platform-blueprint.md`
- Supabase Credentials: `/docs/SUPABASE-CREDENTIALS.md`
- User Portal Design: `/docs/user-portal/`

**External Resources**:
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

**Getting Help**:
- Check Vercel deployment logs
- Review Supabase database logs
- Test locally with production environment variables
- Use `npx prisma studio` to inspect database state

---

**Deployment complete!** Follow the post-deployment checklist to verify all systems operational.
