# Leora Platform – Full Implementation Plan

This document expands the high-level blueprint into an execution-ready plan. Follow it end-to-end to reach production-ready parity with the specification. Every major section finishes with verifiable outcomes and required tests. Use all available tools in the Codex environment (shell, editors, database utilities). When documentation is unclear, run web searches for the latest upstream references (Prisma, Supabase, Next.js, Vercel, OpenAI) before proceeding.

---

## 0. Operating Guidelines

- **Baseline**: Start from the current `main` branch state (do not reset unrelated user changes). Keep edits incremental and well documented in commits.
- **Tool usage**:  
  - Use `shell` for commands; prefer `bash -lc` with explicit `workdir`.  
  - Leverage web search via the codex tooling to confirm syntax/behaviour for Prisma, Supabase, Next.js 15, GPT API, Tailwind v4, Playwright 1.56, etc. Record crucial findings in commit messages or inline comments when non-obvious.  
  - Use `apply_patch` for manual edits unless file size or generated output makes another method safer.  
  - Run `npm run lint`, `npm run typecheck`, `npm run test`, and targeted scripts when directed; capture summaries of failure/success in work notes.
- **Testing strategy**: Treat Jest and Playwright results as hard gates. Add or update tests whenever implementing features. Document coverage of new behaviours.
- **Documentation**: Update README/docs whenever setup steps, environment variables, or workflows change. Ensure `.env.example` mirrors required secrets.
- **Sign-off**: Before final handover, run `scripts/verify-database-schema.sql` in Supabase to confirm schema alignment and include the resulting output snippet in release notes. (Required migrations already executed: `prisma/migrations/add-portal-user-token-columns.sql` and `prisma/migrations/convert-all-enums-comprehensive.sql`; ensure `npm run db:generate` has been run afterwards.)

---

## 1. Authentication & Session Hardening

**Goal**: Fully functional multi-tenant auth that matches the blueprint.

1. **Portal registration**  
   - Add verification token columns (`emailVerificationToken`, `emailVerificationExpiry`) and `portal_user_roles` auto-assignment on register.  
   - Registration should create an inactive user until the email is verified.
2. **Email verification**  
   - Finish `/api/portal/auth/verify-email` to validate tokens, activate accounts, and issue session cookies.  
   - Add Jest tests mocking the Prisma layer and verifying audit logging.
3. **Password reset flow**  
   - Complete `/api/portal/auth/reset-password` (POST + PUT) with token issuance, expiry checks, and session invalidation.  
   - Hook into a mailer abstraction (stub allowed) and record activities.
4. **Session metrics**  
   - Ensure sessions track IP/User-Agent, refresh updates `lastActiveAt`, and unsuccessful attempts hit the rate limiter.
5. **Testing**  
   - Unit: lib/auth, rate limiting, schema validation.  
   - Integration: API tests covering register → verify, login, refresh, reset.  
   - Playwright: Basic portal auth story (register + verify via mock UI flow, login, logout).

**Exit checks**: No TODOs in auth routes; tests green.

---

## 2. Orders & Cart Transactions

**Goal**: CRUD operations and checkout behave exactly per specification.

1. **Order APIs**  
   - Implement `/api/portal/orders` POST (availability, pricing waterfall, inventory adjustments, audit).  
   - Implement PATCH (notes, delivery dates, status transitions with validation).  
   - Implement DELETE (soft-cancel, inventory restore, audit).
2. **Cart APIs**  
   - Harmonize schemas (`skuId` optional vs. required); fetch and persist tenant-specific tax/ship rules.  
   - Update totals to derive from tenant settings; support notes and per-line metadata.
3. **UX sync**  
   - Update React Query hooks + UI to respect new API contracts (loading/error states, optimistic updates).
4. **Testing**  
   - Jest integration tests with seeded data (cart lifecycle, order creation, cancellation).  
   - Playwright flows: add to cart, checkout, view order, cancel/edit order.

**Exit checks**: Inventory counts consistent in DB; Playwright smoke passes on `/orders` and `/cart`.

---

## 3. Financial Surfaces (Invoices & Account)

**Goal**: Deliver live invoice/account data with downloadable artifacts.

1. **Invoice backend**  
   - Create `/api/portal/invoices` (list, detail, optional filtering).  
   - Produce PDF exports using a server-side renderer (acceptable to mock but must return real files).
2. **Account backend**  
   - Create `/api/portal/account` with user profile, billing contact, stats summary.  
   - Add mutation endpoints (profile update, notification preferences).
3. **UI integration**  
   - Replace stub pages at `app/(portal)/invoices` and `app/(portal)/account` with live data, error states, and skeleton loaders.
4. **Testing**  
   - Jest: invoice queries, PDF exporter (snapshot/binary length).  
   - Playwright: invoice list/download, account update.

**Exit checks**: Downloaded invoice file verified; forms persist data.

---

## 4. Analytics, Samples, and Insights Automation

**Goal**: Real metrics pipeline instead of demo data.

1. **Metrics service**  
   - Hook `lib/services/metrics-service.ts` into portal access (cached results) and cron job for nightly recalculation.  
   - Persist snapshots (`accountHealthSnapshot`, `salesMetrics`) and surface new alerts.
2. **Samples tracking**  
   - Integrate sample allowances, monthly counters, and pending feedback into insights.  
   - Provide API for managers to review overages (`/api/portal/samples`).
3. **UI updates**  
   - Enhance dashboard/insights pages to show real metrics, fallback gracefully when data missing.
4. **Testing**  
   - Jest: metrics calculations with fixture data.  
   - Playwright: dashboard scenario verifying updates post-cron (simulate by running service).

**Exit checks**: `/portal/insights` displays non-zero, accurate data; nightly cron logs success.

---

## 5. Reporting & Exports

**Goal**: Production-ready reporting with persistence and exports.

1. **Report persistence**  
   - Implement storage for saved configurations (POST) with user ownership.  
   - Add listing/deletion endpoints.
2. **Export pipeline**  
   - Finish JSON/CSV responses and implement PDF with templated layout (same renderer as invoices).  
   - For large datasets, enqueue background job (worker) to email or expose download link.
3. **Access control**  
   - Ensure permission checks align with RBAC (e.g. `portal.reports.export`).  
   - Add audit logs for export generation.
4. **Testing**  
   - Jest: report aggregation, format conversions, permission rejection.  
   - Playwright: user selects filters, triggers export, receives file.

**Exit checks**: Reports stored per user, all formats tested.

---

## 6. “Ask Leora” AI Copilot

**Goal**: Replace mock pipeline with working GPT-driven analytics assistant.

1. **Query templates**  
   - Build whitelist mapping (template ID → parameterized Prisma/raw SQL).  
   - Store/Validate templates versioned in `lib/ai`.
2. **Execution layer**  
   - Implement secure query execution (tenant isolation, parameter sanitation).  
   - Cache results short-term to reduce DB load.
3. **AI integration**  
   - Use latest OpenAI SDK (verify gpt-5 availability).  
   - Capture token usage, error handling, streaming support where helpful.
4. **UI**  
   - Replace static `app/(portal)/leora` with interactive chat (React state, streaming responses, conversation history).
5. **Testing**  
   - Jest: intent detection, query validator.  
   - Integration: stub GPT responses to validate API output.  
   - Playwright: chat scenario with mocked backend.

**Exit checks**: Real responses generated for known prompts, token usage logged.

---

## 7. Background Workers & Cron Jobs

**Goal**: Operational automation per blueprint.

1. **Workers**  
   - Implement `app/workers/webhook-delivery.ts` for retries, failure escalation.  
   - Add additional workers for daily insights, health checks, session cleanup.
2. **Cron endpoints**  
   - Create `/api/cron/webhook-delivery`, `/api/cron/daily-insights`, `/api/cron/health-checks`, `/api/cron/cleanup-sessions`.  
   - Secure with secret header/token (Vercel cron best practice).
3. **Monitoring**  
   - Log outcomes to `webhook_deliveries` table and structured logs; expose health endpoint `/api/health`.
4. **Testing**  
   - Jest: worker logic (use Prisma test DB).  
   - Manual: trigger cron endpoints locally, validate expected DB changes.

**Exit checks**: Cron routes deployable, logs show successful runs.

---

## 8. Documentation & Developer Experience

1. **README and docs**  
   - Update quickstart, environment variables, deployment steps.  
   - Document cron configuration, AI setup, sample management.
2. **Scripts & tooling**  
   - Ensure `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run e2e` all succeed.  
   - Provide helper scripts for seeding, health checks.
3. **Knowledge transfer**  
   - Summarize testing outcomes, known limitations, and future enhancements.  
   - Capture verify-database-schema results in release notes.

---

## 9. Sign-off Checklist

- [ ] All TODO/FIXME items resolved or converted into tracked issues.  
- [ ] Jest, Playwright, lint, typecheck, and build succeed in CI.  
- [ ] Cron jobs tested with real credentials in staging.  
- [ ] Documentation updated and reviewed.  
- [ ] `scripts/verify-database-schema.sql` run post-migration; results recorded.  
- [ ] Final smoke test covering portal navigation: login → dashboard → insights → orders → cart → checkout → invoices → account → Ask Leora.  
- [ ] Deployment notes prepared with environment variable list, cron secrets, and rollback plan.

When every box is checked, the implementation should meet the blueprint requirements with verified, production-level functionality.
