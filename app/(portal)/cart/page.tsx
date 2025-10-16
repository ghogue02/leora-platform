'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart, useUpdateCartItem, useRemoveFromCart, useClearCart } from '@/lib/hooks/useCart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Trash2, Plus, Minus, Package, AlertCircle } from 'lucide-react';

/**
 * Shopping Cart Page
 *
 * Review cart items and proceed to checkout
 *
 * Features:
 * - Cart item list with quantities
 * - Update/remove items
 * - Pricing summary
 * - Sample order handling
 * - Checkout flow
 *
 * Data source:
 * - /api/portal/cart
 * - /api/portal/cart/items
 * - /api/portal/cart/checkout
 * - Cart, CartItem models
 */
export default function CartPage() {
  const { data: cart, isLoading, error } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();
  const clearCart = useClearCart();

  const handleUpdateQuantity = (itemId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty > 0) {
      updateItem.mutate({ itemId, quantity: newQty });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem.mutate(itemId);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load cart"
          description="We encountered an error loading your shopping cart. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-heading-xl font-semibold">Shopping Cart</h1>
          <p className="text-muted">
            Review your items and proceed to checkout.
          </p>
        </div>
        {cart && cart.items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearCart.mutate()}
            disabled={clearCart.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Clear Cart
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cart Items</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-20 w-20 rounded-card" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-8 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : cart && cart.items.length > 0 ? (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 rounded-card border-2 border-border"
                    >
                      <div className="h-20 w-20 flex-shrink-0">
                        {item.imageUrl ? (
                          <div className="relative h-full w-full overflow-hidden rounded-card bg-muted">
                            <Image
                              src={item.imageUrl}
                              alt={item.productName}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-card bg-muted">
                            <Package className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-body-md mb-1">
                          {item.productName}
                        </h3>
                        <p className="text-caption text-muted mb-2">
                          SKU: {item.productSku}
                        </p>
                        <p className="text-body-sm font-medium">
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <p className="text-heading-md font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </p>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 rounded-button border-2 border-border">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                              disabled={updateItem.isPending}
                              className="p-1 hover:bg-muted rounded-l-button"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-3 text-body-md font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                              disabled={updateItem.isPending}
                              className="p-1 hover:bg-muted rounded-r-button"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removeItem.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ShoppingCart}
                  title="Your cart is empty"
                  description="Add some products to get started."
                  action={{
                    label: 'Browse Products',
                    onClick: () => window.location.href = '/products',
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-body-md">
                      <span className="text-muted">Subtotal</span>
                      <span>{formatCurrency(cart?.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-body-md">
                      <span className="text-muted">Tax</span>
                      <span>{formatCurrency(cart?.tax || 0)}</span>
                    </div>
                    <div className="flex justify-between text-body-md">
                      <span className="text-muted">Shipping</span>
                      <span>{formatCurrency(cart?.shipping || 0)}</span>
                    </div>
                    <div className="border-t-2 border-border pt-2 flex justify-between text-heading-md font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(cart?.total || 0)}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={!cart || cart.items.length === 0}
                    asChild={cart && cart.items.length > 0}
                  >
                    {cart && cart.items.length > 0 ? (
                      <Link href="/cart/checkout">
                        Proceed to Checkout
                      </Link>
                    ) : (
                      <span>Proceed to Checkout</span>
                    )}
                  </Button>

                  <p className="mt-4 text-caption text-muted text-center">
                    Free shipping on orders over $100
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
