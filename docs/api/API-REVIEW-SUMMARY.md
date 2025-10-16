# Leora Platform API Review & Completion Summary

**Date:** October 15, 2025
**Review Focus:** `/Users/greghogue/Leora/app/api/` route implementations

---

## Executive Summary

All API routes in `/app/api/portal/*` and `/app/api/leora/*` have been reviewed for completeness, consistency, and alignment with the Leora Platform Blueprint. The helper utilities have been updated to use the actual Prisma client with proper multi-tenancy support.

### ✅ Completed

1. **Helper Utilities** (`/app/api/_utils/`)
   - ✅ Updated `tenant.ts` to delegate to `lib/prisma.ts` for tenant resolution
   - ✅ Updated `auth.ts` to use `withPortalUserFromRequest` with RBAC
   - ✅ Consistent error handling with `response.ts`

2. **Auth Routes** (`/app/api/portal/auth/*`)
   - ✅ `/login` - Full implementation with rate limiting, lockout, JWT tokens
   - ✅ `/register` - User registration with email verification
   - ✅ `/me` - Session validation endpoint
   - ✅ `/refresh` - Token refresh with session validation
   - ✅ `/logout` - Session termination and cookie clearing

3. **Cart Routes** (`/app/api/portal/cart/*`)
   - ⚠️ `/cart` (GET/DELETE) - Placeholder implementation (needs Prisma queries)
   - ⚠️ `/cart/items` (POST/PATCH/DELETE) - Placeholder implementation
   - ⚠️ `/cart/checkout` - Placeholder implementation

4. **Product Routes**
   - ⚠️ `/api/portal/products` - Placeholder implementation with validation

5. **Order Routes**
   - ⚠️ `/api/portal/orders` - Placeholder implementation
   - ⚠️ `/api/portal/orders/[id]` - Placeholder implementation

6. **Insights Routes**
   - ⚠️ `/api/portal/insights` - Placeholder implementation

7. **AI Copilot Routes**
   - ✅ `/api/leora/chat` - Complete implementation with OpenAI integration

---

## Architecture Patterns

### 1. Multi-Tenancy Implementation

All routes follow this pattern:

```typescript
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Get authenticated user with permission check
  const user = await requirePermission(request, 'portal.products.read');

  // Get tenant context
  const tenant = await requireTenant(request);

  // Execute query with tenant isolation
  const data = await withTenant(tenant.tenantId, async (tx) => {
    return tx.product.findMany({
      where: { status: 'ACTIVE' },
      // RLS automatically filters by tenantId via session parameter
    });
  });

  return successResponse(data);
}
```

### 2. Response Shape Consistency

All endpoints return:

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "message": "...",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

### 3. RBAC Permission Patterns

| Route | Required Permission |
|-------|---------------------|
| `/api/portal/products` | `portal.products.read` |
| `/api/portal/orders` | `portal.orders.read` |
| `/api/portal/cart` | None (own cart only) |
| `/api/portal/insights` | `portal.insights.read` |

---

## Implementation Status by Route

### ✅ **Complete - Ready for Production**

#### `/api/portal/auth/login`
- **Status:** ✅ Complete
- **Features:**
  - Email/password authentication
  - Rate limiting (IP + email based)
  - Account lockout after failed attempts
  - JWT token generation (access + refresh)
  - Session creation in database
  - Activity logging
  - Password hash verification with bcrypt

#### `/api/portal/auth/register`
- **Status:** ✅ Complete
- **Features:**
  - User registration with validation
  - Email verification token generation
  - Password hashing
  - Default role assignment
  - Duplicate email checking
  - Activity logging

#### `/api/portal/auth/me`
- **Status:** ✅ Complete
- **Features:**
  - JWT validation
  - Session user hydration
  - Account status checking
  - Session activity update

#### `/api/portal/auth/refresh`
- **Status:** ✅ Complete
- **Features:**
  - Refresh token validation
  - New access token generation
  - Session validation and update
  - Permission refresh from database

#### `/api/portal/auth/logout`
- **Status:** ✅ Complete
- **Features:**
  - Session deletion
  - Cookie clearing
  - Activity logging
  - Graceful error handling

#### `/api/leora/chat`
- **Status:** ✅ Complete
- **Features:**
  - OpenAI GPT-5 integration
  - Intent detection and query routing
  - Whitelisted SQL template execution
  - Session management
  - Conversation history
  - Recommended action extraction

---

### ⚠️ **Needs Prisma Integration**

#### `/api/portal/cart` (GET/DELETE)
- **Current:** Placeholder with mock data
- **Required:**
  ```typescript
  const cart = await withTenant(tenant.tenantId, async (tx) => {
    return tx.cart.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        items: {
          include: {
            product: true,
            sku: true,
          },
        },
      },
    });
  });
  ```

#### `/api/portal/cart/items` (POST/PATCH/DELETE)
- **Current:** Placeholder with validation
- **Required:**
  - Product/SKU validation
  - Inventory availability check
  - Cart item CRUD operations
  - Price calculation from price lists
  - Cart total recalculation

#### `/api/portal/cart/checkout`
- **Current:** Placeholder
- **Required:**
  - Transaction-wrapped order creation
  - Inventory reservation
  - Pricing waterfall logic (Blueprint Section 7.2)
  - Address validation
  - Payment method validation
  - Order line creation with `appliedPricingRules` audit
  - Cart clearing
  - Notification triggers

#### `/api/portal/products` (GET)
- **Current:** Placeholder with filtering schema
- **Required:**
  ```typescript
  const products = await withTenant(tenant.tenantId, async (tx) => {
    return tx.product.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(category && { category }),
        ...(supplier && { supplier: { name: supplier } }),
        ...(minPrice && { skus: { some: { price: { gte: minPrice } } } }),
        status: 'ACTIVE',
      },
      include: {
        skus: true,
        inventory: true,
      },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { [sortBy]: sortOrder },
    });
  });
  ```

#### `/api/portal/orders` (GET/POST)
- **Current:** Placeholder
- **Required:**
  - Order listing with customer scoping
  - Status filtering
  - Date range filtering
  - Order creation with pricing waterfall
  - Inventory update
  - Sample order handling (Blueprint Section 1.2)

#### `/api/portal/orders/[id]` (GET/PATCH/DELETE)
- **Current:** Placeholder
- **Required:**
  - Order detail retrieval
  - Customer ownership validation
  - Order update (status, notes, delivery date)
  - Order cancellation with inventory restoration

#### `/api/portal/insights`
- **Current:** Placeholder with mock metrics
- **Required (per Blueprint Section 1.2):**
  - **Ordering Pace (ARPDD)**: Calculate average interval from fulfilled orders
  - **Revenue Health**: Flag accounts with ≥15% monthly revenue drop
  - **Sample Usage**: Track sample inventory vs. allowance (60 pulls/rep/month)
  - **Top Opportunities**: Top 20 products customer hasn't purchased
  - **Health Scores**: Aggregate account health indicators

  ```typescript
  // Example: Pace Deviation Query
  const paceDeviations = await withTenant(tenant.tenantId, async (tx) => {
    return tx.$queryRaw`
      WITH customer_pace AS (
        SELECT
          c.id,
          c.company_name,
          AVG(EXTRACT(EPOCH FROM (o2.created_at - o1.created_at)) / 86400) as avg_pace_days,
          MAX(o.created_at) as last_order_date,
          EXTRACT(EPOCH FROM (NOW() - MAX(o.created_at))) / 86400 as days_since_last_order
        FROM customers c
        JOIN orders o1 ON c.id = o1.customer_id AND o1.status = 'FULFILLED'
        JOIN orders o2 ON c.id = o2.customer_id AND o2.status = 'FULFILLED'
          AND o2.created_at > o1.created_at
        GROUP BY c.id, c.company_name
        HAVING COUNT(o1.id) >= 3
      )
      SELECT * FROM customer_pace
      WHERE days_since_last_order > avg_pace_days * 1.2
      ORDER BY days_since_last_order DESC
    `;
  });
  ```

---

## Validation Schemas

All schemas are defined in `/Users/greghogue/Leora/lib/validations/portal.ts`:

- ✅ `productFilterSchema`
- ✅ `orderFilterSchema`
- ✅ `createOrderSchema`
- ✅ `addToCartSchema`
- ✅ `updateCartItemSchema`
- ✅ `checkoutSchema`
- ✅ `insightFilterSchema`
- ✅ `reportFilterSchema`

---

## Error Handling Patterns

All routes use consistent error handling:

```typescript
try {
  // ... implementation
} catch (error) {
  console.error('Error context:', error);

  if (error instanceof Error && error.message === 'Authentication required') {
    return Errors.unauthorized();
  }

  if (error instanceof Error && error.message.startsWith('Permission denied')) {
    return Errors.forbidden();
  }

  if (error instanceof Error && error.message === 'Tenant not found') {
    return Errors.notFound('Tenant not found');
  }

  return Errors.serverError('Failed to perform operation');
}
```

---

## Next Steps

### Priority 1: Complete Cart & Checkout Flow
1. Implement `/api/portal/cart` GET with Prisma
2. Implement `/api/portal/cart/items` POST/PATCH/DELETE
3. Implement `/api/portal/cart/checkout` with transaction
4. Add pricing waterfall logic (Section 7.2)

### Priority 2: Complete Product Catalog
1. Implement `/api/portal/products` with filtering
2. Add inventory availability checks
3. Implement price list resolution

### Priority 3: Complete Orders
1. Implement `/api/portal/orders` GET/POST
2. Implement `/api/portal/orders/[id]` GET/PATCH/DELETE
3. Add order state machine validation
4. Implement sample order handling

### Priority 4: Complete Insights
1. Implement ARPDD pace calculation
2. Implement revenue health detection (15% threshold)
3. Implement sample usage tracking
4. Implement top opportunities query
5. Add health score aggregation

### Priority 5: Testing & Documentation
1. Write Jest unit tests for each route
2. Create Postman/Insomnia collection
3. Document API contracts in OpenAPI spec
4. Add integration tests

---

## Blueprint Alignment Checklist

| Requirement | Status | Notes |
|------------|--------|-------|
| Multi-tenancy via RLS | ✅ | Using `withTenant` helper |
| RBAC with permissions | ✅ | Using `requirePermission` |
| JWT auth (access + refresh) | ✅ | Implemented in login/refresh |
| Consistent response shape | ✅ | `{success, data}` pattern |
| Rate limiting | ✅ | Implemented in login route |
| ARPDD pace tracking | ⚠️ | Schema ready, query pending |
| Revenue health (15% drop) | ⚠️ | Logic pending |
| Sample management (60/month) | ⚠️ | Schema ready, logic pending |
| Pricing waterfall | ⚠️ | Needs implementation |
| GPT-5 AI copilot | ✅ | Implemented in /leora/chat |

---

## File References

### Helper Utilities
- `/Users/greghogue/Leora/app/api/_utils/response.ts` - Response helpers
- `/Users/greghogue/Leora/app/api/_utils/tenant.ts` - Tenant isolation (✅ Updated)
- `/Users/greghogue/Leora/app/api/_utils/auth.ts` - RBAC helpers (✅ Updated)

### Core Library
- `/Users/greghogue/Leora/lib/prisma.ts` - Multi-tenancy Prisma client
- `/Users/greghogue/Leora/lib/validations/portal.ts` - Zod schemas

### Auth Routes
- `/Users/greghogue/Leora/app/api/portal/auth/login/route.ts` ✅
- `/Users/greghogue/Leora/app/api/portal/auth/register/route.ts` ✅
- `/Users/greghogue/Leora/app/api/portal/auth/me/route.ts` ✅
- `/Users/greghogue/Leora/app/api/portal/auth/refresh/route.ts` ✅
- `/Users/greghogue/Leora/app/api/portal/auth/logout/route.ts` ✅

### Cart Routes
- `/Users/greghogue/Leora/app/api/portal/cart/route.ts` ⚠️
- `/Users/greghogue/Leora/app/api/portal/cart/items/route.ts` ⚠️
- `/Users/greghogue/Leora/app/api/portal/cart/checkout/route.ts` ⚠️

### Product & Order Routes
- `/Users/greghogue/Leora/app/api/portal/products/route.ts` ⚠️
- `/Users/greghogue/Leora/app/api/portal/orders/route.ts` ⚠️
- `/Users/greghogue/Leora/app/api/portal/orders/[id]/route.ts` ⚠️

### Analytics Routes
- `/Users/greghogue/Leora/app/api/portal/insights/route.ts` ⚠️

### AI Routes
- `/Users/greghogue/Leora/app/api/leora/chat/route.ts` ✅

---

## Recommendations

1. **Immediate:** Complete cart and checkout routes as they block customer portal functionality
2. **High Priority:** Implement product filtering for catalog browsing
3. **Medium Priority:** Complete order management endpoints
4. **Strategic:** Implement analytics queries per Blueprint Section 1.2 requirements
5. **Quality:** Add comprehensive test coverage once implementations complete

---

**Status Legend:**
- ✅ Complete and production-ready
- ⚠️ Placeholder implementation, needs Prisma integration
- ❌ Missing or incomplete
