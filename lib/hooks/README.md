# React Query Hooks

Type-safe data fetching hooks for the Leora portal using `@tanstack/react-query`.

## Features

- **Type Safety**: Full TypeScript support with API response types
- **Caching**: Smart caching with configurable stale times
- **Optimistic Updates**: Immediate UI feedback for mutations
- **Error Handling**: Consistent error handling across all hooks
- **Loading States**: Built-in loading and error states

## Installation

React Query is already installed in this project:

```bash
npm install @tanstack/react-query
```

## Setup

Wrap your app with `QueryClientProvider` (already configured in `app/layout.tsx`):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## Usage Examples

### Products

```tsx
import { useProducts, useProduct } from '@/lib/hooks';

function ProductList() {
  const { data, isLoading, error } = useProducts({
    category: 'Wine',
    inStock: true,
    page: 1,
    limit: 20,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      <Pagination meta={data?.pagination} />
    </div>
  );
}

function ProductDetail({ id }: { id: string }) {
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) return <Skeleton />;

  return <ProductView product={product} />;
}
```

### Orders

```tsx
import { useOrders, useCreateOrder, useCancelOrder } from '@/lib/hooks';

function OrderHistory() {
  const { data, isLoading } = useOrders({
    status: 'pending',
    page: 1,
    limit: 10,
  });

  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder({
    onSuccess: () => {
      toast.success('Order cancelled successfully');
    },
  });

  return (
    <div>
      {data?.orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onCancel={() => cancelOrder(order.id)}
          isCancelling={isCancelling}
        />
      ))}
    </div>
  );
}

function CreateOrderButton() {
  const { mutate: createOrder, isPending } = useCreateOrder({
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} created`);
      router.push(`/orders/${order.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    createOrder({
      customerId: 'customer-123',
      lines: [
        {
          productId: 'prod-1',
          skuId: 'sku-1',
          quantity: 2,
          unitPrice: 29.99,
        },
      ],
      notes: 'Please deliver to back door',
    });
  };

  return (
    <Button onClick={handleSubmit} disabled={isPending}>
      {isPending ? 'Creating...' : 'Create Order'}
    </Button>
  );
}
```

### Cart

```tsx
import {
  useCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveFromCart,
  useCheckout,
  useCartItemCount,
} from '@/lib/hooks';

function CartBadge() {
  const itemCount = useCartItemCount();

  return (
    <Badge>
      <ShoppingCart />
      {itemCount > 0 && <span>{itemCount}</span>}
    </Badge>
  );
}

function CartPage() {
  const { data: cart, isLoading } = useCart();
  const { mutate: updateItem } = useUpdateCartItem();
  const { mutate: removeItem } = useRemoveFromCart();
  const { mutate: checkout, isPending: isCheckingOut } = useCheckout({
    onSuccess: (response) => {
      toast.success('Order placed successfully!');
      router.push(`/orders/${response.order.id}`);
    },
  });

  if (isLoading) return <Skeleton />;

  return (
    <div>
      {cart?.items.map((item) => (
        <CartItem
          key={item.id}
          item={item}
          onUpdateQuantity={(qty) =>
            updateItem({ itemId: item.id, quantity: qty })
          }
          onRemove={() => removeItem(item.id)}
        />
      ))}
      <CartSummary
        subtotal={cart?.subtotal}
        tax={cart?.tax}
        shipping={cart?.shipping}
        total={cart?.total}
      />
      <Button
        onClick={() =>
          checkout({
            shippingAddressId: 'addr-123',
            notes: 'Handle with care',
          })
        }
        disabled={isCheckingOut || cart?.items.length === 0}
      >
        {isCheckingOut ? 'Processing...' : 'Checkout'}
      </Button>
    </div>
  );
}

function AddToCartButton({ productId, skuId }: Props) {
  const { mutate: addToCart, isPending } = useAddToCart({
    onSuccess: () => {
      toast.success('Added to cart');
    },
  });

  return (
    <Button
      onClick={() => addToCart({ productId, skuId, quantity: 1 })}
      disabled={isPending}
    >
      {isPending ? 'Adding...' : 'Add to Cart'}
    </Button>
  );
}
```

### Insights & Analytics

```tsx
import {
  useInsights,
  useHealthMetrics,
  usePaceTracking,
  useSampleMetrics,
  useOpportunities,
  useAlerts,
} from '@/lib/hooks';

function InsightsDashboard() {
  const { data: insights, isLoading } = useInsights();
  const { data: alerts } = useAlerts();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <SummaryCards summary={insights?.summary} />
      <HealthChart health={insights?.health} />
      <PaceTracker pace={insights?.pace} />
      <SampleUsage samples={insights?.samples} />
      <AlertsList alerts={alerts} />
    </div>
  );
}

function HealthMetricsWidget() {
  const { data: health } = useHealthMetrics();

  return (
    <Card>
      <h3>Account Health</h3>
      <HealthScore
        healthy={health?.healthy}
        atRisk={health?.atRisk}
        critical={health?.critical}
        needsAttention={health?.needsAttention}
      />
    </Card>
  );
}

function PaceTrackingWidget() {
  const { data: pace } = usePaceTracking();

  return (
    <Card>
      <h3>Ordering Pace (ARPDD)</h3>
      <PaceIndicator
        onPace={pace?.onPace}
        slipping={pace?.slipping}
        overdue={pace?.overdue}
      />
    </Card>
  );
}

function OpportunitiesWidget() {
  const { data: opportunities } = useOpportunities();

  return (
    <Card>
      <h3>Top Opportunities</h3>
      <OpportunityList opportunities={opportunities} />
    </Card>
  );
}

function AlertsNotificationBell() {
  const { data: alerts } = useAlerts();
  const criticalCount = alerts?.filter((a) => a.severity === 'critical').length;

  return (
    <Button variant="ghost" size="icon">
      <Bell />
      {criticalCount > 0 && (
        <Badge variant="destructive">{criticalCount}</Badge>
      )}
    </Button>
  );
}
```

## Query Keys

Each hook exports query keys for manual cache invalidation:

```tsx
import { productKeys, orderKeys, cartKeys, insightKeys } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';

function RefreshButton() {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: productKeys.all });
    queryClient.invalidateQueries({ queryKey: orderKeys.all });
    queryClient.invalidateQueries({ queryKey: cartKeys.all });
    queryClient.invalidateQueries({ queryKey: insightKeys.all });
  };

  return <Button onClick={refreshAll}>Refresh Data</Button>;
}
```

## Optimistic Updates

Cart mutations include optimistic updates for instant UI feedback:

```tsx
// When adding to cart, the UI updates immediately
const { mutate: addToCart } = useAddToCart();

// Click "Add to Cart" → UI updates instantly → API confirms
addToCart({ productId: 'prod-1', skuId: 'sku-1', quantity: 1 });

// If API fails, the UI automatically rolls back
```

## Caching Strategy

- **Products**: 5 minutes stale time (catalog changes infrequently)
- **Orders**: 30 seconds stale time (orders update frequently)
- **Cart**: 30 seconds stale time (active shopping session)
- **Insights**: 2 minutes stale time with auto-refetch every 5 minutes

## Error Handling

All hooks throw consistent errors that can be caught:

```tsx
const { data, error, isError } = useProducts();

if (isError) {
  return <ErrorBoundary error={error} />;
}
```

## TypeScript Support

All hooks are fully typed with API response types from `@/lib/types/api`:

```tsx
import type { Product, Order, Cart, Insights } from '@/lib/types/api';

// TypeScript knows the exact shape of data
const { data } = useProducts();
//    ^? ProductListResponse

const { data: product } = useProduct('id');
//    ^? Product
```

## API Routes

Hooks connect to these API endpoints:

- **Products**: `GET /api/portal/products`, `GET /api/portal/products/[id]`
- **Orders**: `GET /api/portal/orders`, `POST /api/portal/orders`, `GET /api/portal/orders/[id]`, `DELETE /api/portal/orders/[id]`
- **Cart**: `GET /api/portal/cart`, `POST /api/portal/cart/items`, `PATCH /api/portal/cart/items`, `DELETE /api/portal/cart/items`, `POST /api/portal/cart/checkout`
- **Insights**: `GET /api/portal/insights`

## Best Practices

1. **Use query keys for cache invalidation** after mutations
2. **Enable optimistic updates** for better UX
3. **Set appropriate stale times** based on data freshness needs
4. **Handle loading and error states** in components
5. **Leverage TypeScript** for type safety
6. **Use select** to transform data when needed:

```tsx
const { data: productNames } = useProducts(
  {},
  {
    select: (data) => data.products.map((p) => p.name),
  }
);
```

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Leora API Types](../types/api.ts)
- [Leora Platform Blueprint](../../leora-platform-blueprint.md)
