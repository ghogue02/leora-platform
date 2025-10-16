# Environment Variables Reference

Complete documentation of all environment variables used in the Leora Platform.

## Overview

Environment variables are organized into categories:
- 🔴 **Required** - Must be set for deployment
- 🟡 **Recommended** - Should be set for production
- 🟢 **Optional** - Feature-specific or development only

---

## Core Database & Prisma

### DATABASE_URL 🔴
- **Required**: Yes
- **Type**: Secret
- **Example**: `postgresql://postgres.project:password@aws-0-us-east-2.pooler.supabase.com:6543/postgres`
- **Description**: Primary Prisma connection string. Use **connection pooler** URL for Vercel/serverless environments.
- **Notes**:
  - Maximum 6543 pooled connections
  - Automatically manages connection lifecycle
  - Use `?pgbouncer=true` if needed

### DIRECT_URL 🔴
- **Required**: Yes (for migrations)
- **Type**: Secret
- **Example**: `postgresql://postgres:password@db.project.supabase.co:5432/postgres`
- **Description**: Direct database connection for Prisma migrations (bypasses pooler).
- **Notes**:
  - Required for `prisma migrate deploy`
  - Not suitable for serverless functions
  - Use only in CI/CD and local development

### SHADOW_DATABASE_URL 🟡
- **Required**: Recommended for production
- **Type**: Secret
- **Example**: `postgresql://postgres:password@db.project.supabase.co:5432/shadow`
- **Description**: Separate database for migration testing.
- **Notes**:
  - Prevents data loss during migrations
  - Can be same server, different schema
  - Create with: `CREATE DATABASE shadow;`

### PRISMA_GENERATE_SKIP_POSTINSTALL 🟢
- **Required**: No
- **Type**: Environment Flag
- **Default**: `false`
- **Example**: `true`
- **Description**: Skip Prisma Client generation during npm install.
- **Notes**: Useful for build optimization in some CI environments

---

## Authentication & Security

### JWT_SECRET 🔴
- **Required**: Yes
- **Type**: Secret (High Security)
- **Example**: `openssl rand -base64 32` (generate command)
- **Description**: Secret key for signing JWT access and refresh tokens.
- **Requirements**:
  - Minimum 32 characters
  - Cryptographically random
  - Different per environment
  - Never reuse across projects
- **Rotation**: Generate new secret and deploy with grace period for token refresh

### PORTAL_USER_EMAIL_DOMAIN 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `example.dev`
- **Example**: `demo.leora.com`
- **Description**: Domain for auto-provisioned demo portal users.
- **Notes**: Used in development/staging for quick user creation

### NEXTAUTH_URL 🟡
- **Required**: When NextAuth is enabled
- **Type**: Configuration
- **Example**: `https://leora.vercel.app`
- **Description**: Canonical URL for NextAuth callbacks.
- **Notes**:
  - Auto-detected in Vercel if not set
  - Required for OAuth providers

### NEXTAUTH_SECRET 🟡
- **Required**: When NextAuth is enabled
- **Type**: Secret
- **Example**: `openssl rand -base64 32`
- **Description**: NextAuth session encryption secret.
- **Requirements**: Same as JWT_SECRET

---

## Tenant & Demo Configuration

### DEFAULT_TENANT_SLUG 🔴
- **Required**: Yes
- **Type**: Configuration
- **Default**: `well-crafted`
- **Example**: `well-crafted`
- **Description**: Default tenant identifier for requests without tenant headers.
- **Notes**: Must match existing tenant in database

### DEFAULT_PORTAL_USER_KEY 🔴
- **Required**: Yes
- **Type**: Configuration
- **Default**: `dev-portal-user`
- **Example**: `dev-portal-user`
- **Description**: Key for auto-provisioning portal users.
- **Notes**: Used by `withPortalUserFromRequest` middleware

### NEXT_PUBLIC_DEFAULT_TENANT_SLUG 🟡
- **Required**: Recommended
- **Type**: Public Configuration
- **Default**: Inherits from `DEFAULT_TENANT_SLUG`
- **Example**: `well-crafted`
- **Description**: Client-side default tenant for session hydration.
- **Notes**: Safe to expose (public prefix)

### NEXT_PUBLIC_DEFAULT_PORTAL_USER_ID 🟢
- **Required**: No
- **Type**: Public Configuration
- **Example**: `uuid-from-database`
- **Description**: Default portal user ID for demo sessions.

### NEXT_PUBLIC_DEFAULT_PORTAL_USER_EMAIL 🟢
- **Required**: No
- **Type**: Public Configuration
- **Example**: `demo@wellcrafted.com`
- **Description**: Prepopulates login forms in demo mode.

### NEXT_PUBLIC_DEMO_SALES_REP_ID 🟢
- **Required**: No
- **Type**: Public Configuration
- **Example**: `uuid-from-database`
- **Description**: Demo sales rep ID for dashboard fallback.

### NEXT_PUBLIC_DEMO_SALES_REP_NAME 🟢
- **Required**: No
- **Type**: Public Configuration
- **Example**: `Alex Thompson`
- **Description**: Display name for demo sales rep.

---

## Supabase Credentials

### NEXT_PUBLIC_SUPABASE_URL 🔴
- **Required**: Yes (if using Supabase client-side)
- **Type**: Public Configuration
- **Example**: `https://zqezunzlyjkseugujkrl.supabase.co`
- **Description**: Supabase project URL.
- **Notes**: Safe to expose publicly

### NEXT_PUBLIC_SUPABASE_ANON_KEY 🔴
- **Required**: Yes (if using Supabase client-side)
- **Type**: Public Token
- **Example**: `eyJhbGci...long-jwt-string`
- **Description**: Supabase anonymous key for client-side requests.
- **Notes**:
  - Safe to expose (limited permissions)
  - Protected by RLS policies
  - Read-only by default

### SUPABASE_SERVICE_ROLE_KEY 🟡
- **Required**: Only if bypassing RLS
- **Type**: Secret (Critical Security)
- **Example**: `eyJhbGci...service-role-jwt`
- **Description**: Supabase admin key with full database access.
- **⚠️ DANGER**:
  - Never expose to client
  - Only use server-side
  - Bypasses all RLS policies
  - Rotate regularly

---

## AI & External Models

### OPENAI_API_KEY 🔴
- **Required**: Yes (for Leora AI features)
- **Type**: Secret
- **Example**: `sk-proj-...your-key`
- **Description**: OpenAI API key for GPT-5 integration.
- **Security**:
  - Server-side only (never expose to client)
  - Monitor usage for cost control
  - Set up usage alerts in OpenAI dashboard
- **Cost Management**:
  - Log token usage per request
  - Implement rate limiting
  - Cache common responses

### OPENAI_MODEL 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `gpt-4` (or latest available)
- **Example**: `gpt-4-turbo-preview`
- **Description**: OpenAI model to use for Leora AI.

### OPENAI_MAX_TOKENS 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `2000`
- **Example**: `4000`
- **Description**: Maximum tokens per AI request.

### OPENAI_TEMPERATURE 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `0.7`
- **Example**: `0.5`
- **Description**: AI response creativity (0 = deterministic, 1 = creative).

---

## Analytics & Third-Party Services

### SENTRY_DSN 🟡
- **Required**: Recommended for production
- **Type**: Secret
- **Example**: `https://examplePublicKey@o0.ingest.sentry.io/0`
- **Description**: Sentry error tracking DSN.

### SENTRY_AUTH_TOKEN 🟢
- **Required**: For release tracking
- **Type**: Secret
- **Example**: `sntrys_...token`
- **Description**: Sentry authentication token for source maps.

### POSTHOG_API_KEY 🟡
- **Required**: For product analytics
- **Type**: Secret
- **Example**: `phc_...key`
- **Description**: PostHog analytics API key.

### POSTHOG_HOST 🟢
- **Required**: If self-hosting PostHog
- **Type**: Configuration
- **Default**: `https://app.posthog.com`
- **Example**: `https://posthog.yourdomain.com`

### RESEND_API_KEY 🟡
- **Required**: For email delivery
- **Type**: Secret
- **Example**: `re_...key`
- **Description**: Resend email service API key.

### STRIPE_SECRET_KEY 🟡
- **Required**: For payment processing
- **Type**: Secret (Critical)
- **Example**: `sk_live_...key`
- **Description**: Stripe secret key for payment processing.

### STRIPE_PUBLISHABLE_KEY 🟢
- **Required**: For Stripe client-side
- **Type**: Public Configuration
- **Example**: `pk_live_...key`
- **Description**: Stripe publishable key (safe for client).

### STRIPE_WEBHOOK_SECRET 🟡
- **Required**: For Stripe webhooks
- **Type**: Secret
- **Example**: `whsec_...secret`
- **Description**: Webhook signing secret for verification.

---

## Application Configuration

### NODE_ENV 🔴
- **Required**: Yes
- **Type**: Environment Flag
- **Default**: `development`
- **Values**: `development`, `production`, `test`
- **Description**: Node.js environment mode.
- **Notes**: Auto-set by Vercel

### NEXT_PUBLIC_APP_URL 🟡
- **Required**: Recommended
- **Type**: Public Configuration
- **Example**: `https://leora.vercel.app`
- **Description**: Full application URL for absolute links.

### RATE_LIMIT_MAX_REQUESTS 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `100`
- **Example**: `200`
- **Description**: Maximum requests per time window.

### RATE_LIMIT_WINDOW_MS 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `900000` (15 minutes)
- **Example**: `600000`
- **Description**: Rate limit time window in milliseconds.

### SESSION_LIFETIME_HOURS 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `24`
- **Example**: `48`
- **Description**: JWT access token lifetime in hours.

### REFRESH_TOKEN_LIFETIME_DAYS 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `30`
- **Example**: `90`
- **Description**: Refresh token lifetime in days.

---

## Feature Flags

### FEATURE_LEORA_AI 🟢
- **Required**: No
- **Type**: Feature Flag
- **Default**: `true`
- **Values**: `true`, `false`
- **Description**: Enable/disable Leora AI features.

### FEATURE_WEBHOOK_WORKER 🟢
- **Required**: No
- **Type**: Feature Flag
- **Default**: `true`
- **Values**: `true`, `false`
- **Description**: Enable webhook delivery worker.

### FEATURE_REAL_TIME_UPDATES 🟢
- **Required**: No
- **Type**: Feature Flag
- **Default**: `false`
- **Values**: `true`, `false`
- **Description**: Enable WebSocket real-time updates.

---

## Background Jobs & Workers

### WEBHOOK_WORKER_ENABLED 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `true`
- **Example**: `false`
- **Description**: Enable webhook delivery background worker.

### WEBHOOK_WORKER_INTERVAL_MS 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `60000` (1 minute)
- **Example**: `300000`
- **Description**: Webhook worker polling interval.

### WEBHOOK_MAX_RETRIES 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `5`
- **Example**: `10`
- **Description**: Maximum retry attempts for failed webhooks.

### WEBHOOK_RETRY_DELAY_MS 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `5000`
- **Example**: `10000`
- **Description**: Delay between webhook retry attempts.

### CRON_HEALTH_CHECK 🟢
- **Required**: No
- **Type**: Cron Expression
- **Default**: `*/5 * * * *` (every 5 minutes)
- **Description**: Health check cron schedule.

### CRON_DAILY_INSIGHTS 🟢
- **Required**: No
- **Type**: Cron Expression
- **Default**: `0 6 * * *` (6 AM daily)
- **Description**: Daily AI insights generation schedule.

### CRON_WEBHOOK_CLEANUP 🟢
- **Required**: No
- **Type**: Cron Expression
- **Default**: `0 0 * * *` (midnight daily)
- **Description**: Old webhook cleanup schedule.

---

## Logging & Monitoring

### LOG_LEVEL 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `info`
- **Values**: `debug`, `info`, `warn`, `error`
- **Description**: Application logging verbosity.

### PRISMA_QUERY_LOG 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `false`
- **Values**: `true`, `false`
- **Description**: Enable Prisma query logging.
- **Notes**: Useful for debugging, verbose in production

### TRACK_OPENAI_TOKENS 🟡
- **Required**: Recommended
- **Type**: Configuration
- **Default**: `true`
- **Values**: `true`, `false`
- **Description**: Log OpenAI token usage for cost tracking.

---

## Vercel-Specific Variables

These are automatically set by Vercel:

### VERCEL 🔵
- **Auto-set**: Yes
- **Value**: `1`
- **Description**: Indicates deployment on Vercel.

### VERCEL_ENV 🔵
- **Auto-set**: Yes
- **Values**: `production`, `preview`, `development`
- **Description**: Current Vercel environment.

### VERCEL_URL 🔵
- **Auto-set**: Yes
- **Example**: `leora-xyz123.vercel.app`
- **Description**: Deployment URL.

### VERCEL_GIT_COMMIT_SHA 🔵
- **Auto-set**: Yes
- **Example**: `abc123def456`
- **Description**: Git commit SHA of deployment.

### VERCEL_GIT_COMMIT_REF 🔵
- **Auto-set**: Yes
- **Example**: `main`
- **Description**: Git branch of deployment.

---

## Development Tools

### POSTGRES_SSL 🟢
- **Required**: No (MCP only)
- **Type**: Configuration
- **Default**: `true`
- **Description**: Enable SSL for PostgreSQL MCP server.

### POSTGRES_SSL_FORCE 🟢
- **Required**: No (MCP only)
- **Type**: Configuration
- **Default**: `true`
- **Description**: Force SSL connection override.

### POSTGRES_SSL_REJECT_UNAUTHORIZED 🟢
- **Required**: No (MCP only)
- **Type**: Configuration
- **Default**: `false`
- **Description**: Skip SSL certificate verification.

### DEBUG 🟢
- **Required**: No
- **Type**: Configuration
- **Example**: `prisma:*`
- **Description**: Enable debug logging for specific modules.

### NEXT_TELEMETRY_DISABLED 🟢
- **Required**: No
- **Type**: Configuration
- **Default**: `1`
- **Description**: Disable Next.js telemetry collection.

---

## Environment Setup Checklist

### Minimum for Deployment 🔴
- [ ] `DATABASE_URL` (pooled connection)
- [ ] `DIRECT_URL` (for migrations)
- [ ] `JWT_SECRET` (32+ characters)
- [ ] `DEFAULT_TENANT_SLUG`
- [ ] `DEFAULT_PORTAL_USER_KEY`
- [ ] `OPENAI_API_KEY` (if using AI)

### Recommended for Production 🟡
- [ ] `SHADOW_DATABASE_URL`
- [ ] `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
- [ ] `SENTRY_DSN`
- [ ] `TRACK_OPENAI_TOKENS=true`

### Optional Enhancements 🟢
- [ ] Analytics (`POSTHOG_API_KEY`)
- [ ] Email (`RESEND_API_KEY`)
- [ ] Payments (`STRIPE_*` keys)
- [ ] Feature flags as needed

---

## Security Best Practices

1. **Never Commit Secrets**: Use `.env.local`, add to `.gitignore`
2. **Rotate Regularly**: JWT secrets, API keys, database passwords
3. **Use Different Secrets Per Environment**: Production ≠ Staging ≠ Development
4. **Monitor Access**: Review who has access to Vercel/Supabase
5. **Enable RLS**: Always use Row-Level Security in production
6. **Least Privilege**: Only grant necessary permissions
7. **Audit Logs**: Review access logs regularly

---

**Last Updated**: 2025-10-15
**Version**: 1.0.0
