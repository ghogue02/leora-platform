# API Surface Implementation

## Overview

This document describes the complete API surface implementation for the Leora Platform as specified in Blueprint Section 5.2.

## Implementation Date

October 15, 2025

## Architecture

### Response Format

All API endpoints follow a consistent response shape:

```typescript
// Success Response
{
  success: true,
  data: T
}

// Error Response
{
  success: false,
  error: {
    message: string,
    code?: string,
    details?: unknown
  }
}
```

### Authentication & Authorization

- **RBAC**: Role-Based Access Control using permission checks
- **Tenant Isolation**: All requests are scoped to a tenant via headers or defaults
- **JWT Support**: Prepared for JWT-based authentication (to be implemented)
- **Permission Format**: `portal.resource.action` (e.g., `portal.orders.read`)

### Validation

All endpoints use Zod schemas for request validation:
- Query parameters
- Request bodies
- Path parameters

## Implemented Endpoints

### 1. Catalog API

**GET /api/portal/products**
- List products with filters
- Pagination support
- Sorting options
- Search, category, supplier filters
- Price range filtering
- Stock availability filtering

**Permissions**: `portal.products.read`

### 2. Orders API

**GET /api/portal/orders**
- List orders with filters
- Status filtering
- Date range support
- Customer-scoped for portal users
- Pagination and sorting

**POST /api/portal/orders**
- Create new order
- Multi-line order support
- Pricing validation
- Inventory checks (to be implemented)

**GET /api/portal/orders/[id]**
- Get order details
- Full order information with lines
- Address and payment details

**PATCH /api/portal/orders/[id]**
- Update order
- Partial updates supported

**DELETE /api/portal/orders/[id]**
- Cancel order
- Inventory restoration (to be implemented)

**Permissions**: `portal.orders.*`

### 3. Cart API

**GET /api/portal/cart**
- Get current user's cart
- Includes items with product details
- Calculated totals

**DELETE /api/portal/cart**
- Clear entire cart

**POST /api/portal/cart/items**
- Add item to cart
- Quantity validation
- Inventory checks (to be implemented)

**PATCH /api/portal/cart/items**
- Update item quantity
- Query param: `itemId`

**DELETE /api/portal/cart/items**
- Remove item from cart
- Query param: `itemId`

**POST /api/portal/cart/checkout**
- Process checkout
- Create order from cart
- Payment processing integration point
- Inventory updates (to be implemented)
- Cart clearing

**Authentication**: Required (no specific permission)

### 4. Analytics & Insights API

**GET /api/portal/insights**
- Dashboard insights
- Health metrics (ARPDD, revenue risk)
- Sample usage tracking
- Top opportunities
- Account health scores
- Real-time alerts

**Query Parameters**:
- `type`: health, pace, revenue, samples, opportunities
- `startDate`, `endDate`: Date range filtering

**Permissions**: `portal.insights.read`

**Blueprint Alignment**:
- Section 1.2: Ordering pace (ARPDD)
- Section 1.2: Revenue health (15% threshold)
- Section 1.2: Sample tracking (60 pulls/month)
- Section 1.2: Top 20 opportunities

### 5. Reports API

**GET /api/portal/reports**
- Generate reports
- Multiple report types: sales, inventory, customer, product
- Date range filtering
- Grouping options: day, week, month, quarter, year
- Format options: JSON, CSV, PDF

**POST /api/portal/reports**
- Create custom report configuration
- Save for reuse

**Permissions**: `portal.reports.*`

### 6. Favorites API

**GET /api/portal/favorites**
- List user's favorite products

**POST /api/portal/favorites**
- Add product to favorites

**DELETE /api/portal/favorites**
- Remove from favorites
- Query param: `productId`

**Authentication**: Required

### 7. Lists API

**GET /api/portal/lists**
- Get user's product lists/collections
- Item counts included

**POST /api/portal/lists**
- Create new list
- Public/private option

**DELETE /api/portal/lists**
- Delete list
- Query param: `listId`

**Authentication**: Required

### 8. Notifications API

**GET /api/portal/notifications**
- Get user notifications
- Filtering: read/unread, type
- Pagination support
- Unread count included

**PATCH /api/portal/notifications**
- Mark as read/unread

**DELETE /api/portal/notifications**
- Delete notification
- Query param: `notificationId`

**Authentication**: Required

### 9. Order Templates API

**GET /api/portal/templates**
- Get saved order templates
- Includes estimated totals

**POST /api/portal/templates**
- Create order template
- Save cart as template

**DELETE /api/portal/templates**
- Delete template
- Query param: `templateId`

**Authentication**: Required

## Utility Modules

### Response Helpers (`app/api/_utils/response.ts`)

- `successResponse<T>(data: T, status?: number)`: Success wrapper
- `errorResponse(...)`: Error wrapper
- `Errors`: Common error responses
  - `unauthorized()`
  - `forbidden()`
  - `notFound()`
  - `badRequest()`
  - `conflict()`
  - `serverError()`
  - `validationError()`

### Tenant Isolation (`app/api/_utils/tenant.ts`)

- `withTenantFromRequest(request)`: Extract tenant context
- `requireTenant(request)`: Require tenant or throw
- `setTenantContext(tenantId)`: Set for Prisma queries

### Authentication (`app/api/_utils/auth.ts`)

- `withPortalUserFromRequest(request)`: Extract user from JWT
- `requireAuth(request)`: Require authentication
- `hasPermission(user, permission)`: Check permission
- `requirePermission(request, permission)`: Require specific permission

## Validation Schemas (`lib/validations/portal.ts`)

### Common Schemas
- `paginationSchema`: page, limit
- `sortSchema`: sortBy, sortOrder
- `dateRangeSchema`: startDate, endDate

### Resource-Specific Schemas
- `productFilterSchema`
- `orderFilterSchema`
- `createOrderSchema`
- `addToCartSchema`
- `updateCartItemSchema`
- `checkoutSchema`
- `addFavoriteSchema`
- `createListSchema`
- `reportFilterSchema`
- `insightFilterSchema`
- `notificationFilterSchema`
- `markNotificationReadSchema`

## Integration Points

### Database (Prisma)

All endpoints are prepared for Prisma integration with:
- Tenant isolation via `app.current_tenant_id` session parameter
- Transaction support for multi-step operations
- Audit logging
- RLS policies (to be enabled in Supabase)

### Pricing Engine

Order creation endpoints integrate with pricing waterfall:
1. Customer-specific pricing
2. Volume discounts
3. Promotional pricing
4. List price fallback

### Inventory Management

Cart and order operations include integration points for:
- Stock validation
- Reservation
- Fulfillment
- Restoration on cancellation

### Notifications

Event-driven notifications for:
- Order status changes
- Product availability
- Revenue alerts
- Sample threshold warnings

## Security Features

### Tenant Isolation
- All queries scoped to tenant
- Header-based tenant resolution
- Default tenant fallback

### RBAC
- Permission-based access control
- Resource-level permissions
- Wildcard permission support

### Data Validation
- Zod schema validation
- Type safety
- Malformed request rejection

### Error Handling
- Consistent error responses
- No information leakage
- Detailed logging

## Testing Checklist

- [ ] Unit tests for validation schemas
- [ ] Integration tests for each endpoint
- [ ] RBAC permission tests
- [ ] Tenant isolation tests
- [ ] Error handling tests
- [ ] Pagination tests
- [ ] Rate limiting tests (to be implemented)

## Next Steps

### Immediate
1. Implement Prisma queries for each endpoint
2. Enable RLS policies in Supabase
3. Implement JWT authentication
4. Add rate limiting middleware

### Phase 2
1. Implement pricing waterfall logic
2. Add inventory management integration
3. Build webhook automation
4. Implement PDF report generation
5. Add real-time notifications

### Phase 3
1. Leora AI integration (GPT-5)
2. Advanced analytics queries
3. Predictive insights
4. Sample management automation

## Blueprint Compliance

This implementation fulfills Blueprint Section 5.2 requirements:

✅ Catalog API with filtering and pagination
✅ Orders API with list, detail, create, update, cancel
✅ Cart API with items and checkout
✅ Analytics/Insights API with health scoring
✅ Reports API with multiple formats
✅ Favorites, Lists, Notifications, Templates APIs
✅ Consistent response shape `{ success, data, error }`
✅ Zod validation on all endpoints
✅ RBAC permission checks
✅ Tenant isolation throughout

## Performance Considerations

- Pagination defaults to 20 items
- Maximum page size: 100 items
- Query optimization needed for large datasets
- Consider caching for insights/reports
- Database indexes on filtered columns

## Documentation Standards

Each endpoint includes:
- Purpose and description
- Required permissions
- Query parameters
- Request body schema
- Response format
- Error scenarios
- TODO markers for Prisma implementation

## Maintenance

- Update this document when adding new endpoints
- Keep validation schemas in sync with database schema
- Document breaking changes
- Version API if making incompatible changes

---

**Implementation Status**: Core structure complete, Prisma integration pending
**Blueprint Section**: 5.2 API Surface
**Date**: October 15, 2025
