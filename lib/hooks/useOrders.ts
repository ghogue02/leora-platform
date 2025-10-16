/**
 * useOrders Hook
 *
 * React Query hooks for order management
 */

import { useQuery } from '@tanstack/react-query';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  deliveryDate: string | null;
}

export interface OrderDetail extends Order {
  subtotal: number;
  tax: number;
  shipping: number;
  lines: Array<{
    id: string;
    productId: string;
    productName: string;
    skuId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  notes: string | null;
  updatedAt: string;
  requestedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
}

export interface OrdersData {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseOrdersOptions {
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useOrders(options: UseOrdersOptions = {}) {
  return useQuery<OrdersData>({
    queryKey: ['orders', options],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/portal/orders?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useOrder(orderId: string) {
  return useQuery<OrderDetail>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/portal/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
