# API Quick Reference

## Base URL
```
/api/portal
```

## Response Format
All endpoints return:
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { message: string, code?: string, details?: unknown } }
```

## Endpoints

### Products (Catalog)
- `GET /products` - List products with filters
- `POST /products` - Advanced product search

### Orders
- `GET /orders` - List orders
- `POST /orders` - Create order
- `GET /orders/[id]` - Get order details
- `PATCH /orders/[id]` - Update order
- `DELETE /orders/[id]` - Cancel order

### Cart
- `GET /cart` - Get cart
- `DELETE /cart` - Clear cart
- `POST /cart/items` - Add item
- `PATCH /cart/items?itemId=X` - Update item
- `DELETE /cart/items?itemId=X` - Remove item
- `POST /cart/checkout` - Process checkout

### Insights
- `GET /insights?type=health|pace|revenue|samples|opportunities` - Get analytics

### Reports
- `GET /reports?reportType=sales|inventory|customer|product&format=json|csv|pdf` - Generate report
- `POST /reports` - Save report config

### Favorites
- `GET /favorites` - List favorites
- `POST /favorites` - Add favorite
- `DELETE /favorites?productId=X` - Remove favorite

### Lists
- `GET /lists` - Get user lists
- `POST /lists` - Create list
- `DELETE /lists?listId=X` - Delete list

### Notifications
- `GET /notifications` - Get notifications
- `PATCH /notifications` - Mark read/unread
- `DELETE /notifications?notificationId=X` - Delete

### Templates
- `GET /templates` - Get order templates
- `POST /templates` - Create template
- `DELETE /templates?templateId=X` - Delete

## Authentication
Include JWT in Authorization header:
```
Authorization: Bearer <token>
```

## Tenant Context
Include tenant in header:
```
X-Tenant-Slug: well-crafted
```

## Permissions
Format: `portal.resource.action`

Examples:
- `portal.products.read`
- `portal.orders.create`
- `portal.reports.read`
- `portal.*` (wildcard)
