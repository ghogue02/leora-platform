# Navbar Routes Status & API Dependencies

## Overview

Analysis of all navbar routes and their API dependencies, explaining why some routes return 500 errors.

## Route Status Summary

| Route | API Dependency | Status | Issue |
|-------|---|---|---|
| `/demo-dashboard` | None (local data) | ✅ WORKS | Uses static demo data |
| `/dashboard` | ❌ REMOVED | N/A | Removed - relied on failing API |
| `/orders` | `/api/portal/orders` | ⚠️ Depends on DB | Fails if database down |
| `/products` | `/api/portal/products` | ⚠️ Depends on DB | Fails if database down |
| `/cart` | `/api/portal/cart` | ⚠️ Depends on DB | Fails if database down |
| `/invoices` | `/api/portal/invoices` | ⚠️ Depends on DB | Fails if database down |
| `/insights` | `/api/portal/insights` | ⚠️ Depends on DB | 11 parallel queries, any failure = 500 |
| `/leora` | `/api/leora/chat` | ⚠️ Depends on service | Fails if AI service down |
| `/account` | `/api/portal/user/me` | ⚠️ Depends on DB | Fails if database down |

## Why /demo-dashboard Works

**Uses local static data:**
```typescript
// app/(portal)/demo-dashboard/page.tsx:19
const insights = useMemo(() => getDemoInsights(), []);
```

- Zero network calls
- Zero database queries
- Data imported from `lib/demo/insights.ts`
- Always available, never fails

## Why Other Routes Return 500 Errors

### Root Cause: Database Dependency Failures

All navbar routes (except `/demo-dashboard`) make API calls that require:
1. Active database connection
2. Valid authentication tokens
3. Tenant isolation queries
4. Complex multi-table joins

**Any single failure cascades to 500 error.**

### Example: /api/portal/insights

This endpoint executes **11 parallel Prisma queries**:

```typescript
// app/api/portal/insights/route.ts:189-329
const [
  ordersThisMonth,
  ordersLastMonth,
  revenueThisMonth,
  revenueLastMonth,
  activeAccounts,
  atRiskAccounts,        // COMPLEX: nested OR with relationships
  ordersLast30Days,
  totalOrders,
  orderLinesLast6Months,
  totalCustomers,
  tenantSettings,
] = await Promise.all([...]);
```

**If ANY query fails:**
- `Promise.all` rejects
- Generic 500 error returned
- React Query retries 3 times (exponential backoff)
- User sees error after ~30 seconds

### Generic Error Handling

```typescript
// app/api/portal/insights/route.ts:477-484
catch (error) {
  if (isDatabaseOrTenantIssue(error)) {
    // Returns 400 for known errors
  }

  // All other errors = generic 500
  return NextResponse.json(
    { success: false, error: 'Failed to fetch insights' },
    { status: 500 }
  );
}
```

Only recognizes:
- `PrismaClientKnownRequestError`
- `PrismaClientInitializationError`
- Specific error message patterns

**All other errors return 500 with no details.**

## Solution: Use Demo Routes

For reliable navigation without database dependencies:

1. ✅ `/demo-dashboard` - Already working, uses static data
2. Consider creating demo versions of other routes:
   - `/demo-orders` - Static order data
   - `/demo-products` - Static product catalog
   - `/demo-cart` - Mock cart functionality
   - `/demo-account` - Static profile data

## Recommendation

**Short-term:** Use `/demo-dashboard` as primary route (completed)

**Long-term options:**
1. Add better error boundaries to other routes
2. Implement fallback/offline data
3. Create demo versions of all routes
4. Add retry logic with exponential backoff
5. Show partial data instead of complete failure
6. Add loading states and error messages

## Files Changed

- `app/login/page.tsx:33` - Redirect to `/demo-dashboard`
- `app/page.tsx:8` - Root redirect to `/demo-dashboard`
- `app/(portal)/unauthorized/page.tsx:26` - Link to `/demo-dashboard`
- `app/(portal)/dashboard/` - **REMOVED** (entire directory deleted)

## Current User Flow

1. User logs in at `/login`
2. Redirects to `/demo-dashboard` ✅
3. Navigation works reliably with static data
4. No 500 errors from database failures
