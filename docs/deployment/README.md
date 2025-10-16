# Leora Platform - Deployment Guide

Comprehensive deployment documentation for the Leora Platform on Vercel with Supabase backend.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Vercel Deployment](#vercel-deployment)
5. [Post-Deployment Validation](#post-deployment-validation)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

- **Node.js** 20.x or later
- **npm** 10.x or later
- **Vercel CLI** (`npm install -g vercel@latest`)
- **Git** for version control
- **PostgreSQL client** (optional, for database operations)

### Required Access

- Vercel account with project access
- Supabase project credentials (see `docs/SUPABASE-CREDENTIALS.md`)
- OpenAI API key for Leora AI features
- GitHub repository access for CI/CD

### Environment Files

- `.env.example` - Template with all variables
- `.env.local` - Local development (never commit)
- Vercel environment variables - Set via CLI or dashboard

---

## Environment Setup

### Quick Setup Script

Use the automated setup script:

```bash
./scripts/deployment/setup-vercel.sh
```

This interactive script will guide you through setting all required environment variables.

### Manual Setup

For manual configuration, see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for detailed documentation of each variable.

#### Required Variables

```bash
# Core Database
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:PASSWORD@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:PASSWORD@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"

# Security
JWT_SECRET="your-32-character-secret"

# Tenant Configuration
DEFAULT_TENANT_SLUG="well-crafted"
DEFAULT_PORTAL_USER_KEY="dev-portal-user"

# AI Features
OPENAI_API_KEY="sk-proj-your-key"
```

#### Setting Variables via Vercel CLI

```bash
# Add production secret
vercel env add DATABASE_URL production

# Add preview secret
vercel env add JWT_SECRET preview

# List all variables
vercel env ls

# Remove a variable
vercel env rm VARIABLE_NAME production
```

---

## Database Configuration

### Prisma Migrations

#### Development Workflow

```bash
# Create a new migration
npx prisma migrate dev --name description_of_changes

# Generate Prisma Client
npx prisma generate

# Reset database (development only)
npx prisma migrate reset
```

#### Production Deployment

Migrations are automatically run during deployment via GitHub Actions:

```yaml
- name: Run Database Migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

Manual deployment:

```bash
# Deploy pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Resolve migration issues
npx prisma migrate resolve --applied "migration_name"
```

### Row-Level Security (RLS)

Before production deployment, enable RLS policies:

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Create tenant isolation policies
CREATE POLICY tenant_isolation ON products
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
```

See [DATABASE_SECURITY.md](./DATABASE_SECURITY.md) for complete RLS setup.

---

## Vercel Deployment

### Initial Setup

1. **Link Project to Vercel**

```bash
vercel link
```

2. **Configure Build Settings**

The `vercel.json` configuration is already set up with:
- Next.js 15 framework detection
- Function timeouts (30s API, 60s AI, 300s workers)
- Cron jobs for background tasks
- Security headers

3. **Deploy to Preview**

```bash
vercel
```

4. **Deploy to Production**

```bash
vercel --prod
```

### Deployment Environments

#### Production
- **Branch**: `main`
- **URL**: `https://leora.vercel.app`
- **Auto-deploy**: On push to main
- **Features**: All enabled, RLS enforced

#### Staging
- **Branch**: `staging`
- **URL**: `https://leora-staging.vercel.app`
- **Auto-deploy**: On push to staging
- **Features**: All enabled, test data

#### Preview
- **Branch**: Feature branches
- **URL**: Auto-generated per PR
- **Auto-deploy**: On PR creation/update
- **Features**: Development mode

### GitHub Actions Workflow

The deployment pipeline automatically:

1. **Linting & Type Checking** - Validates code quality
2. **Database Schema Check** - Ensures migrations are ready
3. **Unit Tests** - Runs test suite
4. **Build** - Compiles Next.js application
5. **Deploy** - Pushes to Vercel
6. **Validate** - Runs post-deployment health checks

See [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) for complete workflow.

---

## Post-Deployment Validation

### Automated Validation

Run the validation script after deployment:

```bash
npm run validate:deployment
```

This checks:
- Health endpoint responsiveness
- Database connectivity
- Auth endpoints availability
- API endpoints functionality
- Static asset loading
- Environment configuration

### Manual Smoke Testing

1. **Authentication Flow**
   - Visit `/portal/auth/login`
   - Test login with demo credentials
   - Verify session persistence

2. **Dashboard Access**
   - Navigate to `/portal/dashboard`
   - Confirm metrics load
   - Check Leora AI briefing

3. **Data Operations**
   - View orders at `/portal/orders`
   - Check invoice details
   - Test search functionality

4. **API Health**
   - GET `/api/health` → Should return `{ status: "healthy" }`
   - GET `/api/health/database` → Should return `{ connected: true }`

### Monitoring Dashboards

- **Vercel Dashboard**: Runtime logs, function invocations
- **Supabase Dashboard**: Database queries, connection pool
- **Sentry** (if configured): Error tracking
- **PostHog** (if configured): User analytics

---

## Monitoring & Observability

### Built-in Monitoring

#### Health Endpoints

```bash
# Application health
curl https://leora.vercel.app/api/health

# Database health
curl https://leora.vercel.app/api/health/database

# Configuration check
curl https://leora.vercel.app/api/health/config
```

#### Vercel Logs

```bash
# Tail production logs
vercel logs --follow

# View specific function logs
vercel logs --function=api/portal/auth/login

# Filter by time range
vercel logs --since=1h
```

### Performance Monitoring

- **Function Duration**: Monitor via Vercel dashboard
- **Database Query Time**: Check Supabase metrics
- **AI Token Usage**: Logged in application (see logs)

### Alerting

Set up alerts for:
- High error rates (>5%)
- Slow response times (>2s p95)
- Database connection failures
- AI API quota exceeded

---

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: Prisma client not generated

```bash
# Solution: Ensure postinstall script runs
npm run postinstall
npx prisma generate
```

**Issue**: TypeScript errors

```bash
# Solution: Check types
npm run typecheck
```

#### Runtime Errors

**Issue**: Database connection timeout

```bash
# Check connection string format
# Ensure pooler URL for serverless
# Verify Supabase project is accessible
```

**Issue**: 401 Unauthorized on all API requests

```bash
# Verify JWT_SECRET is set in Vercel
vercel env ls production | grep JWT_SECRET

# Check auth middleware configuration
```

#### Deployment Issues

**Issue**: Environment variables not loading

```bash
# Re-add variables
vercel env add VARIABLE_NAME production

# Force rebuild
vercel --prod --force
```

### Debug Checklist

- [ ] Check Vercel deployment logs
- [ ] Verify all required env vars are set
- [ ] Confirm database connectivity
- [ ] Review Prisma schema migrations
- [ ] Check function timeout limits
- [ ] Validate API routes with curl
- [ ] Review error logs in Sentry
- [ ] Confirm RLS policies don't block queries

---

## Rollback Procedures

### Vercel Rollback

#### Via Dashboard
1. Go to Vercel project → Deployments
2. Find previous successful deployment
3. Click "⋯" → "Promote to Production"

#### Via CLI
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback DEPLOYMENT_URL
```

### Database Rollback

**⚠️ Critical: Always backup before migrations**

#### Rollback Migration

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back "migration_name"

# Manually restore from backup
pg_restore -d DATABASE_URL backup.sql
```

#### Emergency Recovery

1. **Stop incoming traffic**: Disable domain in Vercel
2. **Restore database**: Use Supabase point-in-time recovery
3. **Deploy known-good version**: Rollback to previous deployment
4. **Verify functionality**: Run validation script
5. **Resume traffic**: Re-enable domain

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

---

## Support & Contacts

- **Technical Issues**: Check troubleshooting section above
- **Infrastructure**: Review Vercel/Supabase dashboards
- **Security Concerns**: Follow incident response procedures
- **Documentation Updates**: Submit PR to this guide

**Last Updated**: 2025-10-15
**Version**: 1.0.0
