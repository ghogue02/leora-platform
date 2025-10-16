/**
 * useCart Hook
 *
 * React Query hooks for cart management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string | null;
  notes?: string | null;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  itemCount: number;
  updatedAt: string;
}

export function useCart() {
  return useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await fetch('/api/portal/cart');
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      const data = await response.json();
      return data.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: { productId: string; quantity: number }) => {
      const response = await fetch('/api/portal/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error('Failed to add item to cart');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const response = await fetch(`/api/portal/cart/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cart item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/portal/cart/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove item from cart');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/portal/cart', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
