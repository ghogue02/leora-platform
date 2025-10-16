# Leora Platform - Implementation Strategy

**Version**: 1.0
**Date**: October 15, 2025
**Status**: Architecture Phase

## Executive Summary

This document provides a comprehensive implementation strategy for rebuilding the Leora Platform from a clean codebase while retaining existing Supabase assets and deployment infrastructure. The strategy breaks down the blueprint into actionable phases, identifies critical path dependencies, and provides detailed guidance for the development team.

---

## 1. Critical Path Dependencies

### 1.1 Foundation Layer (MUST BE FIRST)
**Timeline**: Weeks 1-2
**Blockers**: None
**Dependents**: All other phases

1. **Repository Setup**
   - Initialize Next.js 15 with TypeScript strict mode
   - Configure ESLint, Prettier, Git hooks
   - Set up GitHub Actions for CI/CD
   - Create `.env.example` with all required variables

2. **Prisma & Database Connection**
   - Port Prisma schema from existing codebase
   - Configure connection pooling for Supabase
   - Run initial migrations against existing database
   - Verify tenant isolation with `withTenant` helper

3. **Environment Configuration**
   - Configure Vercel project and link repository
   - Add all secrets via Vercel CLI (see Section 3 of blueprint)
   - Mirror secrets to local `.env.local`
   - Document secret rotation procedures

4. **Design System Foundation**
   - Configure Tailwind CSS 4 with brand tokens
   - Port design tokens from `/Leora_Brand_Press_Kit/tokens/leora_tokens.css`
   - Set up shadcn/ui component library
   - Implement theme switching (`.theme-dark` support)

**Success Criteria**:
- ✅ `npm run dev` starts successfully
- ✅ Prisma can query Supabase
- ✅ Design tokens render correctly
- ✅ CI pipeline passes lint/type checks

---

### 1.2 Authentication & Session Management (SECOND PRIORITY)
**Timeline**: Weeks 2-3
**Blockers**: Foundation Layer
**Dependents**: All feature modules

1. **JWT Token System**
   - Implement `lib/auth/jwt.ts` with access/refresh token generation
   - Create secure cookie helpers (`setAccessTokenCookie`, `setRefreshTokenCookie`)
   - Add rate limiting and account lockout mechanisms
   - Implement session activity logging

2. **Portal Authentication APIs**
   - `/api/portal/auth/login` - Credential validation with Prisma
   - `/api/portal/auth/register` - User provisioning with default roles
   - `/api/portal/auth/me` - Session hydration endpoint
   - `/api/portal/auth/refresh` - Silent token refresh
   - `/api/portal/auth/logout` - Session cleanup
   - `/api/portal/auth/reset-password` - Password reset flow
   - `/api/portal/auth/verify-email` - Email verification

3. **Client Session Provider**
   - `components/providers/PortalSessionProvider.tsx`
   - Local storage sync with API session
   - Automatic refresh on 401 errors
   - Default session fallback for development

4. **Authorization Middleware**
   - `withTenantFromRequest` - Tenant resolution from headers
   - `withPortalUserFromRequest` - Portal user auto-provisioning
   - `requirePortalPermission` - RBAC enforcement
   - `PortalAuthGuard` - Protected route wrapper

5. **NextAuth Integration (Planned)**
   - Configure provider-based authentication
   - Unify session retrieval across server/client
   - Remove temporary manual JWT handling

**Success Criteria**:
- ✅ Users can register and login successfully
- ✅ JWT tokens refresh automatically before expiry
- ✅ Protected routes redirect unauthenticated users
- ✅ Tenant isolation verified with test accounts

---

### 1.3 Core API Layer (THIRD PRIORITY)
**Timeline**: Weeks 3-5
**Blockers**: Authentication system
**Dependents**: UI features, background jobs

1. **Catalog APIs**
   - `/api/portal/products` - Product listing with filters
   - `/api/portal/products/[id]` - Product detail
   - `/api/portal/inventory` - Real-time availability
   - `/api/portal/pricing` - Dynamic pricing engine

2. **Order Management APIs**
   - `/api/portal/orders` - Order history with pagination
   - `/api/portal/orders/[id]` - Order detail with line items
   - `/api/portal/orders/[id]/status` - Status transitions
   - Order state machine (draft → submitted → confirmed → fulfilled)

3. **Invoice & Payment APIs**
   - `/api/portal/invoices` - Invoice listing
   - `/api/portal/invoices/[id]` - Invoice detail with payments
   - `/api/portal/invoices/[id]/pdf` - Invoice PDF generation
   - `/api/portal/payments` - Payment history

4. **Cart & Checkout APIs**
   - `/api/portal/cart` - Cart CRUD operations
   - `/api/portal/cart/items` - Cart item management
   - `/api/portal/cart/checkout` - Order creation with pricing waterfall
   - Inventory reservation logic

5. **Analytics & Insights APIs**
   - `/api/portal/insights/overview` - Dashboard metrics
   - `/api/portal/insights/revenue` - Revenue analytics
   - `/api/portal/insights/health` - Customer health scores
   - `/api/sales/dashboard` - Sales rep dashboard

6. **Reports APIs**
   - `/api/portal/reports` - Report listing
   - `/api/portal/reports/[type]` - Specific report generation
   - `/api/portal/reports/[id]/export` - CSV/Excel/PDF export

7. **User Management APIs**
   - `/api/portal/account` - Account profile
   - `/api/portal/favorites` - Favorites management
   - `/api/portal/lists` - Custom lists (Top 20, etc.)
   - `/api/portal/notifications` - Notification preferences

**Success Criteria**:
- ✅ All APIs return consistent `{ success, data }` shape
- ✅ TypeScript types generated and validated
- ✅ RBAC enforced on all endpoints
- ✅ Supabase RLS policies tested

---

### 1.4 Intelligence Layer (PARALLEL WITH UI)
**Timeline**: Weeks 4-6
**Blockers**: Core API Layer
**Dependents**: Dashboard UI, AI Copilot

1. **Customer Health Engine**
   - ARPDD (Average Revenue Per Delivery Day) calculation
   - Ordering pace detection from order history
   - Revenue risk flagging (≥15% drop from baseline)
   - Health score computation and snapshots

2. **Pricing Waterfall**
   - Multi-tier pricing engine (list → contract → promotional)
   - Pricing rules audit log in `OrderLine.appliedPricingRules`
   - Dynamic pricing based on customer segment
   - Volume discount calculations

3. **Sample Management**
   - Inventory transfer tracking for samples
   - Monthly allowance enforcement (60 pulls/rep default)
   - Manager approval workflow for overages
   - Tasting feedback capture on activities

4. **Pipeline & Activity Planning**
   - Call plan generation from health scores
   - "Due now" and "at risk" customer identification
   - Recommended next actions based on data patterns
   - Activity outcome tracking

5. **Top Opportunities Engine**
   - "Top 20" product recommendations per customer
   - Toggles for revenue/volume/penetration ranking
   - Six-month rolling window calculations
   - Cross-sell and upsell suggestions

**Success Criteria**:
- ✅ Health scores calculated for all customers with ≥3 orders
- ✅ Pricing waterfall applied correctly on checkout
- ✅ Sample tracking separate from revenue orders
- ✅ Call plans auto-generate for at-risk accounts

---

## 2. Implementation Phases

### Phase 1: Foundation & Authentication (Weeks 1-3)
**Goal**: Establish secure, multi-tenant platform foundation

**Deliverables**:
- ✅ Repository initialized with Next.js 15 + TypeScript
- ✅ Prisma schema migrated and connected to Supabase
- ✅ JWT authentication system operational
- ✅ Design system with brand tokens configured
- ✅ CI/CD pipeline deploying to Vercel staging

**Team Requirements**:
- 1 Backend Engineer (Prisma, Auth)
- 1 Frontend Engineer (Design System, Session Provider)
- 1 DevOps Engineer (CI/CD, Secrets)

---

### Phase 2: Core Commerce APIs (Weeks 3-5)
**Goal**: Enable product catalog, ordering, and invoice management

**Deliverables**:
- ✅ Product catalog APIs with live Supabase data
- ✅ Order management with status transitions
- ✅ Invoice and payment tracking
- ✅ Cart and checkout flow with inventory checks
- ✅ API documentation with examples

**Team Requirements**:
- 2 Backend Engineers (API Development)
- 1 QA Engineer (API Testing)

---

### Phase 3: Intelligence & Analytics (Weeks 4-6)
**Goal**: Implement business logic engines and analytics

**Deliverables**:
- ✅ Customer health scoring operational
- ✅ ARPDD and pace detection running
- ✅ Pricing waterfall implemented
- ✅ Sample management system
- ✅ Analytics APIs with real-time metrics

**Team Requirements**:
- 1 Backend Engineer (Business Logic)
- 1 Data Engineer (Analytics Queries)

---

### Phase 4: User Interface (Weeks 5-8)
**Goal**: Build portal pages and connect to APIs

**Deliverables**:
- ✅ Dashboard with live metrics
- ✅ Product catalog with search/filters
- ✅ Order history and detail pages
- ✅ Invoice management with PDF downloads
- ✅ Account management and settings
- ✅ Reports with export functionality

**Team Requirements**:
- 2 Frontend Engineers (React Components, TanStack Query)
- 1 UI/UX Designer (Component Library)

---

### Phase 5: AI Copilot - Leora (Weeks 6-9)
**Goal**: Integrate GPT-5 for proactive insights and conversational analytics

**Deliverables**:
- ✅ OpenAI client wrapper with retries and logging
- ✅ Proactive briefing job generating daily summaries
- ✅ Chat API routing natural language to SQL templates
- ✅ Dashboard briefing cards with drill-down CTAs
- ✅ Confidence scoring and fallback messaging

**Team Requirements**:
- 1 AI Engineer (GPT-5 Integration)
- 1 Backend Engineer (Query Templates)
- 1 Frontend Engineer (Chat UI)

**Detailed Implementation**:
See Section 1.4 of blueprint for full AI Copilot architecture and phased rollout.

---

### Phase 6: Background Automation (Weeks 7-9)
**Goal**: Deploy webhook workers and scheduled tasks

**Deliverables**:
- ✅ Webhook delivery worker deployed
- ✅ Health scoring scheduled jobs
- ✅ Pace detection and alerting
- ✅ Daily briefing generation
- ✅ Integration token monitoring

**Team Requirements**:
- 1 Backend Engineer (Workers)
- 1 DevOps Engineer (Scheduling)

---

### Phase 7: Testing & Hardening (Weeks 9-10)
**Goal**: Ensure production readiness

**Deliverables**:
- ✅ Jest unit tests (>80% coverage)
- ✅ Playwright E2E smoke tests
- ✅ Load testing on critical APIs
- ✅ Security audit (OWASP Top 10)
- ✅ Supabase RLS policies verified
- ✅ Disaster recovery procedures documented

**Team Requirements**:
- 1 QA Engineer (Testing)
- 1 Security Engineer (Audit)

---

### Phase 8: Production Launch (Week 11)
**Goal**: Deploy to production with Well Crafted tenant

**Deliverables**:
- ✅ Well Crafted tenant fully migrated
- ✅ Production deployment validated
- ✅ Monitoring and alerting configured
- ✅ User training materials completed
- ✅ Support runbooks documented

**Team Requirements**:
- Full Team (All Hands)

---

## 3. Priority Matrix by Customer Need

### Well Crafted Critical Needs (Phase 1-3 Priorities)

| Feature | Priority | Complexity | Customer Impact | Implementation Week |
|---------|----------|------------|-----------------|---------------------|
| **Ordering Pace Detection** | 🔴 Critical | High | Eliminates blind spots in cadence | Week 4-5 |
| **Revenue Health Alerts** | 🔴 Critical | High | Prevents attrition | Week 5-6 |
| **Sample Tracking** | 🟡 High | Medium | Accountability & ROI proof | Week 6-7 |
| **Dashboard Clarity** | 🔴 Critical | Medium | Instant visibility for managers | Week 5 |
| **Top 20 Recommendations** | 🟡 High | Medium | Strategic selling guidance | Week 7 |
| **Order History** | 🔴 Critical | Low | Basic portal functionality | Week 3-4 |
| **Invoice Management** | 🔴 Critical | Low | Payment tracking | Week 4 |
| **Product Catalog** | 🔴 Critical | Low | Enable ordering | Week 3-4 |
| **Call Plan Automation** | 🟡 High | High | Reduces manual admin | Week 7-8 |
| **AI Copilot Briefings** | 🟢 Medium | High | Proactive insights | Week 8-9 |

### Priority Definitions
- 🔴 **Critical**: Blocks MVP launch, core value proposition
- 🟡 **High**: Key differentiator, significant customer pain point
- 🟢 **Medium**: Nice-to-have, enhances experience
- ⚪ **Low**: Future enhancement, optional

---

## 4. Risk Assessment & Mitigation

### High-Risk Areas

#### 4.1 Multi-Tenant Data Isolation
**Risk**: Data leakage between tenants
**Impact**: Critical security/compliance failure
**Mitigation**:
- Implement and test Supabase RLS on ALL tables before launch
- Add automated RLS policy testing in CI pipeline
- Use `withTenant` helper consistently in all Prisma queries
- Conduct penetration testing focused on tenant boundaries
- Monitor `app.current_tenant_id` session parameter in logs

#### 4.2 Authentication Security
**Risk**: Session hijacking, credential theft
**Impact**: Unauthorized account access
**Mitigation**:
- Use secure, httpOnly, SameSite cookies for JWT
- Implement rate limiting on auth endpoints (max 5 attempts/15 min)
- Add account lockout after failed attempts
- Rotate JWT_SECRET regularly (quarterly)
- Log all authentication events with IP/user agent
- Add 2FA/MFA in Phase 2 (post-MVP)

#### 4.3 GPT-5 Integration Reliability
**Risk**: AI service downtime or unexpected responses
**Impact**: Leora Copilot unavailable
**Mitigation**:
- Implement circuit breaker pattern for OpenAI calls
- Cache daily briefings with 24-hour TTL
- Provide fallback to static insights when GPT-5 fails
- Display clear "AI unavailable" messaging to users
- Log all prompts/responses for debugging
- Set conservative token limits and timeout values

#### 4.4 Supabase Connection Pooling
**Risk**: Database connection exhaustion under load
**Impact**: API timeouts and errors
**Mitigation**:
- Use Supabase connection pooler (pgBouncer) in production
- Configure Prisma connection limits appropriately
- Implement query timeouts (5s for reads, 10s for writes)
- Monitor active connections with alerts at 80% capacity
- Add read replicas if needed for analytics queries

#### 4.5 Migration Data Integrity
**Risk**: Data loss during Prisma migration
**Impact**: Customer data corruption
**Mitigation**:
- Always create shadow database for migrations
- Test migrations against Supabase copy before production
- Take manual database backup before every migration
- Use `prisma migrate deploy` (no auto-destructive changes)
- Document rollback procedures for every migration

### Medium-Risk Areas

#### 4.6 Complex Business Logic (Health Scoring, Pricing)
**Risk**: Incorrect calculations affecting customer trust
**Impact**: Eroded confidence in platform
**Mitigation**:
- Write comprehensive unit tests for all calculation engines
- Validate against historical Well Crafted data
- Add calculation audit trails in database
- Implement manual override capabilities
- Display calculation methodology in UI

#### 4.7 Background Job Failures
**Risk**: Webhook deliveries or scheduled tasks failing silently
**Impact**: Integration breakdowns, missed alerts
**Mitigation**:
- Implement retry logic with exponential backoff
- Store job status in database for monitoring
- Send alerts on repeated job failures
- Provide manual job re-run capability
- Log all job executions with detailed errors

### Low-Risk Areas
- UI/UX inconsistencies (can be iteratively improved)
- Report export performance (can be optimized post-launch)
- Third-party integrations (deferred to Phase 2)

---

## 5. Technical Architecture Details

### 5.1 Multi-Tenant Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Request                            │
│  (Browser/API Client with X-Tenant-Id header)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Route Handler                       │
│  - Extract tenant from header or default                    │
│  - Call withTenantFromRequest()                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            Prisma withTenant Helper                          │
│  - Set session parameter: app.current_tenant_id              │
│  - All subsequent queries scoped to tenant                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Postgres                               │
│  - Row-Level Security (RLS) policies active                  │
│  - Filters: WHERE tenant_id = current_setting(...)           │
│  - Returns only tenant-scoped data                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           API Response (Tenant-Scoped)                       │
│  - Data validated and formatted                              │
│  - Returned as { success: true, data: {...} }                │
└─────────────────────────────────────────────────────────────┘
```

**Key Implementation Points**:
1. Every table has a `tenantId` column (UUID, non-null)
2. `app.current_tenant_id` session parameter set per transaction
3. RLS policies enforce tenant isolation at database level
4. Middleware validates tenant header before route execution
5. Default tenant slug used for development/demo accounts

---

### 5.2 Authentication & Session Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Login                                │
│  POST /api/portal/auth/login                                 │
│  { email, password }                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Credential Validation                              │
│  - Query PortalUser by email + tenantId                      │
│  - Verify password hash (bcrypt)                             │
│  - Check account lockout status                              │
│  - Rate limit: 5 attempts per 15 minutes                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼ (Success)
┌─────────────────────────────────────────────────────────────┐
│           JWT Token Generation                               │
│  - Access Token (15 min): { userId, tenantId, roles }        │
│  - Refresh Token (7 days): { userId, sessionId }             │
│  - Sign with JWT_SECRET (HS256)                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         Set Secure HTTP-Only Cookies                         │
│  - accessToken: httpOnly, secure, SameSite=Strict            │
│  - refreshToken: httpOnly, secure, SameSite=Strict           │
│  - Create PortalSession record in DB                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         Client Session Hydration                             │
│  - PortalSessionProvider calls /api/portal/auth/me           │
│  - Extracts JWT from cookie automatically                    │
│  - Returns { user, tenant, permissions }                     │
│  - Stores in React Context + localStorage                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          Automatic Token Refresh                             │
│  - On 401 response, trigger /api/portal/auth/refresh         │
│  - Use refreshToken to issue new accessToken                 │
│  - Update cookie and retry failed request                    │
└─────────────────────────────────────────────────────────────┘
```

**Security Measures**:
- Passwords hashed with bcrypt (cost factor 12)
- JWTs signed with HS256, minimum 32-character secret
- Cookies: httpOnly, secure (HTTPS only), SameSite=Strict
- Rate limiting: 5 login attempts per 15 minutes per IP
- Account lockout: After 5 failed attempts, lock for 30 minutes
- Session activity logged: IP, user agent, timestamp
- Refresh token rotation: New refresh token issued on each refresh

---

### 5.3 API Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Client Application                            │
│  - React Components with TanStack Query                      │
│  - Automatic retry, caching, revalidation                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            Next.js App Router API Routes                     │
│  /app/api/portal/[resource]/route.ts                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          Middleware Stack (Executed in Order)                │
│  1. withTenantFromRequest() - Tenant resolution              │
│  2. withPortalUserFromRequest() - Auth + auto-provision      │
│  3. requirePortalPermission() - RBAC check                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Business Logic Layer                            │
│  - Service modules (orders, products, insights)              │
│  - Validation with Zod schemas                               │
│  - Error handling and logging                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Prisma ORM Layer                                │
│  - withTenant() sets session parameter                       │
│  - Type-safe queries                                         │
│  - Transaction support                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Supabase Postgres (RLS Active)                     │
│  - Row-level security enforcement                            │
│  - Connection pooling via pgBouncer                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Standardized Response                           │
│  Success: { success: true, data: {...} }                     │
│  Error: { success: false, error: {...} }                     │
└─────────────────────────────────────────────────────────────┘
```

**API Design Principles**:
1. **Consistent Response Shape**: All endpoints return `{ success, data, error }`
2. **TypeScript Types**: Shared types between client and server
3. **RBAC Enforcement**: Permission checks before business logic
4. **Input Validation**: Zod schemas validate all request bodies
5. **Error Standardization**: HTTP status codes + detailed error objects
6. **Pagination**: Cursor-based for large datasets
7. **Rate Limiting**: Per-tenant and per-user limits

---

### 5.4 AI Copilot Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│              User Interaction Points                         │
│  1. Dashboard - Daily Briefing Card                          │
│  2. Chat Interface - Natural Language Query                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
        ▼                            ▼
┌──────────────────┐       ┌─────────────────────┐
│  Briefing Job    │       │   Chat API Route    │
│  (Scheduled)     │       │  /api/leora/chat    │
└────────┬─────────┘       └──────────┬──────────┘
         │                            │
         ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Context Gathering Layer                           │
│  - Query Prisma for tenant metrics                           │
│  - ARPDD, health scores, revenue deltas                      │
│  - Sample allowances, pipeline gaps                          │
│  - Account pace deviations                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Prompt Construction                             │
│  System: "You are Leora, warm, assured, succinct..."         │
│  Context: { tenant, user, metrics, timeframe }               │
│  Task: "Generate briefing" OR "Answer: [user question]"      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            OpenAI GPT-5 API Call                             │
│  - Model: gpt-5 (consult latest OpenAI docs)                │
│  - Temperature: 0.3 (deterministic insights)                 │
│  - Max tokens: 500 (briefings), 1000 (chat)                  │
│  - Retry: 3 attempts with exponential backoff                │
│  - Timeout: 30 seconds                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            Response Processing                               │
│  - Parse GPT-5 response                                      │
│  - Extract: summary, recommendedActions, confidence          │
│  - Attach source dataset IDs for audit                       │
│  - Cache result (24h for briefings, 5min for chat)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             Delivery to Client                               │
│  Briefing: Render card on /portal/dashboard                  │
│  Chat: Stream response to chat UI component                  │
│  Fallback: Show cached/static insights on AI failure         │
└─────────────────────────────────────────────────────────────┘
```

**AI Implementation Details**:

1. **Briefing Generation (Scheduled)**
   - Cron job runs daily at 6 AM tenant local time
   - Queries structured metrics from Supabase
   - Generates narrative via GPT-5
   - Caches result per tenant/user with 24h TTL
   - Invalidates cache on data changes (webhooks)

2. **Chat Interface (On-Demand)**
   - User enters natural language query
   - Intent classification via GPT-5 function calling
   - Maps to whitelisted SQL templates or analytics pipelines
   - Executes query, enriches with context, forwards to GPT-5
   - Returns answer with drill-down links to dashboards

3. **Guardrails & Safety**
   - System prompts reinforce Leora's voice and data honesty
   - No fabricated data: AI must cite real Supabase results
   - When data missing: Return guidance prompts, not fake values
   - Read-only queries enforced via custom DSL or Postgres MCP
   - All prompts/responses logged (encrypted, tenant-scoped)

4. **Cost & Observability**
   - Token usage tracked per tenant for future billing
   - Prompts/responses captured for audits and tuning
   - Monitoring: GPT-5 response time, error rate, token consumption
   - Alerts on budget thresholds or service degradation

5. **Fallback Strategy**
   - Circuit breaker opens after 3 consecutive GPT-5 failures
   - Show cached briefing + "AI temporarily unavailable" message
   - Retry with exponential backoff (30s, 60s, 120s)
   - Provide static insights and manual navigation as fallback

---

## 6. Directory Structure for New Codebase

```
leora-platform/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, test, type check
│       ├── deploy-staging.yml        # Auto-deploy to Vercel preview
│       └── deploy-production.yml     # Manual production deploy
│
├── app/                              # Next.js 15 App Router
│   ├── api/                          # API routes
│   │   ├── portal/                   # Portal-specific endpoints
│   │   │   ├── auth/                 # Authentication
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   ├── refresh/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── reset-password/route.ts
│   │   │   │   └── verify-email/route.ts
│   │   │   ├── products/
│   │   │   │   ├── route.ts          # List products
│   │   │   │   └── [id]/route.ts     # Product detail
│   │   │   ├── orders/
│   │   │   │   ├── route.ts          # List orders
│   │   │   │   └── [id]/route.ts     # Order detail
│   │   │   ├── invoices/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── pdf/route.ts
│   │   │   ├── cart/
│   │   │   │   ├── route.ts
│   │   │   │   ├── items/route.ts
│   │   │   │   └── checkout/route.ts
│   │   │   ├── insights/
│   │   │   │   ├── overview/route.ts
│   │   │   │   ├── revenue/route.ts
│   │   │   │   └── health/route.ts
│   │   │   ├── reports/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [type]/route.ts
│   │   │   │   └── [id]/export/route.ts
│   │   │   ├── account/route.ts
│   │   │   ├── favorites/route.ts
│   │   │   ├── lists/route.ts
│   │   │   └── notifications/route.ts
│   │   ├── sales/                    # Sales rep endpoints
│   │   │   └── dashboard/route.ts
│   │   ├── leora/                    # AI Copilot endpoints
│   │   │   ├── chat/route.ts
│   │   │   └── briefing/route.ts
│   │   └── _utils/                   # Shared API utilities
│   │       ├── withTenantFromRequest.ts
│   │       ├── withPortalUserFromRequest.ts
│   │       └── requirePermission.ts
│   │
│   ├── (auth)/                       # Auth layout group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (portal)/                     # Portal layout group
│   │   └── portal/
│   │       ├── layout.tsx            # Portal layout with nav
│   │       ├── dashboard/page.tsx
│   │       ├── products/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── orders/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── invoices/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── cart/page.tsx
│   │       ├── insights/
│   │       │   ├── page.tsx
│   │       │   ├── revenue/page.tsx
│   │       │   └── health/page.tsx
│   │       ├── reports/
│   │       │   ├── page.tsx
│   │       │   └── [type]/page.tsx
│   │       ├── account/page.tsx
│   │       ├── favorites/page.tsx
│   │       ├── lists/page.tsx
│   │       └── leora/page.tsx        # AI chat interface
│   │
│   ├── workers/                      # Background jobs
│   │   ├── webhook-delivery.ts       # Webhook processing
│   │   ├── health-scoring.ts         # Customer health job
│   │   ├── briefing-generator.ts     # AI briefing job
│   │   └── pace-detection.ts         # Ordering pace job
│   │
│   ├── globals.css                   # Tailwind 4 entry point
│   └── layout.tsx                    # Root layout
│
├── components/                       # React components
│   ├── ui/                           # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   └── ...                       # Other shadcn components
│   ├── portal/                       # Portal-specific components
│   │   ├── navigation/
│   │   │   ├── PortalNav.tsx
│   │   │   ├── PortalHeader.tsx
│   │   │   └── PortalSidebar.tsx
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── BriefingCard.tsx
│   │   │   └── ActivityFeed.tsx
│   │   ├── products/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   └── ProductFilters.tsx
│   │   ├── orders/
│   │   │   ├── OrderList.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   └── OrderStatusBadge.tsx
│   │   ├── cart/
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── CartItem.tsx
│   │   │   └── CartSummary.tsx
│   │   ├── leora/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── ChatInput.tsx
│   │   └── ...
│   ├── providers/                    # Context providers
│   │   ├── PortalProviders.tsx       # Root provider wrapper
│   │   ├── PortalSessionProvider.tsx # Session management
│   │   ├── QueryProvider.tsx         # TanStack Query
│   │   └── ThemeProvider.tsx         # Dark mode toggle
│   └── guards/
│       └── PortalAuthGuard.tsx       # Protected route wrapper
│
├── lib/                              # Core libraries
│   ├── auth/
│   │   ├── jwt.ts                    # JWT token generation/validation
│   │   ├── cookies.ts                # Cookie helpers
│   │   ├── session.ts                # Session management
│   │   └── rbac.ts                   # RBAC enforcement
│   ├── prisma.ts                     # Prisma client + withTenant
│   ├── ai/
│   │   ├── openai.ts                 # OpenAI client wrapper
│   │   ├── prompts.ts                # System prompts
│   │   ├── templates.ts              # SQL query templates
│   │   └── cache.ts                  # AI response caching
│   ├── services/                     # Business logic services
│   │   ├── orders.ts
│   │   ├── products.ts
│   │   ├── insights.ts
│   │   ├── health-engine.ts          # Customer health scoring
│   │   ├── pricing-waterfall.ts      # Pricing engine
│   │   └── sample-management.ts
│   ├── utils/
│   │   ├── validation.ts             # Zod schemas
│   │   ├── currency.ts               # Currency formatting
│   │   ├── dates.ts                  # Date utilities
│   │   └── errors.ts                 # Error handling
│   └── constants.ts                  # App-wide constants
│
├── prisma/
│   ├── schema.prisma                 # Prisma schema
│   ├── migrations/                   # Migration history
│   └── seed.ts                       # Seed script
│
├── public/                           # Static assets
│   ├── logos/                        # Brand logos
│   ├── icons/                        # Favicons
│   └── images/
│
├── docs/                             # Documentation
│   ├── implementation-strategy.md    # This document
│   ├── architecture-diagrams.md      # Text-based diagrams
│   ├── integration-points.md         # Module integration docs
│   ├── risk-mitigation.md            # Risk assessment
│   ├── api/                          # API documentation
│   │   ├── portal-endpoints.md
│   │   └── leora-ai.md
│   ├── ai/                           # AI Copilot docs
│   │   ├── prompt-templates.md
│   │   ├── model-usage.md
│   │   └── runbooks.md
│   └── database/
│       └── supabase-schema-overview.md
│
├── tests/
│   ├── unit/                         # Jest unit tests
│   │   ├── auth/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/                  # API integration tests
│   │   └── api/
│   └── e2e/                          # Playwright E2E tests
│       └── portal/
│
├── .env.example                      # Environment template
├── .env.local                        # Local secrets (gitignored)
├── .eslintrc.json
├── .prettierrc
├── tailwind.config.ts                # Tailwind 4 config
├── tsconfig.json
├── next.config.js
├── package.json
└── README.md
```

---

## 7. Integration Points Between Modules

### 7.1 Authentication ↔ API Layer
**Direction**: Bidirectional
**Mechanism**: JWT tokens in HTTP-only cookies
**Data Flow**:
- Auth endpoints issue JWT access/refresh tokens
- API routes extract JWT via `getCurrentUser()` helper
- JWT payload contains `{ userId, tenantId, roles, permissions }`
- RBAC middleware checks permissions before business logic

**Dependencies**:
- API layer depends on `lib/auth/jwt.ts` for token validation
- Auth endpoints depend on `lib/prisma.ts` for user queries

---

### 7.2 Session Provider ↔ Authentication APIs
**Direction**: Client → Server
**Mechanism**: HTTP requests with automatic cookie passing
**Data Flow**:
- `PortalSessionProvider` calls `/api/portal/auth/me` on mount
- Server validates JWT and returns `{ user, tenant, permissions }`
- Provider stores in React Context + localStorage
- On 401 error, triggers silent `/api/portal/auth/refresh`

**Dependencies**:
- Session provider depends on auth API availability
- Uses TanStack Query for caching and automatic retries

---

### 7.3 Business Logic Services ↔ Prisma ORM
**Direction**: Service → Database
**Mechanism**: Prisma Client with `withTenant` wrapper
**Data Flow**:
- Service functions receive `tenantId` from API handler
- Call `withTenant(tenantId, async (prisma) => { ... })`
- Prisma executes query with `app.current_tenant_id` set
- RLS policies enforce tenant isolation at database level

**Dependencies**:
- All services depend on `lib/prisma.ts` singleton
- RLS policies must be enabled on all tables before service use

---

### 7.4 AI Copilot ↔ Business Logic Services
**Direction**: Bidirectional
**Mechanism**: Direct function calls + structured data
**Data Flow**:
- Briefing job queries services for metrics (health, ARPDD, pace)
- Services return structured data (not HTML/text)
- AI layer constructs prompt with data + system instructions
- GPT-5 generates narrative response
- Response cached and returned to client

**Dependencies**:
- AI layer depends on health engine, insights service
- Services must return JSON-serializable data structures
- AI endpoints require `OPENAI_API_KEY` environment variable

---

### 7.5 UI Components ↔ API Routes
**Direction**: Client → Server
**Mechanism**: TanStack Query hooks wrapping fetch/axios
**Data Flow**:
- Component calls `useQuery({ queryKey, queryFn })` hook
- Query function fetches API endpoint with credentials
- TanStack Query handles caching, deduplication, revalidation
- Component receives `{ data, isLoading, error }` reactive state

**Dependencies**:
- Components depend on API endpoints returning consistent shape
- API routes must set proper CORS headers if needed
- TypeScript types shared between client/server (`lib/types.ts`)

---

### 7.6 Background Jobs ↔ Database
**Direction**: Job → Database
**Mechanism**: Direct Prisma queries with `withTenant`
**Data Flow**:
- Job queries tenants to process (e.g., all active tenants)
- For each tenant, set context with `withTenant(tenantId, ...)`
- Execute business logic (health scoring, webhook delivery)
- Update job status in database
- Log execution metadata for monitoring

**Dependencies**:
- Jobs depend on Prisma schema and connection pool
- Scheduler (cron) depends on job entry points
- Jobs must handle errors gracefully (retry logic)

---

### 7.7 Webhook System ↔ External APIs
**Direction**: Bidirectional
**Mechanism**: HTTP POST requests + database queue
**Data Flow**:
- Platform events trigger webhook creation in `WebhookEvent` table
- Background worker queries pending deliveries
- Worker POSTs payload to subscriber URL
- Records response in `WebhookDelivery` (status, attempts)
- Retries on failure with exponential backoff
- Inbound webhooks hit `/api/webhooks/[provider]` endpoints

**Dependencies**:
- Webhook worker depends on `WebhookSubscription` and `IntegrationToken` tables
- External APIs must return proper HTTP status codes
- Platform must expose webhook endpoints for inbound events

---

## 8. Post-MVP Enhancements (Deferred)

### 8.1 Multi-Tenant Admin Portal
**Timeline**: Post-launch (Q2 2026)
- Tenant provisioning and configuration
- User management across tenants
- System-wide analytics and monitoring
- Billing and usage tracking

### 8.2 Mobile App (React Native)
**Timeline**: Q3 2026
- Native iOS/Android apps
- Offline order entry
- Push notifications for alerts
- Mobile-optimized AI chat

### 8.3 Advanced Integrations
**Timeline**: Q2-Q3 2026
- Accounting systems (QuickBooks, Xero)
- CRM platforms (Salesforce, HubSpot)
- ERP systems (NetSuite, Sage)
- POS integrations for on-premise sales

### 8.4 Enhanced AI Features
**Timeline**: Ongoing post-launch
- Predictive analytics (demand forecasting)
- Automated email drafting for outreach
- Voice interface (speech-to-text queries)
- Multi-language support

### 8.5 White-Label Capabilities
**Timeline**: Q4 2026
- Custom branding per tenant
- Configurable feature flags
- Tenant-specific workflows
- Custom domain support

---

## 9. Success Metrics

### 9.1 Technical Metrics
- **API Response Time**: p95 < 500ms
- **Database Query Performance**: p95 < 200ms
- **Frontend Page Load**: First Contentful Paint < 1.5s
- **Test Coverage**: >80% unit, >70% integration
- **Error Rate**: <1% of all requests
- **Uptime**: >99.5% monthly

### 9.2 Business Metrics (Well Crafted)
- **Sales Rep Adoption**: >90% active users within 30 days
- **Order Accuracy**: <2% order correction rate
- **Time Savings**: 3+ hours/week per rep (vs. spreadsheets)
- **At-Risk Detection**: Identify >80% of slipping accounts
- **Sample ROI**: Prove 3:1 sample-to-order conversion

### 9.3 AI Copilot Metrics
- **Briefing Accuracy**: >85% user-reported relevance
- **Chat Response Time**: <5s for 90% of queries
- **Query Success Rate**: >75% of questions answered correctly
- **Daily Active Users**: >60% of portal users engage with Leora

---

## 10. Next Steps for Development Team

### Immediate Actions (Week 1)
1. **Setup**:
   - [ ] Initialize Next.js 15 repository with TypeScript
   - [ ] Configure ESLint, Prettier, Git hooks
   - [ ] Set up Vercel project and link repository
   - [ ] Create `.env.example` with all variables from blueprint

2. **Database**:
   - [ ] Copy Prisma schema from existing codebase
   - [ ] Test connection to Supabase with pooled URL
   - [ ] Run existing migrations against Supabase
   - [ ] Verify tenant isolation with test queries

3. **Design System**:
   - [ ] Configure Tailwind CSS 4
   - [ ] Import brand tokens from press kit
   - [ ] Install and configure shadcn/ui
   - [ ] Test dark mode theme switching

4. **CI/CD**:
   - [ ] Set up GitHub Actions for lint/test
   - [ ] Configure Vercel auto-deployment
   - [ ] Add environment secrets via Vercel CLI
   - [ ] Test deployment pipeline with hello-world

### Week 2-3 Focus
- [ ] Implement complete authentication system (JWT, cookies, session)
- [ ] Build API middleware (`withTenant`, `withPortalUser`, RBAC)
- [ ] Create portal layout and navigation components
- [ ] Deploy staging environment for team testing

### Week 4+ Focus
- [ ] Build core commerce APIs (products, orders, invoices, cart)
- [ ] Implement intelligence layer (health engine, pricing, samples)
- [ ] Wire UI components to APIs with TanStack Query
- [ ] Begin AI Copilot integration (OpenAI wrapper, briefing job)

---

## Conclusion

This implementation strategy provides a clear roadmap for rebuilding Leora Platform with a focus on:

1. **Multi-tenant architecture** from day one
2. **Security and data isolation** as non-negotiables
3. **Well Crafted customer needs** as the priority guide
4. **AI Copilot integration** as a core differentiator
5. **Scalable foundations** for future distributor tenants

By following the phased approach and respecting critical path dependencies, the team can deliver a production-ready MVP within 10-11 weeks while maintaining high code quality and system reliability.

---

**Document Status**: ✅ Complete
**Next Review**: After Phase 1 completion
**Owner**: Architecture Team
**Last Updated**: October 15, 2025
