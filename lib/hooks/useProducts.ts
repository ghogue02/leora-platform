/**
 * useProducts Hook
 *
 * React Query hook for fetching product catalog with filtering
 */

import { useQuery } from '@tanstack/react-query';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  supplier: string;
  price: number;
  inStock: boolean;
  inventory: number;
  imageUrl: string | null;
}

export interface ProductsData {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseProductsOptions {
  search?: string;
  category?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useProducts(options: UseProductsOptions = {}) {
  return useQuery<ProductsData>({
    queryKey: ['products', options],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/portal/products?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
