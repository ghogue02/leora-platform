# Leora Platform Blueprint

Comprehensive architecture, infrastructure, and implementation guidance for delivering the Sales Rep Hub / customer portal from a clean repository while retaining existing Supabase assets and deployment secrets.

---

## 1. Platform Vision & Scope

- **Product name** – **Leora**  
- **Primary tagline** – *Clarity you can act on.*  
- **Supporting lines** – “Ask Leora.” • “Light for your operations.” • “See the next move.”
- **Voice** – Warm, assured, to the point. Short sentences. Active verbs. Skip jargon.
- **Visual guidelines** – No emojis in UI or copy. Use Lucide icons sparingly, matching the brand (outline variants only).
- **Product focus** – Multi-tenant, API-first system of record (SoR) for beverage alcohol distributors with customer self-service portal, sales intelligence, compliance automation, and integrations (see `docs/Spec-file.md` for full business specification).
- **First customer** – Well Crafted is the launch tenant and live data source. The database already contains their real datasets in Supabase; never substitute mock data. If a screen has no data, display explicit “no data” prompts and guide users to connect feeds instead of seeding fake values.
- **Scalability** – Architect every module to support multiple tenants. Tenant-aware RBAC, data isolation, and automation must generalize so additional distributors can onboard once Well Crafted’s build proves the concept.
- **Personas** – Internal sales reps/managers, portal buyers (B2B customers), platform admins, and integration partners.
- **Key capabilities** – Product catalog, cart & checkout, order & invoice visibility, analytics/insights, account management, activity planning, health scoring, pricing engine, webhook automation.

### 1.1 In-Product Microcopy (Drop-in)

- **Search placeholder** – “Ask Leora: ‘show sell-through by region last 30 days’”
- **Analytics empty state** – “No data yet. Connect your distributor feeds to light this up.”
- **Success toast** – “Allocation updated. Ask Leora to confirm fill rate.”
- **Error nudge** – “I can’t see that account yet. Add permissions or ask Leora where to start.”

### 1.2 Problem Context (from Travis)

Travis (Well Crafted founder) needs Leora to eliminate blind spots in daily distributor operations:

- **Ordering cadence is opaque.** Reps currently rely on memory/spreadsheets. Leora must calculate each account’s established pace automatically from order history (average interval across recent fulfilled orders) and flag risk as soon as a customer slips their normal cycle.
- **Revenue health slips unnoticed.** After at least three delivered orders, flag accounts when current monthly revenue drops ≥15% below their established average. Make the threshold configurable at the tenant level.
- **Samples lack accountability.** Today samples are booked as $0 invoices to “Rep Name Samples” and disappear from inventory. Leora should treat samples as trackable inventory transfers, capture tasting feedback on follow-up activities, and enforce monthly sample allowances (default 60 pulls per rep with manager approval beyond that).
- **Managers need instant clarity.** Weekly customers missing a delivery should alert sales leadership immediately. Dashboards and call plans should surface “due now,” “at risk,” and recommended next steps without manual data entry.
- **Strategic selling guidance is missing.** Client pages must show top opportunities—e.g., “Top 20” products the customer hasn’t yet purchased—using toggles for revenue, volume, or customer penetration, refreshed on a six-month rolling window.
- **Reps resist manual administration.** Nearly every data point (pace, health, sample logging) should be automated or prompted contextually while completing real work, so adoption doesn’t hinge on manual tagging.
- **Pilot now, scale later.** Think tenant-first even while building for Well Crafted: schemas, APIs, and policies must carry forward to new distributor tenants without rework. Plan the initial implementation around Well Crafted’s workflows, but don’t hardcode assumptions that block expansion.

Leora’s purpose is to deliver “clarity you can act on” for these pain points: see the next move, intervene before attrition, and prove the value of sampling and outreach with hard data.

---

### 1.3 Brand System Summary

Reference assets: `/Leora_Brand_Press_Kit/` (v0.2).

- **Identity marks** – Use the official wordmark (`logos/svg/leora_wordmark_dark.svg` or light variant) and spark icon. Do not redraw or apply drop shadows. For web favicons, follow the press kit instructions (`leora_spark.svg` at `/favicon.svg`, `icons/favicon-512.png` fallback).
- **Color palette** – Core palette: Ivory `#F9F7F3`, Ink `#0B0B0B`, Gold `#C8A848`, Slate `#5B6573`, Panel `#FFFFFF`, Border `#E9E5DE`. Support hues: Indigo `#2F35A0`, Indigo Light `#3D43B7`, Sage `#7C8C6E`, Clay `#C8714A`, Sand `#D7C8B6`. Dark surfaces use `#0B0B0B` background, `#121212` panels, `#2A2A2A` borders, `#FFFFFF` text. Keep spark Gold on dark backgrounds; avoid using Gold for body text.
- **Typography** – Primary stack: Inter (fallback DejaVu Sans). Base sizes: Display 56, H1 40, H2 32, H3 28, body 18, small 16 with 1.2 scale and leading 1.35. Use Title Case for feature names.
- **Surface & shape** – Default radii: 14px (cards/buttons), 18px for elevated shells. Shadows from tokens CSS (`leora_tokens.css`) should be reused (`card`, `elevated`).
- **Copy rules** – No emojis. Tone warm, assured, succinct. Use MM DD YY date format, thousands with comma (1,234). Lucide icons allowed when outline-only and consistent with brand weight.
- **Trademark usage** – Marketing materials should reference **Leora™**; omit trademark marks inside the product UI.
- **Dark mode** – Follow addendum board: gold spark on dark, panel backgrounds `#121212`, borders `#2A2A2A`. Apply `.theme-dark` tokens for night mode.
- **Assets & tokens** – Include `tokens/leora_tokens.css` or JSON values in the design system; toggle `.theme-dark` for dark surfaces. OG metadata should use `social/og_leora_light.png` (or dark alt).

> No conflicting guidance found between this blueprint and the press kit. If future brand kits introduce changes, update this section and flag deviations.

---

### 1.4 Leora AI Copilot – Vision & Delivery Plan

Leora is not just the brand—it's the intelligent copilot powering the experience. Build the assistant with these pillars in mind:

#### A. Capabilities
- **Proactive briefings** – On every sign-in, generate an account-specific summary panel highlighting overdue orders, revenue movers, sample usage vs budget, upcoming call-plan gaps, and recommended next actions. Summaries must be based solely on Supabase data; when data is missing, show a clear prompt to connect or refresh sources.
- **Conversational analytics** – Provide a natural-language chat surface where users ask questions (“Which customers slipped pace this week?”, “Show sell-through by region last 30 days”). Answers must combine GPT-5 reasoning with verified Supabase query results.
- **Action drill-downs** – Every insight links to deeper dashboards (orders, invoices, health, samples). Leora should propose follow-up tasks (“Schedule a visit with Harborview Cellars—they’re 12 days late.”).

#### B. Technical Architecture
- **Model** – OpenAI `gpt-5`. Engineering must consult the latest OpenAI documentation before implementation to ensure correct endpoints, parameters, and usage limits.
- **Orchestration flow**  
  1. **Insight composer** (scheduled job or on-demand function) gathers structured metrics from Supabase using Prisma, then prompts GPT-5 to craft the narrative card. Cache per tenant/user and invalidate when data changes.  
  2. **Chat router** (`/api/leora/chat`) accepts user prompts, enriches with tenant context, runs whitelisted SQL templates or analytics pipelines, and forwards grounded data plus instructions to GPT-5.  
  3. **Tooling layer** – Optional integration with the enhanced Postgres MCP server for read-only queries, or a custom DSL ensuring GPT-5 only executes approved operations.
- **Response contract** – `{ summary, tables, visualHints, recommendedActions, confidence }`, plus metadata referencing source dataset IDs for auditing.
- **Tone & guardrails** – System prompts must reinforce Leora’s voice: warm, assured, succinct, and honest about data gaps.

#### C. Implementation Phases
1. **Enablement**
   - Store `OPENAI_API_KEY` as an environment secret (never expose client-side).  
   - Create a server-side OpenAI client wrapper handling retries, timeout, streaming, and token usage logging.
2. **Proactive Insights MVP**
   - Build Prisma queries for key metrics (pace deviations, revenue deltas, sample allowance, pipeline gaps).  
   - Schedule a daily/triggered job to compute structured data and call GPT-5 for the dashboard briefing.  
   - Display results on `/portal/dashboard` with “drill down” CTAs.
3. **Chat Prototype**
   - Implement chat UI (panel or dedicated `/portal/leora`).  
   - Add intent classification via GPT-5 function calling or heuristics to map prompts to SQL templates.  
   - Ensure every reply cites real Supabase results; if data is missing, return guidance instead of fabricating values.
4. **Advanced Features**
   - Session memory so follow-up questions maintain context.  
   - Command routing to create tasks, schedule tastings, or trigger notifications via existing APIs.  
   - Confidence scoring and fallback messaging when GPT-5 or data services are unavailable.

#### D. Operational Considerations
- **Cost tracking** – Log token usage per tenant for future billing.  
- **Observability** – Capture prompts/responses (encrypted, tenant-scoped) for audits and tuning.  
- **Fallbacks** – If GPT-5 fails, show cached insights and inform the user that real-time chat is unavailable.  
- **Documentation** – Maintain a dedicated `docs/ai/` directory with prompt templates, model usage notes, and runbooks.

---

## 2. Tech Stack Baseline

| Layer | Technology | Notes |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) | SSR + React Server Components; new repo should default to TypeScript strict mode. |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Tailwind Merge, CVA | Ensure `app/globals.css` uses Tailwind 4 entry point (`@import "tailwindcss"`). |
| State/Data | TanStack Query, Zod, Radix UI | TanStack Query for client data fetching & caching. |
| Backend | Node 20 runtime, Prisma ORM | Single Prisma schema powering Supabase Postgres. |
| Database | Supabase Postgres (`zqezunzlyjkseugujkrl`) | Tenanted schema; RLS required for production. |
| Auth | JWT (access + refresh cookies), NextAuth (planned) | Implement full provider-based auth (temporary manual handling must be removed). |
| Background | Node workers / serverless cron | Webhook delivery worker already implemented. |
| Tooling | Jest, Playwright, ESLint, Prettier | Expand automated coverage throughout implementation. |

---

## 3. Environment Variables & Secrets

> **Keep Supabase credentials unchanged unless rotated; update Vercel and local `.env` accordingly.**

### 3.1 Core Database & Prisma

| Variable | Required | Source / Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | `docs/SUPABASE-CREDENTIALS.md` (direct connection) | Prisma primary connection string. |
| `DIRECT_URL` | ✅ | Same as above (optional pooled URL) | Prisma direct connection for migrations. |
| `SHADOW_DATABASE_URL` | Optional | Create dedicated shadow DB | Required for safe migrations (`prisma migrate`). |
| `PRISMA_GENERATE_SKIP_POSTINSTALL` | Optional | `false` | Control auto-generate on installs if CI demands. |

### 3.2 Authentication & Security

| Variable | Required | Source / Default | Purpose |
| --- | --- | --- | --- |
| `JWT_SECRET` | ✅ | Generate 32+ char secret | Signing access/refresh tokens (`lib/auth/jwt.ts`). |
| `PORTAL_USER_EMAIL_DOMAIN` | Optional | `example.dev` | Domain for auto-provisioned demo portal users. |
| `NEXTAUTH_URL` | Planned | Deployment URL | Needed when NextAuth configured. |
| `NEXTAUTH_SECRET` | Planned | Generate securely | Required for NextAuth session crypto. |

### 3.3 Tenant & Demo Defaults

| Variable | Required | Default Fallback | Purpose |
| --- | --- | --- | --- |
| `DEFAULT_TENANT_SLUG` | ✅ | `well-crafted` | Tenant resolution for requests lacking headers. |
| `DEFAULT_PORTAL_USER_KEY` | ✅ | `dev-portal-user` | Portal auto-provision key (see `withPortalUserFromRequest`). |
| `NEXT_PUBLIC_DEFAULT_TENANT_SLUG` | Optional | inherits server default | Hydrates client portal session. |
| `NEXT_PUBLIC_DEFAULT_PORTAL_USER_ID` | Optional | inherits server default | Matches session defaults. |
| `NEXT_PUBLIC_DEFAULT_PORTAL_USER_EMAIL` | Optional | none | Prepopulate login/demo flows. |
| `NEXT_PUBLIC_DEMO_SALES_REP_ID` | Optional | none | Demo dashboard fallback rep ID. |
| `NEXT_PUBLIC_DEMO_SALES_REP_NAME` | Optional | none | Display name for demo rep. |

### 3.4 Supabase Credentials (unchanged)

*(From `docs/SUPABASE-CREDENTIALS.md` – reapply to new repo secrets vaults.)*

- **Project Ref**: `zqezunzlyjkseugujkrl`
- **Region**: `us-east-2`
- **Anon Key**:
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXp1bnpseWprc2V1Z3Vqa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTM5NTksImV4cCI6MjA3NDkyOTk1OX0.rXBCwiqvmsmz09HxKbG2fOrKPpq9JnpVWgG-cnXVZfQ
  ```
- **Direct URL**:
  ```
  postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres
  ```
- **Connection Pooler (Serverless)**:
  ```
  postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres
  ```

> Store `DATABASE_URL` with the pooled or direct string depending on runtime (Vercel recommended: pooled). Add every secret via the Vercel CLI (`vercel env add …`) before deploying, and mirror the values in local `.env.local`.

### 3.5 Analytics & Third-Party (Future)

- `SENTRY_DSN`, `POSTHOG_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY` – reserved for telemetry, email, billing once scoped.
- `SUPABASE_SERVICE_ROLE_KEY` – only if server-side management of Supabase Auth or RLS is required; **never expose to client**.

### 3.6 AI & External Models

| Variable | Required | Source / Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | ✅ | Get from https://platform.openai.com/api-keys | Server-side credential for GPT-5 calls. Add via `vercel env add OPENAI_API_KEY` (and mirror locally); never commit to source or expose client-side. |

---

## 4. Supabase & Data Architecture

### 4.1 Multi-Tenancy Strategy

1. **Shared schema** with tenancy enforced via `tenantId` columns and `app.current_tenant_id` session parameter.
2. Prisma helper `withTenant` (`lib/prisma.ts`) sets `set_config('app.current_tenant_id', tenantId, false)` per transaction – replicate in new repo.
3. API helpers `withTenantFromRequest` & `withPortalUserFromRequest` (under `app/api/_utils`) resolve tenant from headers, auto-provision demo portal users, and ensure default portal role assignment.

### 4.2 Row-Level Security (RLS)

- Enable RLS on each business table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- Create policies referencing `current_setting('app.current_tenant_id')` to scope read/write per tenant.
- For portal/customer endpoints, ensure policies further scope by `portal_user_id` or related customer/company IDs as needed.

### 4.3 Prisma Schema Coverage

- **Core**: `Tenant`, `TenantSettings`, `User`, `Role`, `Permission`, `PortalUser`, `PortalSession`.
- **Commerce**: `Product`, `Sku`, `Inventory`, `PriceList`, `Order`, `OrderLine`, `Invoice`, `Payment`, `Cart`, `CartItem`.
- **Intelligence**: `Activity`, `ActivityType`, `CallPlan`, `Task`, `AccountHealthSnapshot`, `SalesMetric`.
- **Compliance**: `ComplianceFiling`, `StateCompliance`, `StateTaxRate`, etc. (retain for future phases).
- **Integrations**: `WebhookSubscription`, `WebhookEvent`, `WebhookDelivery`, `IntegrationToken`.

See `docs/database/supabase-schema-overview.md` for current Supabase introspection snapshot (column types, sample data).

### 4.4 Seeding & Tenant Bootstrap

- Entry point: `archive/legacy-crm/scripts/seed-well-crafted-tenant.ts`.
- Workflow: ensure tenant → import suppliers → import products → import customers from CSV.
- Re-implement the script in new repo to seed demo data and support test environments; align CLI entry with Prisma `ts-node` or dedicated npm script.

### 4.5 MCP Access to Supabase

For database exploration or administrative tasks through the Model Context Protocol:

- **Server**: `enhanced-postgres-mcp-server` (`package.json:77`) adds read/write support on top of Anthropic’s official Postgres MCP server.
- **Launch command** (local/CLI):
  ```bash
  npx -y enhanced-postgres-mcp-server \
    "postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require"
  ```
- **Claude Desktop configuration** (`claude_desktop_config.json`):
  ```json
  {
    "mcpServers": {
      "supabase-postgres": {
        "command": "npx",
        "args": [
          "-y",
          "enhanced-postgres-mcp-server",
          "postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres?sslmode=require"
        ]
      }
    }
  }
  ```
- **SSL considerations**:
  - Append `?sslmode=require` or `?sslmode=no-verify` to the connection string.
  - Or set environment variables before launching:
    - `POSTGRES_SSL=true` (enable SSL automatically)
    - `POSTGRES_SSL_FORCE=true` (override URL to force SSL)
    - `POSTGRES_SSL_REJECT_UNAUTHORIZED=false` (skip cert verification when needed)
- **Available MCP tools** (from package README):
  - Querying: `query`
  - Mutations: `execute`, `insert`, `update`, `delete`
  - Schema management: `createTable`, `alterTable`, `createIndex`, `createFunction`, `createTrigger`

Keep the Supabase credentials consistent with Section 3.4, and restrict MCP usage to trusted environments because the enhanced server grants write access.

---

## 5. Application Architecture

### 5.1 Client (Next.js App Router)

- Route structure documented in `docs/user-portal/PAGE_ROUTING.md`.
- Protected portal segment `(user)` wraps `PortalProviders` → `PortalAuthGuard` → `PortalLayout`.
- Session provider (`components/providers/PortalSessionProvider.tsx`) hydrates local storage & reconciles with `/api/portal/auth/me`.
- React Query provides client-side caching via `QueryProvider`.
- UI primitives under `components/ui/` follow shadcn patterns (Button, Card, Table, etc.).

### 5.2 API Surface (app router handlers)

- **Auth**: `/api/portal/auth/[login|logout|me|refresh|register|reset-password|verify-email]`.
- **Catalog & Orders**: `/api/portal/products`, `/api/portal/orders`, `/api/portal/orders/[id]`.
- **Analytics/Insights**: `/api/portal/insights/*`, `/api/sales/dashboard`.
- **Lists/Favorites/Templates**: endpoints exist but need completion and wiring to UI.
- **Reports**: `/api/portal/reports` & exports – currently partially implemented.
- Ensure all handlers utilize `withPortalUserFromRequest` (RBAC) or `withTenantFromRequest`, and return consistent `{ success, data }` shape.

### 5.3 Background Jobs

- `app/workers/webhook-delivery.ts` – processes pending webhook deliveries, retries, updates subscription health.
- Integrate with cron (Supabase scheduler, Vercel cron, or external worker) after launch.

### 5.4 Client Modules & Pages

| Area | Status | Notes |
| --- | --- | --- |
| `/portal/dashboard` | Partially implemented (real metrics with fallback demo) | Relies on `useSalesDashboard` hook. |
| `/portal/orders` | Live Prisma queries | List & detail pages use JWT session. |
| `/portal/invoices` | Live Prisma queries | Server components gather invoice/payment data. |
| `/portal/insights` | Live analytics + Prisma | Uses `insightsService`. |
| `/portal/account` | Live Prisma | Account summary, invoice snapshots. |
| `/portal/reports` | Requires Supabase wiring | Build queries against live data; if none exists, surface “no data” messaging. |
| `/portal/favorites`, `/portal/cart` | Placeholder or dependent on unfinished APIs | Build endpoints & UI logic. |

---

## 6. Authentication & Session Flow

1. **Login (`/api/portal/auth/login`)** – Validates credentials via Prisma, enforces rate limits & lockouts, issues access/refresh JWT cookies (`setAccessTokenCookie`, `setRefreshTokenCookie`), logs activity.
2. **Session hydration** – Client provider fetches `/api/portal/auth/me`; on 401 triggers silent `/api/portal/auth/refresh`; falls back to default session on failure.
3. **Authorization** – API endpoints check JWT payload (`getCurrentUser`) or rely on portal session headers + RBAC (`requirePortalPermission`).
4. **Logout** – Clears cookies and portal session record; UI should call `/api/portal/auth/logout` and reset local state.
5. **NextAuth integration (planned)** – Replace stubs in `lib/auth.ts` with actual provider configuration; unify session retrieval between server components and API routes.

---

## 7. Feature Modules (High-Level Requirements)

### 7.1 Dashboard & Intelligence

- Implement ARPDD pace, customer health engine, revenue risk detection per spec.
- Expose metrics via `/api/sales/dashboard`; fallback demo data should be replaced once Supabase seeded.

### 7.2 Catalog, Cart & Checkout

- Finalize `/api/portal/cart`, `/api/portal/cart/items`, `/api/portal/cart/checkout`.
- Ensure inventory availability, pricing waterfall (audit log in `OrderLine.appliedPricingRules`), and sample order handling.
- UI components already scaffolded under `components/portal/cart/*`.

### 7.3 Orders & Invoices

- Confirm currency/decimal normalization helpers.
- Add invoice PDF/statement downloads and status transitions.
- Include background sync hooks for accounting integrations (future).

### 7.4 Reports & Analytics

- Power `/portal/reports` with real Supabase aggregations (Prisma queries or materialized views); when datasets are empty, show guidance instead of synthetic numbers.
- Build export endpoints honoring filters (CSV/Excel/PDF).

### 7.5 Notifications, Favorites, Lists

- Complete APIs for favorites, lists, notifications, and templates; ensure RBAC permissions (`portal.favorites.*`, etc.) align with roles.
- Implement UI state management and optimistic updates similar to cart provider.

### 7.6 Background Automation

- Deploy webhook worker with scheduling.
- Add health monitoring endpoints for integration tokens and webhook subscriptions.

---

## 8. Rebuild Roadmap

1. **Foundation**
   - Scaffold new Next.js repo with TypeScript strict mode, ESLint, Prettier.
   - Port Prisma schema & regenerate client; run migrations against Supabase.
   - Recreate Tailwind 4 configuration & design tokens.
2. **Authentication**
   - Implement login/register/reset flows, finalize refresh logic, integrate NextAuth or stable equivalent.
   - Harden JWT secret management and cookie security (SameSite/secure flags).
3. **APIs & Data**
   - Re-implement portal APIs with consistent response contracts, TypeScript types, and RBAC.
   - Add missing endpoints (cart, favorites, lists, notifications, reports).
4. **UI Integration**
   - Wire each page to corresponding APIs; rely on live Supabase data and add empty-state prompts where data is missing.
   - Rebuild query hooks and React Query caches.
5. **Intelligence, AI, & Background Jobs**
   - Implement health engine, pricing waterfall, ARPDD, and sample management.
   - Ship Leora AI foundations: proactive briefing job, chat API, GPT-5 integration, and empty-state fallbacks.
   - Deploy webhook worker and schedule tasks.
6. **Testing & Deployment**
   - Restore Jest unit coverage and Playwright smoke tests.
   - Configure GitHub/Vercel deploy pipeline, environment secrets, Supabase migrations CI.

---

## 9. Deployment Checklist (New Repo + Vercel)

1. **Repository setup**
   - Initialize Git repo, copy sanitized code, add `.env.example` with variable list.
   - Incorporate CI (GitHub Actions) for lint, test, Prisma schema diff.
2. **Environment configuration**
   - Use the Vercel CLI (`vercel env add …`) to set secrets: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, defaults, demo IDs, `OPENAI_API_KEY`, etc.
   - Mirror values in local `.env.local` (keep Supabase credentials identical).
3. **Supabase integration**
   - Verify network policies allow Vercel IPs (if required).
   - Enable RLS and create policies for every table touched by portal/API.
   - Run `prisma migrate deploy` against Supabase to align schema.
4. **Prisma generation**
   - Ensure `npm install` triggers `prisma generate` (via `postinstall` script).
5. **Build & deploy**
   - `npm run build` locally; then trigger Vercel deployment.
   - Monitor logs for Prisma connection errors or missing env variables.
6. **Post-deploy validation**
   - Smoke test login, dashboard, orders, invoices, insights.
   - Confirm webhook worker scheduling (if using external runner).
   - Validate Leora AI endpoints (briefing + chat) against GPT-5; ensure fallbacks trigger if API key missing.

---

## 10. Immediate Actions Before Rebuild

1. **Archive current repo state** for reference; use this blueprint as source-of-truth.
2. **Copy Supabase credentials** into secure password manager; verify DB access with Prisma.
3. **Draft `.env.example`** using variables in Section 3 for the new repository.
4. **Plan NextAuth provider** (email OTP, OAuth, or credentials) to replace stubs early in implementation.
5. **Decide on scheduler** for webhook worker (Supabase cron vs. Vercel vs. external worker).

---

### References

- Technical spec & roadmap – `docs/Spec-file.md`
- Supabase schema snapshot – `docs/database/supabase-schema-overview.md`
- Deployment notes & credentials – `docs/SUPABASE-CREDENTIALS.md`, `docs/deployment/*`
- User portal design docs – `docs/user-portal/`

This document should live alongside the new repository from day one to steer architecture, environment setup, and feature parity as the system is rebuilt.

---

## 11. Fresh Codebase & Testing Strategy Notes

- **Starting point**: Treat this Markdown file as the only inherited artifact. Do not import existing source code; build modules following the guidance above.
- **Environment awareness**: Supabase credentials from Section 3.4 will be reused. Provision them in the new repo’s secret store before the first deploy.
- **Testing approach**: The primary validation environment will be the deployed site (Vercel preview/production). Local testing is optional—plan workflows, feature flags, and smoke scripts with remote execution in mind.
- **Deployment readiness**: Ensure each feature branch can ship safely without on-device verification, leveraging staging previews for QA.
- **Documentation updates**: Extend this blueprint as the new implementation evolves so future agents always have a current single source of truth.
