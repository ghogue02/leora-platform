'use client';

import { use } from 'react';
import Link from 'next/link';
import { useOrder } from '@/lib/hooks/useOrders';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Package, AlertCircle, MapPin, FileText } from 'lucide-react';

/**
 * Order Detail Page
 *
 * Shows complete order information including:
 * - Order header (number, date, status, customer)
 * - Line items with pricing
 * - Shipping information
 * - Payment status
 * - Activity timeline
 *
 * Data source:
 * - /api/portal/orders/[id]
 * - Prisma queries with Order, OrderLine relationships
 */

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = use(params);
  const { data: order, isLoading, error } = useOrder(id);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'cancelled':
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load order"
          description="We encountered an error loading this order. Please try again."
          action={{
            label: 'Back to Orders',
            onClick: () => window.location.href = '/orders',
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </Button>

        {isLoading ? (
          <Skeleton className="h-10 w-64 mb-2" />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-heading-xl font-semibold">
                Order {order?.orderNumber}
              </h1>
              <p className="text-muted">
                Placed on {order && formatDate(order.createdAt)}
              </p>
            </div>
            {order && (
              <Badge variant={getStatusVariant(order.status)} size="lg">
                {order.status}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-16 w-16 rounded-card" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : order && order.lines.length > 0 ? (
                <div className="space-y-4">
                  {order.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-4 p-4 rounded-card border-2 border-border"
                    >
                      <div className="h-16 w-16 bg-muted rounded-card flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-body-md mb-1">
                          {line.productName}
                        </h3>
                        <p className="text-caption text-muted">
                          Quantity: {line.quantity} × {formatCurrency(line.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-heading-sm font-semibold">
                          {formatCurrency(line.totalPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="No items"
                  description="This order has no line items."
                />
              )}
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle>
                <MapPin className="h-5 w-5 inline mr-2" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : order?.shippingAddress ? (
                <address className="not-italic text-body-md">
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zip}
                  </p>
                </address>
              ) : (
                <p className="text-muted">No shipping address provided</p>
              )}
            </CardContent>
          </Card>

          {/* Order notes */}
          {order?.notes && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <FileText className="h-5 w-5 inline mr-2" />
                  Order Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-body-md">{order.notes}</p>
              </CardContent>
            </Card>
          )}
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
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : order ? (
                <>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-body-md">
                      <span className="text-muted">Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-body-md">
                      <span className="text-muted">Tax</span>
                      <span>{formatCurrency(order.tax)}</span>
                    </div>
                    <div className="flex justify-between text-body-md">
                      <span className="text-muted">Shipping</span>
                      <span>{formatCurrency(order.shipping)}</span>
                    </div>
                    <div className="border-t-2 border-border pt-2 flex justify-between text-heading-md font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t-2 border-border">
                    <div>
                      <p className="text-label text-muted mb-1">Order Date</p>
                      <p className="text-body-md font-medium">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    {order.requestedDeliveryDate && (
                      <div>
                        <p className="text-label text-muted mb-1">Requested Delivery</p>
                        <p className="text-body-md font-medium">
                          {formatDate(order.requestedDeliveryDate)}
                        </p>
                      </div>
                    )}

                    {order.actualDeliveryDate && (
                      <div>
                        <p className="text-label text-muted mb-1">Delivered On</p>
                        <p className="text-body-md font-medium">
                          {formatDate(order.actualDeliveryDate)}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-label text-muted mb-1">Items</p>
                      <p className="text-body-md font-medium">
                        {order.lines.reduce((sum, line) => sum + line.quantity, 0)} items
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
