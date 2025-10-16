# Leora Platform - Production Deployment Runbook

Complete step-by-step guide for deploying Leora to production.

## Pre-Deployment Checklist

### 1. Code Review & Testing

- [ ] All tests passing locally (`npm run test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code reviewed and approved
- [ ] PR merged to `main` branch
- [ ] Database migrations tested on staging
- [ ] AI features tested with valid API key
- [ ] Authentication flows verified
- [ ] Critical user paths smoke tested

### 2. Environment Verification

- [ ] All required environment variables set in Vercel
- [ ] Database credentials verified (connection test)
- [ ] JWT secret generated and secured
- [ ] OpenAI API key validated
- [ ] Supabase RLS policies enabled
- [ ] Backup of current database created
- [ ] Monitoring dashboards accessible

### 3. Communication

- [ ] Deployment window scheduled
- [ ] Stakeholders notified
- [ ] Status page updated (if applicable)
- [ ] Rollback plan documented
- [ ] On-call engineer assigned

---

## Deployment Process

### Phase 1: Pre-Deployment (T-30 minutes)

#### 1.1 Create Database Backup

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or via PostgreSQL client
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

Store backup securely and note the timestamp.

#### 1.2 Verify Database State

```bash
# Check migration status
npx prisma migrate status

# Verify schema integrity
npx prisma validate

# Check for pending migrations
git log --oneline prisma/migrations/
```

#### 1.3 Review Deployment Configuration

```bash
# Verify Vercel configuration
cat vercel.json

# Check environment variables
vercel env ls production

# Review GitHub Actions workflow
cat .github/workflows/deploy.yml
```

### Phase 2: Deployment (T-0)

#### 2.1 Trigger Deployment

**Option A: Automatic (via Git Push)**

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Push will trigger GitHub Actions
git push origin main
```

**Option B: Manual (via Vercel CLI)**

```bash
# Link to project
vercel link

# Pull environment configuration
vercel pull --environment=production

# Build locally
vercel build --prod

# Deploy
vercel deploy --prebuilt --prod
```

#### 2.2 Monitor Deployment

```bash
# Watch deployment logs
vercel logs --follow

# Or monitor GitHub Actions
# Visit: https://github.com/your-org/leora/actions
```

Watch for:
- ✅ Build completion
- ✅ Migration execution
- ✅ Function deployment
- ⚠️ Any error logs

#### 2.3 Database Migration Execution

Migrations run automatically during deployment via GitHub Actions:

```yaml
- name: Run Database Migrations
  run: npx prisma migrate deploy
```

If manual intervention needed:

```bash
# SSH into Vercel (if possible) or run locally against production DB
npx prisma migrate deploy
```

**⚠️ Migration Monitoring:**
- Watch for lock timeouts
- Check for constraint violations
- Verify all migrations applied
- Monitor query performance during migration

### Phase 3: Validation (T+5 minutes)

#### 3.1 Automated Validation

```bash
# Run post-deployment validation script
npm run validate:deployment
```

Expected output:
```
✅ Health Endpoint (234ms)
✅ Database Connection (456ms)
✅ Auth Endpoints (123ms)
✅ API Endpoints (345ms)
✅ Static Assets (89ms)
✅ Environment Configuration (67ms)

SUMMARY: 6/6 checks passed (100%)
```

#### 3.2 Manual Smoke Tests

**Authentication:**
```bash
# Test login endpoint
curl -X POST https://leora.vercel.app/api/portal/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Should return 200 with token or 401 (not 500)
```

**Database Connectivity:**
```bash
# Check health endpoint
curl https://leora.vercel.app/api/health

# Expected: {"status":"healthy","timestamp":"..."}
```

**AI Features:**
```bash
# Check Leora AI endpoint (requires authentication)
curl https://leora.vercel.app/api/leora/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the top selling products?"}'

# Should return AI response (not 500)
```

**Portal Pages:**
- ✅ Visit `/portal/dashboard`
- ✅ Navigate to `/portal/orders`
- ✅ Check `/portal/invoices`
- ✅ Test `/portal/insights`
- ✅ Verify `/portal/account`

#### 3.3 Functional Testing

| Test Case | Expected Result | Status |
|-----------|----------------|--------|
| User can log in | Session created, dashboard loads | ☐ |
| Orders display correctly | List shows recent orders | ☐ |
| Invoice details load | PDF generation works | ☐ |
| Dashboard metrics update | Real-time data visible | ☐ |
| Leora AI responds | Chat returns relevant answers | ☐ |
| Search functionality | Results returned quickly | ☐ |
| Cart operations | Add/remove items works | ☐ |
| Checkout process | Order submission succeeds | ☐ |

### Phase 4: Monitoring (T+30 minutes)

#### 4.1 Performance Metrics

**Vercel Dashboard:**
- Function invocations: Check for errors
- Response times: Should be <2s p95
- Memory usage: Within allocated limits
- Cache hit rate: >80% for static assets

**Supabase Dashboard:**
- Active connections: <50% of pool
- Query performance: <100ms average
- Connection errors: 0
- Storage usage: Within quota

**Application Logs:**
```bash
# Monitor production logs
vercel logs --follow | grep -i error

# Check for specific function
vercel logs --function=api/portal/auth/login
```

#### 4.2 Error Monitoring

Check Sentry (if configured):
- New error types
- Error rate vs baseline
- User-affecting errors
- Performance regressions

#### 4.3 User Activity

Monitor:
- Active sessions
- API request volume
- Error rates per endpoint
- AI token usage

### Phase 5: Post-Deployment (T+1 hour)

#### 5.1 Verify Cron Jobs

Check that scheduled jobs are running:

```bash
# Webhook delivery worker
curl https://leora.vercel.app/api/cron/webhook-delivery

# Daily insights
curl https://leora.vercel.app/api/cron/daily-insights

# Health checks
curl https://leora.vercel.app/api/cron/health-checks
```

#### 5.2 Database Validation

```bash
# Check for migration artifacts
psql $DATABASE_URL -c "SELECT version, migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tenants;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM products;"
```

#### 5.3 Cleanup

- [ ] Remove temporary feature flags
- [ ] Archive deployment logs
- [ ] Update documentation
- [ ] Close deployment ticket
- [ ] Update status page (all systems operational)

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- ❌ Error rate >5%
- ❌ Database connection failures
- ❌ Authentication completely broken
- ❌ Data corruption detected
- ❌ Critical feature non-functional

Consider rollback if:
- ⚠️ Performance degradation >2x
- ⚠️ Increased error rates on specific endpoints
- ⚠️ User reports of major issues

### Rollback Steps

#### 1. Immediate Actions

```bash
# Stop incoming deployment
vercel --prod cancel

# Rollback to previous deployment
vercel rollback https://leora-abc123.vercel.app
```

#### 2. Database Rollback (if needed)

**⚠️ CRITICAL: Only if database changes caused issues**

```bash
# Resolve migrations as rolled back
npx prisma migrate resolve --rolled-back "20250115_migration_name"

# Or restore from backup
pg_restore -d $DATABASE_URL backup_TIMESTAMP.sql
```

#### 3. Verify Rollback

```bash
# Run validation again
npm run validate:deployment

# Check that previous version is serving
curl https://leora.vercel.app/api/health
```

#### 4. Investigate Root Cause

- Review deployment logs
- Check error traces
- Analyze database query logs
- Review code changes
- Test fix in staging

---

## Troubleshooting Guide

### Issue: Build Fails

**Symptoms:** GitHub Actions fails at build step

**Diagnosis:**
```bash
# Check TypeScript errors
npm run typecheck

# Check for missing dependencies
npm ci

# Verify Prisma schema
npx prisma validate
```

**Resolution:**
- Fix TypeScript errors
- Update dependencies
- Regenerate Prisma client: `npx prisma generate`
- Retry deployment

### Issue: Migration Fails

**Symptoms:** Database migration errors during deployment

**Diagnosis:**
```bash
# Check migration status
npx prisma migrate status

# Review migration file
cat prisma/migrations/LATEST_MIGRATION/migration.sql
```

**Resolution:**
- If minor: Mark as resolved and rerun
- If major: Rollback deployment, fix migration, redeploy
- Check for conflicting schema changes
- Verify database user has DDL permissions

### Issue: Runtime Errors

**Symptoms:** 500 errors in production, app non-functional

**Diagnosis:**
```bash
# Check logs
vercel logs --follow | grep -i error

# Check environment variables
vercel env ls production

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"
```

**Resolution:**
- Verify all required env vars set
- Check database connectivity
- Review function timeout limits
- Check for missing dependencies
- Review Sentry error traces

### Issue: Slow Performance

**Symptoms:** Pages load slowly, timeouts

**Diagnosis:**
- Check Vercel function duration
- Review database query times
- Check connection pool saturation
- Review AI API response times

**Resolution:**
- Optimize slow queries (add indexes)
- Increase function timeout for AI routes
- Scale database connection pool
- Implement caching layers
- Review and optimize AI prompt lengths

---

## Emergency Contacts

| Role | Contact Method | Response Time |
|------|---------------|---------------|
| DevOps Engineer | [Contact Method] | 15 minutes |
| Backend Lead | [Contact Method] | 30 minutes |
| Database Admin | [Contact Method] | 1 hour |
| Product Owner | [Contact Method] | Best effort |

---

## Post-Mortem Template

If issues occurred during deployment, document:

1. **Incident Summary**
   - What happened?
   - When did it occur?
   - How long did it last?

2. **Impact**
   - Users affected
   - Features unavailable
   - Data integrity issues

3. **Root Cause**
   - What caused the issue?
   - Why wasn't it caught earlier?

4. **Resolution**
   - How was it fixed?
   - Time to resolution

5. **Lessons Learned**
   - What went well?
   - What could be improved?
   - Action items for future deployments

6. **Follow-up Actions**
   - Monitoring improvements
   - Process changes
   - Documentation updates
   - Testing enhancements

---

## Deployment Log Template

```markdown
# Deployment Log - [Date]

**Deployer:** [Name]
**Branch:** main
**Commit:** [SHA]
**Time:** [Start Time] - [End Time]

## Checklist Completion
- [x] Pre-deployment checks
- [x] Backup created
- [x] Migration reviewed
- [x] Deployment triggered
- [x] Validation passed
- [x] Monitoring confirmed

## Metrics
- Build time: [Duration]
- Migration time: [Duration]
- Validation time: [Duration]
- Total downtime: [Duration or "None"]

## Issues Encountered
[None / List issues and resolutions]

## Notes
[Any additional observations or notes]

## Sign-off
- Deployer: [Name]
- Reviewer: [Name]
- Date: [Date]
```

---

**Last Updated**: 2025-10-15
**Version**: 1.0.0
**Next Review**: After first production deployment
