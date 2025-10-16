/**
 * Zod Validation Schemas for Portal APIs
 */

import { z } from 'zod';

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Product schemas
export const productFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.coerce.boolean().optional(),
  ...paginationSchema.shape,
  ...sortSchema.shape,
});

// Order schemas
export const orderFilterSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  customerId: z.string().uuid().optional(),
  ...dateRangeSchema.shape,
  ...paginationSchema.shape,
  ...sortSchema.shape,
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  lines: z.array(
    z.object({
      productId: z.string().uuid(),
      skuId: z.string().uuid(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1),
  notes: z.string().optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
});

// Cart schemas
export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  skuId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const checkoutSchema = z.object({
  paymentMethodId: z.string().optional(),
  shippingAddressId: z.string().uuid().optional(),
  billingAddressId: z.string().uuid().optional(),
  notes: z.string().optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
});

// Favorites schemas
export const addFavoriteSchema = z.object({
  productId: z.string().uuid(),
});

// List schemas
export const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const addToListSchema = z.object({
  listId: z.string().uuid(),
  productId: z.string().uuid(),
});

// Report schemas
export const reportFilterSchema = z.object({
  reportType: z.enum(['sales', 'inventory', 'customer', 'product']),
  ...dateRangeSchema.shape,
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
});

// Insights schemas
export const insightFilterSchema = z.object({
  type: z.enum(['health', 'pace', 'revenue', 'samples', 'opportunities']).optional(),
  ...dateRangeSchema.shape,
});

// Notification schemas
export const notificationFilterSchema = z.object({
  read: z.coerce.boolean().optional(),
  type: z.string().optional(),
  ...paginationSchema.shape,
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
  read: z.boolean().default(true),
});
