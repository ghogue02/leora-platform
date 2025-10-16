# Leora Platform - Architecture Diagrams

**Version**: 1.0
**Date**: October 15, 2025

## Overview

This document contains text-based architecture diagrams for the Leora Platform, illustrating system flows, data structures, and component interactions.

---

## 1. Multi-Tenant Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                                │
│  Browser → https://leora.app/portal/orders                          │
│  Headers: { Cookie: accessToken=<jwt> }                             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS EDGE MIDDLEWARE                          │
│  - Validate JWT from cookie                                         │
│  - Extract tenantId from JWT payload                                │
│  - Add X-Tenant-Id header to request                                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   API ROUTE HANDLER                                  │
│  /app/api/portal/orders/route.ts                                    │
│  - Call withTenantFromRequest(request)                              │
│  - Extract tenantId from header or default                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  TENANT CONTEXT MIDDLEWARE                           │
│  withTenant(tenantId, async (prisma) => {                           │
│    // All queries in this scope are tenant-scoped                   │
│  })                                                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PRISMA SESSION SETUP                              │
│  await prisma.$executeRaw`                                           │
│    SELECT set_config(                                                │
│      'app.current_tenant_id',                                        │
│      ${tenantId},                                                    │
│      false -- Transaction-scoped                                     │
│    )                                                                 │
│  `                                                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PRISMA QUERY EXECUTION                            │
│  const orders = await prisma.order.findMany({                        │
│    where: { portalUserId: userId },                                 │
│    include: { orderLines: true }                                    │
│  })                                                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SUPABASE POSTGRES (RLS ACTIVE)                          │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ Table: orders                                          │         │
│  │ RLS Policy: tenant_isolation                           │         │
│  │                                                         │         │
│  │ CREATE POLICY tenant_isolation ON orders               │         │
│  │   FOR ALL                                              │         │
│  │   USING (                                              │         │
│  │     tenant_id = current_setting(                       │         │
│  │       'app.current_tenant_id'                          │         │
│  │     )::uuid                                            │         │
│  │   );                                                   │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                      │
│  Query Rewritten:                                                    │
│  SELECT * FROM orders                                                │
│  WHERE tenant_id = 'abc-123-tenant'                                  │
│    AND portal_user_id = 'user-456'                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FILTERED RESULTS                                  │
│  - Only orders for tenant 'abc-123-tenant' returned                 │
│  - Data isolation enforced at database level                        │
│  - No application-level filtering needed                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API RESPONSE                                      │
│  {                                                                   │
│    "success": true,                                                  │
│    "data": {                                                         │
│      "orders": [...],                                                │
│      "meta": { "total": 42, "page": 1 }                             │
│    }                                                                 │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Points**:
- Tenant ID extracted from JWT on every request
- Session parameter set before all Prisma queries
- RLS policies provide defense-in-depth at database level
- No tenant leakage possible even with application bugs

---

## 2. Authentication & Session Management

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  Client  │
    │ (Browser)│
    └────┬─────┘
         │
         │ POST /api/portal/auth/login
         │ { email, password }
         ▼
    ┌─────────────────────────────────────────────┐
    │     API Route: /api/portal/auth/login      │
    ├─────────────────────────────────────────────┤
    │ 1. Rate Limit Check (5 attempts/15 min)    │
    │ 2. Query PortalUser by email + tenantId    │
    │ 3. Verify password (bcrypt compare)        │
    │ 4. Check account lockout status            │
    └────┬────────────────────────────────────────┘
         │
         ▼ (Success)
    ┌─────────────────────────────────────────────┐
    │         JWT Token Generation                │
    ├─────────────────────────────────────────────┤
    │ accessToken = sign({                        │
    │   userId, tenantId, roles, permissions      │
    │ }, JWT_SECRET, { expiresIn: '15m' })        │
    │                                             │
    │ refreshToken = sign({                       │
    │   userId, sessionId                         │
    │ }, JWT_SECRET, { expiresIn: '7d' })         │
    └────┬────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────┐
    │       Set HTTP-Only Secure Cookies          │
    ├─────────────────────────────────────────────┤
    │ Set-Cookie: accessToken=<jwt>;              │
    │   HttpOnly; Secure; SameSite=Strict;        │
    │   Path=/; Max-Age=900                       │
    │                                             │
    │ Set-Cookie: refreshToken=<jwt>;             │
    │   HttpOnly; Secure; SameSite=Strict;        │
    │   Path=/; Max-Age=604800                    │
    └────┬────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────┐
    │      Create PortalSession Record            │
    ├─────────────────────────────────────────────┤
    │ INSERT INTO portal_sessions (               │
    │   id, user_id, tenant_id,                   │
    │   refresh_token_hash, ip_address,           │
    │   user_agent, expires_at                    │
    │ )                                           │
    └────┬────────────────────────────────────────┘
         │
         │ Response: { success: true, user: {...} }
         ▼
    ┌──────────┐
    │  Client  │  Cookies stored automatically
    └──────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATED REQUEST FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  Client  │
    └────┬─────┘
         │
         │ GET /api/portal/orders
         │ Headers: { Cookie: accessToken=<jwt> }
         ▼
    ┌─────────────────────────────────────────────┐
    │         API Route Handler                   │
    ├─────────────────────────────────────────────┤
    │ 1. Extract accessToken from cookies         │
    │ 2. Verify JWT signature                     │
    │ 3. Check expiration                         │
    └────┬────────────────────────────────────────┘
         │
         ▼ (Valid Token)
    ┌─────────────────────────────────────────────┐
    │       Extract User Context                  │
    ├─────────────────────────────────────────────┤
    │ payload = {                                 │
    │   userId: "user-123",                       │
    │   tenantId: "tenant-abc",                   │
    │   roles: ["portal_user"],                   │
    │   permissions: ["orders.read"]              │
    │ }                                           │
    └────┬────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────┐
    │        Execute Business Logic               │
    │    (With tenant context & permissions)      │
    └─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  Client  │  accessToken expired (15 min)
    └────┬─────┘
         │
         │ GET /api/portal/orders
         │ Cookies: accessToken (expired), refreshToken (valid)
         ▼
    ┌─────────────────────────────────────────────┐
    │         Middleware Detects Expiry           │
    ├─────────────────────────────────────────────┤
    │ - JWT verification fails (expired)          │
    │ - Return 401 Unauthorized                   │
    └────┬────────────────────────────────────────┘
         │
         │ 401 Response
         ▼
    ┌──────────┐
    │  Client  │  PortalSessionProvider intercepts 401
    │ (React)  │
    └────┬─────┘
         │
         │ POST /api/portal/auth/refresh
         │ Cookies: refreshToken=<jwt>
         ▼
    ┌─────────────────────────────────────────────┐
    │    API Route: /api/portal/auth/refresh     │
    ├─────────────────────────────────────────────┤
    │ 1. Extract refreshToken from cookies        │
    │ 2. Verify JWT signature & expiration        │
    │ 3. Query PortalSession by sessionId         │
    │ 4. Verify session is active                 │
    └────┬────────────────────────────────────────┘
         │
         ▼ (Valid Refresh Token)
    ┌─────────────────────────────────────────────┐
    │      Issue New Access Token                 │
    ├─────────────────────────────────────────────┤
    │ newAccessToken = sign({                     │
    │   userId, tenantId, roles, permissions      │
    │ }, JWT_SECRET, { expiresIn: '15m' })        │
    │                                             │
    │ Set-Cookie: accessToken=<new-jwt>;          │
    │   HttpOnly; Secure; SameSite=Strict         │
    └────┬────────────────────────────────────────┘
         │
         │ Response: { success: true }
         ▼
    ┌──────────┐
    │  Client  │  Retry original request with new token
    └──────────┘
```

**Security Measures**:
- ✅ Passwords hashed with bcrypt (cost factor 12)
- ✅ JWTs signed with HS256 (minimum 32-char secret)
- ✅ HTTP-only cookies prevent XSS theft
- ✅ Secure flag ensures HTTPS-only transmission
- ✅ SameSite=Strict prevents CSRF attacks
- ✅ Short access token lifetime (15 min)
- ✅ Longer refresh token lifetime (7 days)
- ✅ Rate limiting on login endpoint
- ✅ Account lockout after failed attempts

---

## 3. API Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API REQUEST LIFECYCLE                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  React Component │
│  + TanStack Query│
└────────┬─────────┘
         │
         │ useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT FETCH LAYER                              │
│  async function fetchOrders(filters) {                               │
│    const response = await fetch('/api/portal/orders?' + params, {   │
│      credentials: 'include', // Pass cookies automatically          │
│      headers: { 'Content-Type': 'application/json' }                │
│    });                                                               │
│    if (!response.ok) throw new Error(response.statusText);          │
│    return response.json();                                           │
│  }                                                                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         │ HTTP Request
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   NEXT.JS API ROUTE HANDLER                          │
│  /app/api/portal/orders/route.ts                                    │
│                                                                      │
│  export async function GET(request: Request) {                      │
│    // Middleware stack executed in order                            │
│  }                                                                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER 1                                │
│  withTenantFromRequest(request)                                      │
│  ┌──────────────────────────────────────────────┐                   │
│  │ 1. Extract X-Tenant-Id header OR             │                   │
│  │ 2. Extract from JWT payload OR               │                   │
│  │ 3. Use DEFAULT_TENANT_SLUG                   │                   │
│  │                                              │                   │
│  │ Result: tenantId = "well-crafted"           │                   │
│  └──────────────────────────────────────────────┘                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER 2                                │
│  withPortalUserFromRequest(request)                                  │
│  ┌──────────────────────────────────────────────┐                   │
│  │ 1. Validate JWT from cookies                │                   │
│  │ 2. Extract userId from payload              │                   │
│  │ 3. Query PortalUser by userId + tenantId    │                   │
│  │ 4. Auto-provision if DEFAULT_PORTAL_USER_KEY│                   │
│  │                                              │                   │
│  │ Result: portalUser = { id, roles, ... }     │                   │
│  └──────────────────────────────────────────────┘                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER 3                                │
│  requirePortalPermission('orders.read')                              │
│  ┌──────────────────────────────────────────────┐                   │
│  │ 1. Check portalUser.permissions array        │                   │
│  │ 2. Verify 'orders.read' is present          │                   │
│  │ 3. If missing, return 403 Forbidden          │                   │
│  │                                              │                   │
│  │ Result: Permission granted                   │                   │
│  └──────────────────────────────────────────────┘                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                                │
│  const orders = await orderService.getOrders({                       │
│    tenantId,                                                         │
│    userId: portalUser.id,                                            │
│    filters: parseFilters(request.url)                               │
│  });                                                                 │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                                      │
│  lib/services/orders.ts                                              │
│  ┌──────────────────────────────────────────────┐                   │
│  │ export async function getOrders(input) {     │                   │
│  │   // Validate input with Zod                │                   │
│  │   const validated = orderFiltersSchema      │                   │
│  │     .parse(input);                          │                   │
│  │                                              │                   │
│  │   // Execute query with tenant context      │                   │
│  │   return withTenant(tenantId, async (prisma) => {                │
│  │     return prisma.order.findMany({          │                   │
│  │       where: { /* filters */ },             │                   │
│  │       include: { orderLines: true }         │                   │
│  │     });                                      │                   │
│  │   });                                        │                   │
│  │ }                                            │                   │
│  └──────────────────────────────────────────────┘                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PRISMA ORM LAYER                                   │
│  - Set session parameter: app.current_tenant_id                      │
│  - Execute type-safe query                                           │
│  - Return Prisma models                                              │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SUPABASE POSTGRES (RLS)                                 │
│  - Apply RLS policies                                                │
│  - Filter by tenant_id                                               │
│  - Return filtered results                                           │
└────────┬────────────────────────────────────────────────────────────┘
         │
         │ Array<Order>
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  RESPONSE FORMATTING                                 │
│  const response = {                                                  │
│    success: true,                                                    │
│    data: {                                                           │
│      orders: orders.map(formatOrder),                               │
│      meta: {                                                         │
│        total: count,                                                 │
│        page: filters.page,                                           │
│        limit: filters.limit,                                         │
│        totalPages: Math.ceil(count / filters.limit)                 │
│      }                                                               │
│    }                                                                 │
│  };                                                                  │
│                                                                      │
│  return Response.json(response, { status: 200 });                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         │ HTTP Response
         ▼
┌──────────────────┐
│  React Component │  TanStack Query caches response
│  renders orders  │
└──────────────────┘
```

**API Response Contract**:
```typescript
// Success
{
  "success": true,
  "data": { /* response data */ },
  "meta": { /* pagination, timestamps, etc. */ }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": { "field": "status", "issue": "Invalid enum value" }
  }
}
```

---

## 4. AI Copilot Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROACTIVE BRIEFING GENERATION                    │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────┐
│  Cron Scheduler│  Daily at 6 AM (tenant local time)
│  (Vercel Cron) │
└───────┬────────┘
        │
        │ Trigger: GET /api/cron/generate-briefings
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BRIEFING GENERATION JOB                                 │
│  app/workers/briefing-generator.ts                                   │
│                                                                      │
│  1. Query all active tenants                                         │
│  2. For each tenant, query all portal users                         │
│  3. Generate briefing per user                                       │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│               GATHER METRICS FROM SERVICES                           │
│  ┌──────────────────────────────────────────────┐                   │
│  │ // Customer Health                           │                   │
│  │ const healthScores = await healthEngineService│                   │
│  │   .getHealthScores(tenantId, { limit: 10 });│                   │
│  │                                              │                   │
│  │ // Ordering Pace Deviations                 │                   │
│  │ const paceDeviations = await paceDetectionService                │
│  │   .getDeviations(tenantId, { threshold: 0.8 });                 │
│  │                                              │                   │
│  │ // Revenue Trends                            │                   │
│  │ const revenueTrends = await insightsService │                   │
│  │   .getRevenueTrends(tenantId, { days: 30 });│                   │
│  │                                              │                   │
│  │ // Sample Allowances                         │                   │
│  │ const sampleStatus = await sampleManagementService               │
│  │   .getAllowanceStatus(tenantId, userId);    │                   │
│  │                                              │                   │
│  │ // Pipeline Gaps                             │                   │
│  │ const pipelineGaps = await callPlanService  │                   │
│  │   .getUnscheduledAccounts(tenantId, userId);│                   │
│  └──────────────────────────────────────────────┘                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                CONSTRUCT AI PROMPT                                   │
│  const prompt = buildBriefingPrompt({                                │
│    tenant: { name: "Well Crafted", id: "..." },                     │
│    user: { name: "John Doe", role: "Sales Rep" },                   │
│    metrics: {                                                        │
│      healthScores: [                                                 │
│        { customer: "Harborview Cellars", score: 45, trend: "down" },│
│        { customer: "Oak & Vine", score: 78, trend: "stable" }       │
│      ],                                                              │
│      paceDeviations: [                                               │
│        { customer: "Harborview", expected: "7 days", actual: "19 days", risk: "high" }│
│      ],                                                              │
│      revenueTrends: { current: 42500, previous: 48200, change: -11.8 },│
│      sampleStatus: { used: 45, limit: 60, remaining: 15 },          │
│      pipelineGaps: 8 // unscheduled accounts                         │
│    },                                                                │
│    timeframe: { start: "2025-09-15", end: "2025-10-15" }            │
│  });                                                                 │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CALL GPT-5 API                                    │
│  const response = await openai.chat.completions.create({             │
│    model: 'gpt-5',                                                   │
│    temperature: 0.3, // Deterministic insights                      │
│    max_tokens: 500,                                                  │
│    messages: [                                                       │
│      {                                                               │
│        role: 'system',                                               │
│        content: 'You are Leora, a warm, assured, succinct AI assistant│
│                 for beverage alcohol distributors. Provide clarity   │
│                 you can act on. No emojis. Active voice. Short sentences.'│
│      },                                                              │
│      { role: 'user', content: prompt }                               │
│    ]                                                                 │
│  });                                                                 │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                PARSE GPT-5 RESPONSE                                  │
│  const briefing = {                                                  │
│    summary: response.choices[0].message.content,                     │
│    keyMetrics: [                                                     │
│      { label: "At-Risk Accounts", value: "3", trend: "up" },        │
│      { label: "Revenue (30d)", value: "$42.5K", trend: "down" },    │
│      { label: "Samples Remaining", value: "15", trend: "stable" }   │
│    ],                                                                │
│    recommendedActions: [                                             │
│      {                                                               │
│        title: "Visit Harborview Cellars",                            │
│        description: "12 days overdue on their typical 7-day pace",  │
│        priority: "high",                                             │
│        url: "/portal/customers/harborview"                           │
│      },                                                              │
│      {                                                               │
│        title: "Schedule pipeline calls",                             │
│        description: "8 accounts need visit scheduling this week",   │
│        priority: "medium",                                           │
│        url: "/portal/call-plans"                                     │
│      }                                                               │
│    ],                                                                │
│    confidence: 0.89,                                                 │
│    sourceDatasets: ["health-123", "pace-456", "revenue-789"],       │
│    generatedAt: new Date().toISOString()                             │
│  };                                                                  │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                CACHE BRIEFING RESULT                                 │
│  await cacheBriefing(tenantId, userId, briefing, {                   │
│    ttl: 86400, // 24 hours                                           │
│    invalidateOn: ['order.created', 'health.updated', 'activity.completed']│
│  });                                                                 │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 STORE IN DATABASE                                    │
│  await prisma.aiBriefing.create({                                    │
│    data: {                                                           │
│      tenantId,                                                       │
│      userId,                                                         │
│      content: briefing,                                              │
│      generatedAt: new Date(),                                        │
│      expiresAt: new Date(Date.now() + 86400000)                     │
│    }                                                                 │
│  });                                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    USER VIEWS DASHBOARD                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  User Navigates  │
│  to Dashboard    │
└────────┬─────────┘
         │
         │ GET /portal/dashboard
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              DASHBOARD PAGE COMPONENT                                │
│  const { data: briefing } = useQuery({                               │
│    queryKey: ['briefing'],                                           │
│    queryFn: () => fetch('/api/leora/briefing').then(r => r.json())  │
│  });                                                                 │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BRIEFING API ENDPOINT                                   │
│  GET /api/leora/briefing                                             │
│  ┌──────────────────────────────────────────────┐                   │
│  │ 1. Check cache for existing briefing         │                   │
│  │ 2. If fresh (< 24h), return cached           │                   │
│  │ 3. If stale, trigger regeneration            │                   │
│  └──────────────────────────────────────────────┘                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         │ Cached briefing returned
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  RENDER BRIEFING CARD                                │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                    Today's Briefing                              ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ││
│  │                                                                  ││
│  │  {briefing.summary}                                              ││
│  │                                                                  ││
│  │  Key Metrics:                                                    ││
│  │  • At-Risk Accounts: 3 ↑                                         ││
│  │  • Revenue (30d): $42.5K ↓                                       ││
│  │  • Samples Remaining: 15 →                                       ││
│  │                                                                  ││
│  │  Recommended Actions:                                            ││
│  │  🔴 Visit Harborview Cellars (12 days overdue)  [View Account]  ││
│  │  🟡 Schedule pipeline calls (8 accounts)        [View Call Plan]││
│  │                                                                  ││
│  │  Ask Leora: "Show me top opportunities this week"               ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Conversational Chat Flow**:
```
User: "Which customers slipped pace this week?"
  ↓
POST /api/leora/chat { message: "..." }
  ↓
1. Intent Classification (GPT-5 function calling)
   → Intent: "query_pace_deviations"
   → Parameters: { timeframe: "week", threshold: "slipped" }
  ↓
2. Execute SQL Template (whitelisted query)
   → SELECT * FROM pace_deviations WHERE ...
  ↓
3. Format Results + Send to GPT-5
   → "Here are the results: [data]. Format as conversational answer."
  ↓
4. Return AI Response + Drill-Down Links
   → "3 customers slipped their typical pace this week:
      • Harborview Cellars (usually 7 days, now 19)
      • Oak & Vine (usually 14 days, now 22)
      • Valley View Wines (usually 10 days, now 17)
      [View full report]"
```

**Fallback Strategy**:
```
If GPT-5 unavailable:
  ↓
1. Check cached briefing (even if stale)
2. Display with warning: "AI briefing temporarily unavailable"
3. Show raw metrics in structured format
4. Provide manual navigation links
```

---

## 5. System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LEORA PLATFORM                               │
│                      SYSTEM ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────── CLIENT TIER ─────────────────────────────┐
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Browser    │  │   Mobile     │  │  External    │                │
│  │   (React)    │  │   (Future)   │  │  API Client  │                │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                │
│         │                 │                  │                        │
│         └─────────────────┴──────────────────┘                        │
│                           │                                           │
└───────────────────────────┼───────────────────────────────────────────┘
                            │ HTTPS
                            │
┌───────────────────────────┼─── APPLICATION TIER ──────────────────────┐
│                           │                                           │
│  ┌────────────────────────▼────────────────────────┐                 │
│  │         NEXT.JS 15 APP ROUTER                   │                 │
│  │  ┌──────────────────────────────────────────┐   │                 │
│  │  │  App Routes (UI Pages)                   │   │                 │
│  │  │  • /portal/dashboard                     │   │                 │
│  │  │  • /portal/orders                        │   │                 │
│  │  │  • /portal/products                      │   │                 │
│  │  │  • /portal/leora (AI chat)               │   │                 │
│  │  └──────────────────────────────────────────┘   │                 │
│  │                                                  │                 │
│  │  ┌──────────────────────────────────────────┐   │                 │
│  │  │  API Routes                              │   │                 │
│  │  │  • /api/portal/auth/*                    │   │                 │
│  │  │  • /api/portal/orders/*                  │   │                 │
│  │  │  • /api/portal/products/*                │   │                 │
│  │  │  • /api/leora/chat                       │   │                 │
│  │  │  • /api/leora/briefing                   │   │                 │
│  │  └──────────────────────────────────────────┘   │                 │
│  └──────────────────────┬───────────────────────────┘                 │
│                         │                                             │
│  ┌──────────────────────▼───────────────────────┐                    │
│  │       BUSINESS LOGIC SERVICES                │                    │
│  │  ┌────────────────────────────────────────┐  │                    │
│  │  │ • Order Service                        │  │                    │
│  │  │ • Product Service                      │  │                    │
│  │  │ • Health Engine                        │  │                    │
│  │  │ • Pricing Waterfall                    │  │                    │
│  │  │ • Sample Management                    │  │                    │
│  │  │ • Pace Detection                       │  │                    │
│  │  │ • Insights Service                     │  │                    │
│  │  └────────────────────────────────────────┘  │                    │
│  └──────────────────────┬───────────────────────┘                    │
│                         │                                             │
└─────────────────────────┼─────────────────────────────────────────────┘
                          │
┌─────────────────────────┼─── INTEGRATION TIER ──────────────────────┐
│                         │                                            │
│  ┌──────────────────────▼──────────────┐  ┌──────────────────────┐  │
│  │      PRISMA ORM                     │  │   OPENAI GPT-5       │  │
│  │  • Type-safe queries                │  │   • Chat API         │  │
│  │  • withTenant helper                │  │   • Completions      │  │
│  │  • Connection pooling               │  │   • Token tracking   │  │
│  └──────────────────────┬──────────────┘  └──────────┬───────────┘  │
│                         │                            │              │
└─────────────────────────┼────────────────────────────┼──────────────┘
                          │                            │
┌─────────────────────────┼───── DATA TIER ────────────┼──────────────┐
│                         │                            │              │
│  ┌──────────────────────▼────────────────────────┐   │              │
│  │     SUPABASE POSTGRES (RLS ENABLED)           │   │              │
│  │  ┌──────────────────────────────────────────┐ │   │              │
│  │  │  Core Tables:                            │ │   │              │
│  │  │  • tenants                               │ │   │              │
│  │  │  • portal_users                          │ │   │              │
│  │  │  • portal_sessions                       │ │   │              │
│  │  │  • orders, order_lines                   │ │   │              │
│  │  │  • products, skus, inventory             │ │   │              │
│  │  │  • invoices, payments                    │ │   │              │
│  │  │  • customers, companies                  │ │   │              │
│  │  │  • activities, call_plans                │ │   │              │
│  │  │  • account_health_snapshots              │ │   │              │
│  │  │  • webhook_subscriptions, deliveries     │ │   │              │
│  │  └──────────────────────────────────────────┘ │   │              │
│  └───────────────────────────────────────────────┘   │              │
│                                                       │              │
│  ┌────────────────────────────────────────────────┐  │              │
│  │         REDIS CACHE (Future)                   │  │              │
│  │  • Session cache                               │  │              │
│  │  • AI response cache                           │  │              │
│  │  • Query result cache                          │  │              │
│  └────────────────────────────────────────────────┘  │              │
│                                                       │              │
└───────────────────────────────────────────────────────┼──────────────┘
                                                        │
┌───────────────────────────── BACKGROUND JOBS ─────────┼──────────────┐
│                                                       │              │
│  ┌────────────────────────────────────────────────┐  │              │
│  │  Cron Workers (Vercel Cron)                    │  │              │
│  │  • webhook-delivery.ts (every 5 min)           │  │              │
│  │  • health-scoring.ts (daily)                   │  │              │
│  │  • briefing-generator.ts (daily 6 AM)          │──┘              │
│  │  • pace-detection.ts (daily)                   │                 │
│  │  • sample-reconciliation.ts (daily)            │                 │
│  └────────────────────────────────────────────────┘                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────── EXTERNAL INTEGRATIONS ─────────────────────────┐
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │  Accounting  │  │     CRM      │  │   Payment    │                │
│  │  (Future)    │  │   (Future)   │  │   Gateway    │                │
│  │  QuickBooks  │  │  Salesforce  │  │   Stripe     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Email      │  │  Monitoring  │  │   Analytics  │                │
│  │   Resend     │  │    Sentry    │  │   PostHog    │                │
│  │  (Future)    │  │   (Future)   │  │   (Future)   │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                             │
│                      (Vercel + Supabase)                             │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         USERS                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Browser  │  │ Browser  │  │ Browser  │  │   API    │           │
│  │   US     │  │   EU     │  │   APAC   │  │  Client  │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
└───────┼─────────────┼─────────────┼─────────────┼─────────────────┘
        │             │             │             │
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │ HTTPS
                      │
┌─────────────────────▼─────────────────────────────────────────────┐
│                   VERCEL GLOBAL EDGE NETWORK                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  CDN + Edge Middleware                                       │ │
│  │  • SSL/TLS Termination                                       │ │
│  │  • DDoS Protection                                           │ │
│  │  • Static Asset Caching                                      │ │
│  │  • Geographic routing                                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────┬──────────────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────────────┐
│                VERCEL SERVERLESS FUNCTIONS                         │
│                    (us-east-1)                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Next.js App Router Instances                                │ │
│  │  • Auto-scaling (0-∞)                                        │ │
│  │  • Cold start optimization                                   │ │
│  │  • Automatic deployments (Git push)                          │ │
│  │  • Environment: Node 20 runtime                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Cron Functions                                              │ │
│  │  • webhook-delivery (*/5 * * * *)                            │ │
│  │  • health-scoring (0 6 * * *)                                │ │
│  │  • briefing-generator (0 6 * * *)                            │ │
│  │  • pace-detection (0 7 * * *)                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     │ Connection Pool
                     │
┌────────────────────▼──────────────────────────────────────────────┐
│                   SUPABASE POSTGRES                                │
│                    (us-east-2)                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Connection Pooler (pgBouncer)                               │ │
│  │  • Transaction mode                                          │ │
│  │  • Max connections: 100                                      │ │
│  │  • Pool size: 20                                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL 15                                               │ │
│  │  • Dedicated CPU: 4 cores                                    │ │
│  │  • Memory: 8 GB                                              │ │
│  │  • Storage: 500 GB SSD                                       │ │
│  │  • Daily automated backups (7-day retention)                 │ │
│  │  • Point-in-time recovery (PITR)                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │   OpenAI GPT-5   │  │   GitHub Actions │  │   Vercel CLI    │  │
│  │   • AI inference │  │   • CI/CD        │  │   • Deployments │  │
│  │   • Rate limits  │  │   • Testing      │  │   • Env vars    │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                    MONITORING & LOGGING                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Vercel Analytics│  │   Sentry (Future)│  │ PostHog (Future)│  │
│  │  • Performance   │  │   • Error tracking│  │ • User analytics│  │
│  │  • Real User Mon │  │   • Alerting     │  │ • Feature flags │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Deployment Environments**:
- **Production**: `leora.app` (main branch → auto-deploy)
- **Staging**: `staging.leora.app` (develop branch → auto-deploy)
- **Preview**: `pr-123.leora.vercel.app` (PR branches → auto-deploy)
- **Local**: `localhost:3000` (developer machines)

---

## Conclusion

These text-based diagrams provide visual representation of:

1. ✅ Multi-tenant data isolation flow
2. ✅ Authentication and session management
3. ✅ API layer middleware stack
4. ✅ AI Copilot integration architecture
5. ✅ System component relationships
6. ✅ Production deployment topology

Use these diagrams as reference during implementation and architecture reviews.

---

**Document Status**: ✅ Complete
**Owner**: Architecture Team
**Last Updated**: October 15, 2025
