# Leora Platform - Post-Deployment Steps

## ✅ Deployment Complete!

Your Leora platform is now live at:
- **Production**: https://leora-platform.vercel.app
- **Alternate**: https://leora-platform-gregs-projects-61e51c01.vercel.app
- **GitHub**: https://github.com/ghogue02/leora-platform

---

## 🗄️ Database Setup (Critical - Do This Now!)

The database schema needs to be initialized. Choose ONE of these methods:

### Method 1: Use Prisma Studio (Recommended for First Time)

```bash
# Connect to Supabase database
npx prisma studio
# This will open a GUI at http://localhost:5555
# You can manually inspect the database and create the first tenant
```

### Method 2: Run Migrations from Local Machine

If you have network access to Supabase from your local machine:

```bash
# Ensure .env.local has DIRECT_URL
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require" \
DIRECT_URL="postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require" \
npx prisma migrate dev --name init
```

### Method 3: Use Supabase SQL Editor

1. Go to https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl
2. Navigate to SQL Editor
3. Run the schema creation script from `/prisma/schema.prisma` manually
4. Or use the SQL commands from `/docs/database/MIGRATION-GUIDE.md`

### Method 4: Run Migration from Vercel Deployment

Create a serverless function to run migrations:

```bash
# Create app/api/admin/migrate/route.ts
# Add authentication check
# Run: npx prisma migrate deploy
# Then call: curl -X POST https://leora-platform.vercel.app/api/admin/migrate
```

---

## 🌱 Seed Well Crafted Tenant Data

Once the schema is set up, seed the first tenant:

```bash
# Update the seed script with actual data
npm run db:seed

# Or create tenant manually via Prisma Studio
# Or use Supabase SQL Editor to insert tenant records
```

---

## 🔐 Enable Row-Level Security (RLS)

For production security, enable RLS on all tables. See `/docs/database/MIGRATION-GUIDE.md` for complete SQL scripts.

Quick start:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- (See full list in MIGRATION-GUIDE.md)

-- Example policy for tenants table
CREATE POLICY "Users can only see their tenant"
  ON tenants FOR SELECT
  USING (id = current_setting('app.current_tenant_id', true)::text);

-- Example policy for portal users
CREATE POLICY "Portal users can only see their own data"
  ON portal_users FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::text
    AND id = current_setting('app.current_portal_user_id', true)::text
  );
```

---

## ✅ Post-Deployment Checklist

### 1. **Verify Site is Live**
- [ ] Visit https://leora-platform.vercel.app
- [ ] Check homepage loads
- [ ] Check /dashboard redirects properly

### 2. **Test Authentication**
- [ ] Create a test portal user (via Prisma Studio or Supabase)
- [ ] Try logging in at /login
- [ ] Verify JWT tokens are set in cookies
- [ ] Test /api/portal/auth/me endpoint

### 3. **Test Core Features**
- [ ] Products page loads
- [ ] Can add items to cart
- [ ] Can view cart
- [ ] Can create order
- [ ] Dashboard shows metrics

### 4. **Test AI Copilot**
- [ ] Visit /leora (AI chat page)
- [ ] Send a test message
- [ ] Verify GPT-5 API key is working
- [ ] Check response is generated

### 5. **Monitor Deployment**
```bash
# Check deployment logs
vercel logs https://leora-platform.vercel.app --follow

# Check function logs
vercel logs https://leora-platform.vercel.app/api/portal/auth/login

# Monitor errors
# Visit: https://vercel.com/gregs-projects-61e51c01/leora-platform/logs
```

### 6. **Performance & Monitoring**
- [ ] Check Vercel Analytics dashboard
- [ ] Verify API response times < 1s
- [ ] Check database query performance
- [ ] Monitor OpenAI API usage

---

## 🚨 Troubleshooting

### Site Shows 500 Error
1. Check Vercel logs: `vercel logs <URL> --follow`
2. Verify all environment variables are set
3. Check database connection (DATABASE_URL)
4. Verify Prisma Client was generated during build

### Database Connection Errors
1. Verify Supabase project is running
2. Check DATABASE_URL format and credentials
3. Try connection from Prisma Studio
4. Check Supabase logs for connection attempts

### Authentication Not Working
1. Verify JWT_SECRET is set in Vercel
2. Check cookies are being set (DevTools > Application > Cookies)
3. Test /api/portal/auth/login directly
4. Verify database has portal_users table

### AI Chat Not Responding
1. Verify OPENAI_API_KEY is set correctly
2. Check OpenAI API key is valid: https://platform.openai.com/api-keys
3. Check Vercel function logs for /api/leora/chat
4. Verify function timeout is set to 60s

---

## 📊 Monitoring Commands

```bash
# List all deployments
vercel ls

# Get deployment details
vercel inspect <deployment-url>

# View logs
vercel logs <deployment-url> --follow

# View environment variables
vercel env ls production

# Redeploy
vercel --prod

# Rollback to previous deployment
vercel rollback <previous-deployment-url>
```

---

## 🔄 Database Migrations Workflow

For future schema changes:

```bash
# 1. Make schema changes locally in prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_feature_x

# 3. Test locally
npm run dev

# 4. Commit and push
git add prisma/
git commit -m "feat: Add feature X schema"
git push

# 5. Vercel will auto-deploy
# Migrations run automatically via postinstall hook
```

---

## 📞 Support & Resources

- **Deployment Guide**: `/docs/deployment/DEPLOYMENT-GUIDE.md`
- **Migration Guide**: `/docs/database/MIGRATION-GUIDE.md`
- **API Documentation**: `/docs/api/`
- **Build Summary**: `/docs/BUILD-SUMMARY.md`
- **GitHub**: https://github.com/ghogue02/leora-platform
- **Vercel Dashboard**: https://vercel.com/gregs-projects-61e51c01/leora-platform

---

## 🎯 Next Actions

1. **Set up database schema** - Use Supabase SQL Editor or Prisma Studio
2. **Enable RLS policies** - Copy from MIGRATION-GUIDE.md
3. **Seed Well Crafted tenant** - Run seed script or manual insert
4. **Create test portal user** - For testing login flow
5. **Test all features** - Follow checklist above

---

**The platform is deployed and ready - you just need to initialize the database!**
