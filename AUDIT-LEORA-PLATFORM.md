# Leora Platform Audit (Oct 2025 Snapshot)

## Snapshot
- Repo reviewed: `/Users/greghogue/Leora`
- Reference docs are thorough (`leora-platform-blueprint.md:1`) and align with stated product goals, but implementation diverges in key areas.

## What’s Working
- Architectural intent and documentation are comprehensive and consistent across blueprint, README, and `/docs` assets (`README.md:1`, `docs/api-quick-reference.md:1`).
- Prisma schema models cover the required multi-tenant domains (tenancy, commerce, intelligence) and map cleanly to Supabase (`prisma/schema.prisma:1`).
- Product and cart API routes attempt tenant isolation through `withTenant` transactions and Prisma queries (`app/api/portal/products/route.ts:13`, `app/api/portal/cart/route.ts:1`).
- Data intelligence modules outline concrete algorithms for pace, health, opportunities, and samples, ready for integration once schema gaps are closed (`lib/intelligence/pace-tracker.ts:1`, `lib/intelligence/health-scorer.ts:1`).
- Front-end portal pages and hooks present cohesive UX scaffolding, leveraging shared providers and React Query patterns (`components/providers/PortalProviders.tsx:1`, `app/(portal)/dashboard/page.tsx:1`).
- Portal authentication now flows end-to-end: JWT cookies hydrate portal users, seeded demo users include hashed passwords, and the portal layout enforces `PortalAuthGuard` (`lib/prisma.ts:95`, `app/api/portal/auth/login/route.ts:100`, `app/(portal)/layout.tsx:1`).
- Orders list and detail endpoints return live Prisma data backed by seeded SKUs/inventory so the portal surfaces real Supabase records (`app/api/portal/orders/route.ts:1`, `app/api/portal/orders/[id]/route.ts:1`, `scripts/seed-well-crafted-tenant.ts:327`).

## Needs Improvement

### Authentication & Sessions
- Session refresh and logout flows remain untested; add integration coverage around `/api/portal/auth/refresh` and cookie revocation to ensure long-lived sessions stay healthy (`components/providers/PortalSessionProvider.tsx:120`, `app/api/portal/auth/refresh/route.ts:1`).
- Consider surfacing session/device metadata in the portal so admins can review and revoke active sessions (`prisma/portalSession`, `app/api/portal/auth/login/route.ts:173`).

### RBAC & Permissions
- Routes require `portal.*` permission names (e.g., `'portal.orders.read'`), but seeded roles only grant coarse values such as `'orders.view'`, so every permission check fails even for admin users (`app/api/portal/orders/route.ts:19`, `scripts/seed-well-crafted-tenant.ts:63`).
- `requirePermission` throws generic errors; missing permission feedback leaks to 500 in some handlers rather than consistent 403 responses (e.g., `app/api/portal/orders/[id]/route.ts:44`).

### API Coverage & Data Integrity
- Several endpoints still return mocked payloads—insights, favorites, reports, templates, and notifications ignore real data and filters, leaving large portions of the portal disconnected from Supabase (`app/api/portal/insights/route.ts:46`, `app/api/portal/reports/route.ts:46`).
- Cart pricing logic still hard-codes tax/shipping assumptions and lacks validation around tenant-specific rates (`app/api/portal/cart/route.ts:45`, `app/api/portal/cart/items/implementation.ts:52`).
- Tenant configuration hooks in intelligence modules still return defaults; thresholds cannot be tuned per tenant until these `TODO`s persist state (`lib/intelligence/pace-tracker.ts:200`, `lib/intelligence/health-scorer.ts:226`).

### Data & Seeding
- Seed script still omits internal admin `User` accounts and richer historical datasets, limiting RBAC testing and analytics backfills (`prisma/schema.prisma:84`, `scripts/seed-well-crafted-tenant.ts:484`).

### Security & Operations
- Public repository still ships live Supabase connection strings and anon keys inside `.env.example` (left in place for now per instruction); rotate and remove from source control as soon as possible (`.env.example:9`, `.env.example:25`).
- `/api/admin/init-database` accepts a query-string secret and shells out to `npx prisma db push`, enabling remote schema rewrites if the secret leaks (`app/api/admin/init-database/route.ts:1`).

### Front-End Experience
- Portal pages rely on optimistic hooks that assume healthy APIs; with current backend stubs, most lists render error or empty states, so end-to-end flows are non-functional (`app/(portal)/orders/page.tsx:80`, `app/(portal)/insights/page.tsx:23`).
- Toasts, search, and cart actions surface loading states, but lack guardrails when API returns permission errors—user remains uninformed about authentication gaps (`components/providers/PortalSessionProvider.tsx:92`).

### Testing & Tooling
- Jest helpers call `jest.fn` without importing the Jest globals, causing TypeScript compilation failures under strict settings (`tests/helpers/auth.ts:111`).
- No automated tests cover the critical API surfaces; existing specs reference helpers that assume functioning auth, so current suite cannot validate regressions (`tests/integration/api-orders.test.ts:1`).

## Highest-Risk Gaps
- Key portal endpoints (insights, reports, favorites, notifications, templates) still return mocked payloads, so major workflows remain non-functional despite the new order APIs.
- Supabase credentials remain in source control (per current instruction); treat them as compromised until rotated and moved to secrets management.
- `/api/admin/init-database` continues to allow remote schema mutation with a query-string secret, leaving the production database exposed.
- Lack of automated tests means regressions in auth, RBAC, or data access will go unnoticed until surfaced by users.

## Recommended Next Steps
1. Replace the remaining mocked portal APIs (insights, reports, favorites, templates, notifications) with Prisma-backed implementations and align the UI to handle empty-state data gracefully.
2. Rotate Supabase credentials, remove them from `.env.example`, and restrict the admin database endpoints to trusted environments.
3. Add smoke tests that cover login → dashboard → order detail, plus unit tests for permission guards to lock in the new auth/RBAC flow.
4. Harden `/api/admin/init-database` (or remove it) in favor of controlled migration workflows.
5. Expand seed data with internal admin `User` accounts and richer analytics samples to support future intelligence features.
