'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrders } from '@/lib/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState, EmptySearchState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, FileText, AlertCircle, Eye } from 'lucide-react';

/**
 * Orders List Page
 *
 * Displays all orders for the current portal user's account
 *
 * Features:
 * - Order list with status, date, total
 * - Filter by status, date range
 * - Search by order number
 * - Link to order details
 *
 * Data source:
 * - /api/portal/orders (live Prisma queries)
 * - Tenant-scoped via withPortalUserFromRequest
 */
export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useOrders({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

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
          title="Failed to load orders"
          description="We encountered an error loading your orders. Please try again."
        />
      </div>
    );
  }

  const filteredOrders = data?.orders.filter((order) =>
    searchQuery
      ? order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-heading-xl font-semibold">Orders</h1>
        <p className="text-muted">
          View and track your order history.
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Input
            type="search"
            placeholder="Search by order number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-input border-2 border-border bg-background px-4 py-2 text-body-md"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={10} columns={5} />
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="p-4 text-left text-label font-semibold">Order Number</th>
                  <th className="p-4 text-left text-label font-semibold">Date</th>
                  <th className="p-4 text-left text-label font-semibold">Customer</th>
                  <th className="p-4 text-left text-label font-semibold">Status</th>
                  <th className="p-4 text-left text-label font-semibold">Total</th>
                  <th className="p-4 text-left text-label font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-body-md text-muted">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="p-4 text-body-md">
                      {order.customerName}
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-body-md font-medium">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : searchQuery ? (
            <div className="p-12">
              <EmptySearchState query={searchQuery} />
            </div>
          ) : (
            <div className="p-12">
              <EmptyState
                icon={FileText}
                title="No orders yet"
                description="Your order history will appear here once you place your first order."
              />
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="border-t-2 border-border p-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-body-sm text-muted">
              Page {page} of {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
