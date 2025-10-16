/**
 * Zod Validation Schemas for Portal APIs
 */

import { z } from 'zod';

export const idSchema = z.union([z.string().cuid(), z.string().uuid()]);

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
const ORDER_STATUS_VALUES = ['DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'ON_HOLD'] as const;

export const orderFilterSchema = z.object({
  status: z
    .enum(ORDER_STATUS_VALUES)
    .or(z.enum(ORDER_STATUS_VALUES.map((s) => s.toLowerCase()) as [string, ...string[]]))
    .optional(),
  customerId: idSchema.optional(),
  ...dateRangeSchema.shape,
  ...paginationSchema.shape,
  ...sortSchema.shape,
});

export const createOrderSchema = z.object({
  customerId: idSchema,
  lines: z.array(
    z.object({
      productId: idSchema,
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0).optional(),
      notes: z.string().max(500).optional(),
    })
  ).min(1),
  notes: z.string().optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
});

export const updateOrderSchema = z.object({
  status: z
    .enum(ORDER_STATUS_VALUES)
    .or(z.enum(ORDER_STATUS_VALUES.map((s) => s.toLowerCase()) as [string, ...string[]]))
    .optional(),
  notes: z.string().max(2000).optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
  actualDeliveryDate: z.string().datetime().optional(),
});

// Invoice schemas
const INVOICE_STATUS_VALUES = ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'] as const;

export const invoiceFilterSchema = z.object({
  status: z
    .enum(INVOICE_STATUS_VALUES)
    .or(z.enum(INVOICE_STATUS_VALUES.map((s) => s.toLowerCase()) as [string, ...string[]]))
    .optional(),
  ...dateRangeSchema.shape,
  ...paginationSchema.shape,
  ...sortSchema.shape,
});

// Account schemas
export const accountUpdateSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  companyName: z.string().max(200).optional(),
});

// Cart schemas
export const addToCartSchema = z.object({
  productId: idSchema,
  skuId: idSchema.optional(),
  quantity: z.number().int().min(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const checkoutSchema = z.object({
  paymentMethodId: z.string().optional(),
  shippingAddressId: idSchema.optional(),
  billingAddressId: idSchema.optional(),
  notes: z.string().optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
});

// Favorites schemas
export const addFavoriteSchema = z.object({
  productId: idSchema,
});

// List schemas
export const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const addToListSchema = z.object({
  listId: idSchema,
  productId: idSchema,
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
  notificationId: idSchema,
  read: z.boolean().default(true),
});
