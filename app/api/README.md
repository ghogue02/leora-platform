# Leora Platform API

Complete API implementation for the Leora Platform customer portal and sales intelligence system.

## Overview

This API surface implements Blueprint Section 5.2 with comprehensive endpoints for:
- Product catalog management
- Order processing and tracking
- Shopping cart and checkout
- Analytics and insights (ARPDD, health scoring, sample tracking)
- Reporting with multiple export formats
- User features (favorites, lists, notifications, templates)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

## API Structure

```
/api/portal/
├── products           # Catalog API
├── orders             # Order management
├── cart               # Shopping cart
├── insights           # Analytics & health scoring
├── reports            # Report generation
├── favorites          # User favorites
├── lists              # Product lists
├── notifications      # User notifications
└── templates          # Order templates
```

## Response Format

All endpoints return a consistent structure:

```typescript
// Success
{
  success: true,
  data: T
}

// Error
{
  success: false,
  error: {
    message: string,
    code?: string,
    details?: unknown
  }
}
```

## Authentication

Include JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer <token>" \
     -H "X-Tenant-Slug: well-crafted" \
     https://api.example.com/api/portal/products
```

## Endpoints

### Products
- `GET /api/portal/products` - List products with filters
- `POST /api/portal/products` - Advanced search

### Orders
- `GET /api/portal/orders` - List orders
- `POST /api/portal/orders` - Create order
- `GET /api/portal/orders/[id]` - Get order details
- `PATCH /api/portal/orders/[id]` - Update order
- `DELETE /api/portal/orders/[id]` - Cancel order

### Cart
- `GET /api/portal/cart` - Get cart
- `DELETE /api/portal/cart` - Clear cart
- `POST /api/portal/cart/items` - Add item
- `PATCH /api/portal/cart/items?itemId=X` - Update quantity
- `DELETE /api/portal/cart/items?itemId=X` - Remove item
- `POST /api/portal/cart/checkout` - Process checkout

### Insights
- `GET /api/portal/insights` - Get analytics dashboard

### Reports
- `GET /api/portal/reports` - Generate report
- `POST /api/portal/reports` - Save report config

### Favorites, Lists, Notifications, Templates
See [API Quick Reference](../../docs/api-quick-reference.md) for details.

## Permissions

RBAC follows the pattern: `portal.resource.action`

Examples:
- `portal.products.read`
- `portal.orders.create`
- `portal.reports.read`
- `portal.*` (wildcard)

## Tenant Isolation

All requests are scoped to a tenant:

```typescript
// Via header
headers: {
  'X-Tenant-Slug': 'well-crafted'
}

// Or uses DEFAULT_TENANT_SLUG from environment
```

## Validation

All inputs validated with Zod schemas in `/lib/validations/portal.ts`:

```typescript
import { productFilterSchema } from '@/lib/validations/portal';

const result = productFilterSchema.safeParse(params);
if (!result.success) {
  return Errors.validationError('Invalid params', result.error);
}
```

## Error Handling

Standard error responses:

```typescript
import { Errors } from '@/app/api/_utils';

// Common errors
Errors.unauthorized()      // 401
Errors.forbidden()         // 403
Errors.notFound()          // 404
Errors.badRequest(msg)     // 400
Errors.conflict(msg)       // 409
Errors.serverError()       // 500
Errors.validationError()   // 422
```

## Development

### Adding New Endpoints

1. Create route file: `app/api/portal/[resource]/route.ts`
2. Add validation schema: `lib/validations/portal.ts`
3. Add TypeScript types: `lib/types/api.ts`
4. Implement handler with RBAC and tenant isolation
5. Add Prisma queries
6. Update documentation

### Example Handler

```typescript
import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { mySchema } from '@/lib/validations/portal';

export async function GET(request: NextRequest) {
  try {
    // RBAC check
    const user = await requirePermission(request, 'portal.resource.read');

    // Tenant isolation
    const tenant = await requireTenant(request);

    // Validate params
    const { searchParams } = new URL(request.url);
    const params = mySchema.parse(Object.fromEntries(searchParams));

    // Query with Prisma (tenant-scoped)
    const data = await prisma.resource.findMany({
      where: {
        tenantId: tenant.tenantId,
        // ... filters
      }
    });

    return successResponse(data);
  } catch (error) {
    // Error handling
    if (error.message === 'Authentication required') {
      return Errors.unauthorized();
    }
    return Errors.serverError();
  }
}
```

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test specific endpoint
curl http://localhost:3000/api/portal/products
```

## Security

### Implemented
- ✅ RBAC with permission checks
- ✅ Tenant isolation
- ✅ Input validation (Zod)
- ✅ Error sanitization
- ✅ TypeScript type safety

### To Implement
- ⏳ JWT authentication
- ⏳ Rate limiting
- ⏳ Request signing
- ⏳ Audit logging

## Performance

- Default pagination: 20 items
- Max page size: 100 items
- Consider caching for insights/reports
- Database indexes required in production

## Documentation

- [Implementation Summary](../../docs/API_IMPLEMENTATION_SUMMARY.md)
- [Quick Reference](../../docs/api-quick-reference.md)
- [Type Definitions](../../lib/types/api.ts)
- [Validation Schemas](../../lib/validations/portal.ts)

## Next Steps

1. ⏳ Implement Prisma queries
2. ⏳ Enable RLS policies in Supabase
3. ⏳ Add JWT authentication
4. ⏳ Implement rate limiting
5. ⏳ Add comprehensive tests

## Support

For questions or issues:
- Blueprint: `leora-platform-blueprint.md`
- Implementation: `docs/api-surface-implementation.md`

---

**Status**: Core structure complete, Prisma integration pending
**Blueprint**: Section 5.2 API Surface
**Date**: October 15, 2025
