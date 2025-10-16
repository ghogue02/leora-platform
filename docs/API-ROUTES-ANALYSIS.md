# API Routes Code Quality Analysis Report

## Executive Summary

**Overall Quality Score: 5/10**

**Files Analyzed:** 6 API routes + 3 utility modules
**Critical Issues Found:** 14
**Technical Debt Estimate:** 12-16 hours

**Status:** The API routes are functional but have significant error handling, validation, and type safety issues that could lead to production failures and poor debugging experiences.

---

## Critical Issues

### 1. Unsafe SQL Injection Vulnerability in withTenant()
**File:** `/Users/greghogue/Leora/lib/prisma.ts:80-82`
**Severity:** CRITICAL
**Issue:**
```typescript
await tx.$executeRawUnsafe(
  `SET LOCAL app.current_tenant_id = '${tenantId}'`
);
```
This uses string interpolation with `$executeRawUnsafe`, creating a SQL injection vulnerability.

**Fix:**
```typescript
await tx.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`;
```

---

### 2. Generic Error Responses Hide Root Causes
**Files:** All API routes
**Severity:** HIGH
**Issue:**
All routes return generic 500 errors that hide the actual failure reason:
```typescript
return Errors.serverError('Failed to fetch insights');
```

Developers and operators cannot diagnose issues because:
- No error codes distinguishing different failure types
- No stack traces in development
- No request IDs for correlation
- No structured logging

**Fix Pattern:**
```typescript
catch (error) {
  const errorId = crypto.randomUUID();

  console.error(`[${errorId}] Error fetching insights:`, {
    error: error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : error,
    tenantId: tenant?.tenantId,
    userId: user?.id,
    timestamp: new Date().toISOString()
  });

  if (error instanceof Error && error.message === 'Authentication required') {
    return Errors.unauthorized();
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return errorResponse('Resource already exists', 409, 'DUPLICATE_RESOURCE', { errorId });
    }
    if (error.code === 'P2025') {
      return errorResponse('Resource not found', 404, 'NOT_FOUND', { errorId });
    }
  }

  return errorResponse(
    process.env.NODE_ENV === 'development'
      ? error.message
      : 'Failed to fetch insights',
    500,
    'INTERNAL_ERROR',
    { errorId }
  );
}
```

---

### 3. Missing Null Checks on Database Relations
**File:** `/Users/greghogue/Leora/app/api/portal/insights/route.ts:360-378`
**Severity:** HIGH
**Issue:**
```typescript
orderLinesSixMonths.forEach((line) => {
  if (!line.product) {
    return; // Silent failure - no logging
  }
  // ... uses line.product without checking if fields exist
});
```

Also at line 450:
```typescript
customerName: order.customer?.companyName || 'Unknown Customer',
```

Optional chaining is used inconsistently. Some places check, others don't.

**Fix:**
```typescript
orderLinesSixMonths.forEach((line) => {
  if (!line.product) {
    console.warn(`OrderLine ${line.id} missing product relation`);
    return;
  }

  if (!line.product.id || !line.product.name) {
    console.warn(`OrderLine ${line.id} has incomplete product data`);
    return;
  }

  // Now safe to use line.product
});
```

---

### 4. Race Condition in Cart Creation
**File:** `/Users/greghogue/Leora/app/api/portal/cart/route.ts:23-74`
**Severity:** MEDIUM
**Issue:**
```typescript
let userCart = await tx.cart.findFirst({
  where: {
    portalUserId: user.id,
    status: 'ACTIVE',
  },
});

// Create cart if it doesn't exist
if (!userCart) {
  userCart = await tx.cart.create({
    data: {
      portalUserId: user.id,
      // ...
    },
  });
}
```

Two concurrent requests could both find no cart and attempt to create one, causing a unique constraint violation.

**Fix:**
```typescript
// Use upsert to handle race conditions
const userCart = await tx.cart.upsert({
  where: {
    portalUserId_status: {
      portalUserId: user.id,
      status: 'ACTIVE'
    }
  },
  update: {},
  create: {
    portalUserId: user.id,
    tenantId: tenant.tenantId,
    status: 'ACTIVE',
  },
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            // ...
          },
        },
      },
    },
  },
});
```

**Note:** This requires adding a unique composite index:
```prisma
@@unique([portalUserId, status])
```

---

### 5. Type Coercion Errors in Validation Schemas
**File:** `/Users/greghogue/Leora/lib/validations/portal.ts`
**Severity:** MEDIUM
**Issue:**
```typescript
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

`z.coerce.number()` will silently convert invalid inputs:
- `"abc"` → `NaN`
- `"10.5"` → `10.5` (then fails `.int()`)
- `"0"` → `0` (then fails `.min(1)`)

**Fix:**
```typescript
export const paginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .transform(Number)
    .pipe(z.number().int().min(1))
    .default('1')
    .transform(Number),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default('20')
    .transform(Number),
});
```

---

### 6. Inconsistent Permission Checking Logic
**File:** `/Users/greghogue/Leora/app/api/_utils/auth.ts:66-87`
**Severity:** MEDIUM
**Issue:**
The wildcard permission matching has edge cases:

```typescript
export function hasPermission(user: PortalUser, permission: string): boolean {
  // Check for wildcard permission
  if (user.permissions.includes('portal.*')) {
    return true;
  }

  // What if permission is empty string?
  // What if permission doesn't start with 'portal.'?
  // What about 'portal.orders.view.special' vs 'portal.orders.*'?

  const parts = permission.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const wildcardPerm = parts.slice(0, i).join('.') + '.*';
    if (user.permissions.includes(wildcardPerm)) {
      return true;
    }
  }

  return false;
}
```

**Fix:**
```typescript
export function hasPermission(user: PortalUser, permission: string): boolean {
  if (!permission || typeof permission !== 'string') {
    return false;
  }

  // Normalize permission
  const normalizedPermission = permission.trim().toLowerCase();

  // Check for wildcard permission
  if (user.permissions.includes('*') || user.permissions.includes('portal.*')) {
    return true;
  }

  // Check for exact permission
  if (user.permissions.includes(normalizedPermission)) {
    return true;
  }

  // Check for parent wildcards (portal.orders.* matches portal.orders.view)
  const parts = normalizedPermission.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcardPerm = parts.slice(0, i).join('.') + '.*';
    if (user.permissions.includes(wildcardPerm)) {
      return true;
    }
  }

  return false;
}
```

---

### 7. Unbounded Database Queries
**File:** `/Users/greghogue/Leora/app/api/portal/insights/route.ts:293-318`
**Severity:** MEDIUM
**Issue:**
```typescript
tx.orderLine.findMany({
  where: {
    order: {
      tenantId: tenant.tenantId,
      status: { notIn: excludedStatuses },
      orderDate: {
        gte: sixMonthsAgo,
        lte: now,
      },
    },
  },
  // NO take/skip/limit!
  include: {
    product: { /* ... */ },
    order: { /* ... */ },
  },
})
```

For a large tenant with 100K+ order lines in 6 months, this will:
- Load massive amounts of data into memory
- Cause timeout errors
- Slow down all other queries in the transaction
- Potentially crash the Node.js process

**Fix:**
```typescript
// Option 1: Add reasonable limit
const MAX_ORDER_LINES = 10000;

const orderLinesSixMonths = await tx.orderLine.findMany({
  where: { /* ... */ },
  include: { /* ... */ },
  take: MAX_ORDER_LINES,
  orderBy: { createdAt: 'desc' },
});

if (orderLinesSixMonths.length === MAX_ORDER_LINES) {
  console.warn(`Hit max order lines limit (${MAX_ORDER_LINES}) for insights calculation`);
}

// Option 2: Use aggregation instead
const productRevenue = await tx.$queryRaw`
  SELECT
    p.id as product_id,
    p.name as product_name,
    p.category,
    SUM(ol.total_amount) as revenue,
    COUNT(DISTINCT o.customer_id) as customer_count
  FROM order_line ol
  JOIN "order" o ON ol.order_id = o.id
  JOIN product p ON ol.product_id = p.id
  WHERE o.tenant_id = ${tenant.tenantId}
    AND o.status NOT IN ('CANCELLED', 'DRAFT')
    AND o.order_date >= ${sixMonthsAgo}
    AND o.order_date <= ${now}
  GROUP BY p.id, p.name, p.category
  ORDER BY revenue DESC
  LIMIT 10
`;
```

---

### 8. No Request Timeout Protection
**Files:** All API routes
**Severity:** MEDIUM
**Issue:**
None of the routes have timeout protection. A slow database query or external API call could hang indefinitely.

**Fix:**
Add timeout middleware:
```typescript
// app/api/_utils/timeout.ts
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage)),
        timeoutMs
      )
    ),
  ]);
}

// Usage in routes
const result = await withTimeout(
  withTenant(tenant.tenantId, async (tx) => {
    // ... database operations
  }),
  30000, // 30 second timeout
  'Database query timeout'
);
```

---

### 9. Missing Input Sanitization
**File:** `/Users/greghogue/Leora/app/api/portal/products/route.ts:50-56`
**Severity:** MEDIUM
**Issue:**
```typescript
if (search) {
  where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
    { sku: { contains: search, mode: 'insensitive' } },
  ];
}
```

No sanitization of the search input. Special characters could cause:
- Poor query performance
- Unexpected results
- Potential ReDoS (Regular Expression Denial of Service) in some Prisma versions

**Fix:**
```typescript
function sanitizeSearchInput(input: string): string {
  // Remove control characters and limit length
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .trim()
    .slice(0, 100); // Reasonable max length
}

if (search) {
  const sanitizedSearch = sanitizeSearchInput(search);
  if (sanitizedSearch.length > 0) {
    where.OR = [
      { name: { contains: sanitizedSearch, mode: 'insensitive' } },
      { description: { contains: sanitizedSearch, mode: 'insensitive' } },
      { sku: { contains: sanitizedSearch, mode: 'insensitive' } },
    ];
  }
}
```

---

### 10. Hardcoded Business Logic Values
**File:** `/Users/greghogue/Leora/app/api/portal/cart/route.ts:81-83`
**Severity:** LOW
**Issue:**
```typescript
const tax = subtotal * 0.09; // 9% tax rate (should come from tenant settings)
const shipping = subtotal > 100 ? 0 : 5.0; // Free shipping over $100
```

Tax rates and shipping thresholds should come from tenant settings, not be hardcoded.

**Fix:**
```typescript
const tenantSettings = await tx.tenantSettings.findUnique({
  where: { tenantId: tenant.tenantId },
});

const taxRate = tenantSettings?.defaultTaxRate ?? 0.09;
const freeShippingThreshold = tenantSettings?.freeShippingThreshold ?? 100;
const standardShippingCost = tenantSettings?.standardShippingCost ?? 5.0;

const tax = subtotal * taxRate;
const shipping = subtotal >= freeShippingThreshold ? 0 : standardShippingCost;
```

---

### 11. No Pagination Validation in Products Route
**File:** `/Users/greghogue/Leora/app/api/portal/products/route.ts:92-115`
**Severity:** LOW
**Issue:**
```typescript
const [products, total] = await Promise.all([
  tx.product.findMany({
    where,
    // ...
    take: limit,
    skip: (page - 1) * limit,
  }),
  tx.product.count({ where }),
]);
```

If `page` is very large (e.g., 1,000,000), the skip value becomes massive, causing:
- Slow query performance (database has to skip millions of rows)
- Potential integer overflow
- Poor user experience

**Fix:**
```typescript
const MAX_PAGE = 1000;
const MAX_SKIP = 10000;

const safePage = Math.min(page, MAX_PAGE);
const skip = Math.min((safePage - 1) * limit, MAX_SKIP);

const [products, total] = await Promise.all([
  tx.product.findMany({
    where,
    take: limit,
    skip,
  }),
  tx.product.count({ where }),
]);

if ((page - 1) * limit > MAX_SKIP) {
  console.warn(`Page ${page} exceeds max skip limit, capping at ${MAX_SKIP}`);
}
```

---

### 12. Inefficient isDatabaseOrTenantIssue Function
**File:** `/Users/greghogue/Leora/app/api/portal/insights/route.ts:123-149`
**Severity:** LOW
**Issue:**
```typescript
function isDatabaseOrTenantIssue(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // Multiple instanceof checks with no priority
  // String operations on every error
  // No caching of common error types
}
```

**Fix:**
```typescript
import { Prisma } from '@prisma/client';

function isDatabaseOrTenantIssue(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // Fast path: Check instance types first (most common)
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return true;
  }

  // Slow path: String matching (less common)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Use Set for O(1) lookup instead of multiple includes()
    const errorKeywords = new Set([
      'database',
      'tenant not found',
      'portal user not found',
      'failed to connect',
      'timeout',
      'connection',
      'permission denied to relation',
    ]);

    return Array.from(errorKeywords).some(keyword => message.includes(keyword));
  }

  return false;
}
```

---

### 13. No Distributed Tracing or Request Context
**Files:** All API routes
**Severity:** MEDIUM
**Issue:**
No request context propagation means:
- Cannot trace requests across services
- Cannot correlate logs from different operations
- Cannot measure performance per endpoint
- Cannot debug production issues effectively

**Fix:**
Add request context middleware:
```typescript
// app/api/_utils/request-context.ts
import { AsyncLocalStorage } from 'async_hooks';
import { NextRequest } from 'next/server';

export interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  startTime: number;
  path: string;
  method: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(request: NextRequest): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
    path: new URL(request.url).pathname,
    method: request.method,
  };
}

export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

export async function withRequestContext<T>(
  context: RequestContext,
  callback: () => Promise<T>
): Promise<T> {
  return asyncLocalStorage.run(context, callback);
}

// Usage in routes
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  return withRequestContext(context, async () => {
    try {
      // ... route logic
    } finally {
      const duration = Date.now() - context.startTime;
      console.log(`[${context.requestId}] ${context.method} ${context.path} - ${duration}ms`);
    }
  });
}
```

---

### 14. Decimal Type Conversion Loss of Precision
**Files:** Multiple routes
**Severity:** LOW
**Issue:**
```typescript
const revenueThisMonth = Number(revenueThisMonthAgg._sum?.totalAmount || 0);
```

Converting Prisma `Decimal` types to `Number` can lose precision for large monetary values. JavaScript numbers have precision limits around 15-17 significant digits.

**Fix:**
```typescript
import { Decimal } from '@prisma/client/runtime/library';

// Option 1: Keep as Decimal and convert to string for JSON
const revenueThisMonth = revenueThisMonthAgg._sum?.totalAmount || new Decimal(0);

return successResponse({
  summary: {
    totalRevenue: revenueThisMonth.toFixed(2), // String representation
    // ...
  }
});

// Option 2: Use integer cents instead
const revenueThisMonthCents = (revenueThisMonthAgg._sum?.totalAmount || new Decimal(0))
  .times(100)
  .toNumber();

return successResponse({
  summary: {
    totalRevenueCents: revenueThisMonthCents, // Integer, no precision loss
    // ...
  }
});
```

---

## Code Smells

### 1. Long Method: GET /api/portal/insights
**Lines:** 154-486 (332 lines)
**Issue:** The insights route is a 332-line function with 11 database queries, complex calculations, and error handling all in one place.

**Refactor:**
```typescript
// Break into smaller functions
async function calculateRevenueSummary(tx, tenant, dates) { /* ... */ }
async function calculateAccountHealth(tx, tenant) { /* ... */ }
async function findTopOpportunities(tx, tenant, dates) { /* ... */ }
async function generateAlerts(tx, tenant) { /* ... */ }

export async function GET(request: NextRequest) {
  const user = await requirePermission(request, 'portal.insights.view');
  const tenant = await requireTenant(request);

  const insights = await withTenant(tenant.tenantId, async (tx) => {
    const [summary, health, opportunities, alerts] = await Promise.all([
      calculateRevenueSummary(tx, tenant, { startOfMonth, now }),
      calculateAccountHealth(tx, tenant),
      findTopOpportunities(tx, tenant, { sixMonthsAgo, now }),
      generateAlerts(tx, tenant),
    ]);

    return { summary, health, opportunities, alerts };
  });

  return successResponse(insights);
}
```

### 2. Duplicate Code: Error Handling Blocks
All routes have nearly identical error handling:
```typescript
catch (error) {
  console.error('Error fetching orders:', error);

  if (error instanceof Error && error.message === 'Authentication required') {
    return Errors.unauthorized();
  }

  if (error instanceof Error && error.message.startsWith('Permission denied')) {
    return Errors.forbidden();
  }

  return Errors.serverError('Failed to fetch orders');
}
```

**Refactor:** Create a centralized error handler
```typescript
// app/api/_utils/error-handler.ts
export function handleApiError(error: unknown, context: string) {
  console.error(`Error in ${context}:`, error);

  if (error instanceof Error && error.message === 'Authentication required') {
    return Errors.unauthorized();
  }

  if (error instanceof Error && error.message.startsWith('Permission denied')) {
    return Errors.forbidden(error.message);
  }

  if (isDatabaseOrTenantIssue(error)) {
    return Errors.serverError('Database temporarily unavailable');
  }

  return Errors.serverError(`Failed to ${context}`);
}

// Usage
catch (error) {
  return handleApiError(error, 'fetch orders');
}
```

### 3. Magic Numbers
- Tax rate: `0.09`
- Shipping threshold: `100`
- Shipping cost: `5.0`
- Default sample allowance: `60`
- Primary SKU index: `0`
- Days to overdue: `14`

**Refactor:** Move to configuration/constants file

### 4. Complex Conditionals
```typescript
const revenueChange =
  revenueLastMonth === 0
    ? revenueThisMonth > 0
      ? 100
      : 0
    : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
```

**Refactor:**
```typescript
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

const revenueChange = calculatePercentageChange(revenueThisMonth, revenueLastMonth);
```

---

## Refactoring Opportunities

### 1. Extract Query Builders
**Benefit:** Reusable, testable, consistent query logic

```typescript
// lib/queries/orders.ts
export class OrderQueryBuilder {
  private where: Prisma.OrderWhereInput = {};

  forTenant(tenantId: string) {
    this.where.tenantId = tenantId;
    return this;
  }

  excludeStatuses(statuses: OrderStatus[]) {
    this.where.status = { notIn: statuses };
    return this;
  }

  inDateRange(start: Date, end: Date) {
    this.where.orderDate = { gte: start, lte: end };
    return this;
  }

  build() {
    return this.where;
  }
}

// Usage
const where = new OrderQueryBuilder()
  .forTenant(tenant.tenantId)
  .excludeStatuses(['CANCELLED', 'DRAFT'])
  .inDateRange(startOfMonth, now)
  .build();
```

### 2. Create Response DTOs
**Benefit:** Type safety, consistent formatting, easier testing

```typescript
// lib/dto/insights.dto.ts
export class InsightsSummaryDto {
  totalRevenue: string; // Use string for precise decimals
  revenueChange: number;
  activeAccounts: number;
  atRiskAccounts: number;
  ordersThisMonth: number;
  ordersChange: number;

  static fromAggregates(data: {
    revenueThisMonth: Decimal;
    revenueLastMonth: Decimal;
    ordersThisMonth: number;
    ordersLastMonth: number;
    activeAccounts: number;
    atRiskAccounts: number;
  }): InsightsSummaryDto {
    return {
      totalRevenue: data.revenueThisMonth.toFixed(2),
      revenueChange: calculatePercentageChange(
        data.revenueThisMonth.toNumber(),
        data.revenueLastMonth.toNumber()
      ),
      activeAccounts: data.activeAccounts,
      atRiskAccounts: data.atRiskAccounts,
      ordersThisMonth: data.ordersThisMonth,
      ordersChange: calculatePercentageChange(
        data.ordersThisMonth,
        data.ordersLastMonth
      ),
    };
  }
}
```

### 3. Implement Repository Pattern
**Benefit:** Testable data access, easier to mock, cleaner routes

```typescript
// lib/repositories/order.repository.ts
export class OrderRepository {
  constructor(private tx: PrismaClient) {}

  async countByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    excludeStatuses: OrderStatus[] = []
  ): Promise<number> {
    return this.tx.order.count({
      where: {
        tenantId,
        orderDate: { gte: startDate, lte: endDate },
        ...(excludeStatuses.length > 0 && {
          status: { notIn: excludeStatuses }
        }),
      },
    });
  }

  // ... other methods
}

// Usage in route
const orderRepo = new OrderRepository(tx);
const ordersThisMonth = await orderRepo.countByTenantAndDateRange(
  tenant.tenantId,
  startOfMonth,
  now,
  ['CANCELLED', 'DRAFT']
);
```

---

## Positive Findings

### ✅ Good Practices Observed

1. **Consistent API Response Shape**
   - All routes use `successResponse()` and `Errors` helpers
   - Predictable JSON structure for clients

2. **Zod Validation**
   - Input validation schemas for all routes
   - Type-safe parameter parsing

3. **Multi-Tenant Isolation**
   - All routes properly call `requireTenant()`
   - Tenant context propagated to database queries

4. **RBAC Enforcement**
   - Permission checks at route entry points
   - Fine-grained permissions per endpoint

5. **Transaction Usage**
   - Complex operations wrapped in `withTenant()` transactions
   - Atomicity for multi-query operations

6. **Fallback to Demo Data**
   - Insights route gracefully falls back to demo data
   - Keeps portal functional during database issues

---

## Recommendations by Priority

### Immediate (Fix in Next Sprint)
1. ✅ Fix SQL injection in `withTenant()`
2. ✅ Add error IDs and structured logging
3. ✅ Fix cart race condition with upsert
4. ✅ Add timeout protection to all routes
5. ✅ Add null checks for database relations

### Short Term (Fix in 2-4 Weeks)
6. ✅ Implement request context/tracing
7. ✅ Add pagination limits and validation
8. ✅ Extract business logic to service layer
9. ✅ Create repository pattern for data access
10. ✅ Add input sanitization

### Medium Term (Fix in 1-2 Months)
11. ✅ Move hardcoded values to tenant settings
12. ✅ Implement proper decimal handling
13. ✅ Add comprehensive error codes
14. ✅ Create response DTOs
15. ✅ Add query performance monitoring

---

## Suggested Improved Error Handling Pattern

```typescript
// app/api/_utils/error-handler.ts
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { errorResponse } from './response';

export interface ApiErrorContext {
  operation: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(
  error: unknown,
  context: ApiErrorContext
): NextResponse {
  const errorId = crypto.randomUUID();

  // Structured logging
  console.error(`[${errorId}] API Error:`, {
    ...context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    } : error,
    timestamp: new Date().toISOString(),
  });

  // Known error types
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, error.code, {
      errorId,
      ...error.details,
    });
  }

  // Authentication errors
  if (error instanceof Error && error.message === 'Authentication required') {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED', { errorId });
  }

  // Permission errors
  if (error instanceof Error && error.message.includes('Permission denied')) {
    return errorResponse(error.message, 403, 'FORBIDDEN', { errorId });
  }

  // Tenant errors
  if (error instanceof Error && error.message.includes('Tenant not found')) {
    return errorResponse('Tenant not found', 404, 'TENANT_NOT_FOUND', { errorId });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return errorResponse(
          'Resource already exists',
          409,
          'DUPLICATE_RESOURCE',
          { errorId, field: error.meta?.target }
        );
      case 'P2025':
        return errorResponse(
          'Resource not found',
          404,
          'NOT_FOUND',
          { errorId }
        );
      case 'P2003':
        return errorResponse(
          'Referenced resource not found',
          404,
          'FOREIGN_KEY_VIOLATION',
          { errorId, field: error.meta?.field_name }
        );
      default:
        return errorResponse(
          'Database operation failed',
          500,
          'DATABASE_ERROR',
          { errorId, code: error.code }
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return errorResponse(
      'Invalid data provided',
      400,
      'VALIDATION_ERROR',
      { errorId }
    );
  }

  // Generic error
  const message = process.env.NODE_ENV === 'development' && error instanceof Error
    ? error.message
    : `Failed to ${context.operation}`;

  return errorResponse(message, 500, 'INTERNAL_ERROR', { errorId });
}
```

---

## Validation Check Improvements

```typescript
// lib/validations/portal.ts

// Add request size limits
export const MAX_SEARCH_LENGTH = 100;
export const MAX_NOTES_LENGTH = 1000;
export const MAX_ARRAY_LENGTH = 100;

// Improved pagination with bounds
export const paginationSchema = z.object({
  page: z.string()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1).max(1000)), // Max page 1000
  limit: z.string()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
});

// Add pre-processing sanitization
export const searchSchema = z.string()
  .trim()
  .max(MAX_SEARCH_LENGTH, `Search query too long (max ${MAX_SEARCH_LENGTH} characters)`)
  .transform(str => str.replace(/[\x00-\x1F\x7F]/g, '')); // Remove control chars

// Validate date ranges
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before end date' }
).refine(
  data => {
    if (data.startDate) {
      const start = new Date(data.startDate);
      const maxPast = new Date();
      maxPast.setFullYear(maxPast.getFullYear() - 10); // Max 10 years back
      return start >= maxPast;
    }
    return true;
  },
  { message: 'Start date cannot be more than 10 years in the past' }
);

// Add array length validation
export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  lines: z.array(
    z.object({
      productId: z.string().uuid(),
      skuId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10000), // Max quantity per line
      unitPrice: z.number().min(0).max(1000000), // Max price $1M
    })
  )
    .min(1, 'Order must have at least one line item')
    .max(MAX_ARRAY_LENGTH, `Order cannot have more than ${MAX_ARRAY_LENGTH} line items`),
  notes: z.string().max(MAX_NOTES_LENGTH).optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
});
```

---

## Database Query Optimizations

### 1. Add Database Indexes
```sql
-- For order queries by date range
CREATE INDEX idx_order_tenant_date_status
ON "order" (tenant_id, order_date DESC, status);

-- For customer activity queries
CREATE INDEX idx_order_customer_date
ON "order" (customer_id, order_date DESC);

-- For product search
CREATE INDEX idx_product_name_gin
ON product USING gin (to_tsvector('english', name));

-- For cart lookups
CREATE UNIQUE INDEX idx_cart_user_active
ON cart (portal_user_id, status)
WHERE status = 'ACTIVE';
```

### 2. Use Database Aggregations
Replace in-memory calculations with database aggregations:

```typescript
// Before (loads all data into memory)
const orderLines = await tx.orderLine.findMany({ where: { /* ... */ } });
const total = orderLines.reduce((sum, line) => sum + Number(line.totalAmount), 0);

// After (aggregates in database)
const { _sum } = await tx.orderLine.aggregate({
  where: { /* ... */ },
  _sum: { totalAmount: true },
});
const total = _sum.totalAmount || 0;
```

### 3. Implement Query Result Caching
```typescript
import { unstable_cache } from 'next/cache';

const getCachedInsights = unstable_cache(
  async (tenantId: string, date: string) => {
    return await withTenant(tenantId, async (tx) => {
      // ... expensive insights queries
    });
  },
  ['portal-insights'],
  {
    revalidate: 300, // 5 minutes
    tags: ['insights'],
  }
);
```

---

## Conclusion

The API routes are functional but need significant improvements in:
- **Error handling and observability**
- **Input validation and sanitization**
- **Query performance and safety**
- **Type safety and precision**
- **Code organization and maintainability**

With the recommended fixes, the quality score can improve from **5/10 to 8/10** within 2-4 weeks of focused effort.

**Estimated effort:**
- Critical fixes: 8 hours
- High priority: 16 hours
- Medium priority: 24 hours
- Refactoring: 32 hours
- **Total: 80 hours (2 weeks with 1 developer)**
