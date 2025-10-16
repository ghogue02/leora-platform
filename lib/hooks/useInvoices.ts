/**
 * useInvoices Hook
 *
 * React Query hooks for invoice management
 */

import { useQuery } from '@tanstack/react-query';

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  paidDate: string | null;
}

export interface InvoiceDetail extends InvoiceSummary {
  notes: string | null;
  orderId: string | null;
  lines: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    totalAmount: number;
  }>;
  payments: Array<{
    id: string;
    paymentDate: string;
    amount: number;
    paymentMethod: string;
    status: string;
    referenceNumber: string | null;
  }>;
}

export interface InvoicesData {
  invoices: InvoiceSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalInvoiced: number;
    totalOutstanding: number;
  };
}

export interface UseInvoicesOptions {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  return useQuery<InvoicesData>({
    queryKey: ['invoices', options],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/portal/invoices?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      return data.data as InvoicesData;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useInvoice(invoiceId: string | null) {
  return useQuery<InvoiceDetail>({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        throw new Error('Invoice ID is required');
      }

      const response = await fetch(`/api/portal/invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice details');
      }

      const data = await response.json();
      return data.data as InvoiceDetail;
    },
    enabled: !!invoiceId,
    staleTime: 2 * 60 * 1000,
  });
}
