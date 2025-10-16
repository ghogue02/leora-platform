'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, FileText, Download } from 'lucide-react';

/**
 * Invoices Page
 *
 * List and manage invoices
 *
 * Features:
 * - Invoice list with status, date, amount
 * - Download PDF invoices
 * - Payment status tracking
 * - Filter by status, date range
 *
 * Data source:
 * - /api/portal/invoices (TODO: implement)
 * - Invoice model
 */
export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // TODO: Replace with real data fetching using React Query
  const isLoading = false;
  const invoices: any[] = [];

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-heading-xl font-semibold">Invoices</h1>
        <p className="text-muted">
          View and download your invoices.
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Input
            type="search"
            placeholder="Search by invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-input border-2 border-border bg-background px-4 py-2 text-body-md"
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={10} columns={5} />
            </div>
          ) : invoices.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="p-4 text-left text-label font-semibold">Invoice Number</th>
                  <th className="p-4 text-left text-label font-semibold">Date</th>
                  <th className="p-4 text-left text-label font-semibold">Due Date</th>
                  <th className="p-4 text-left text-label font-semibold">Status</th>
                  <th className="p-4 text-left text-label font-semibold">Amount</th>
                  <th className="p-4 text-left text-label font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4 font-medium">{invoice.number}</td>
                    <td className="p-4 text-body-md text-muted">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="p-4 text-body-md text-muted">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-body-md font-medium">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12">
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Your invoices will appear here once orders are processed."
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
