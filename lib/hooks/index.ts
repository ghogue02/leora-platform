/**
 * Central export for all React Query hooks
 * Import from '@/lib/hooks' for convenience
 */

// Product hooks
export {
  useProducts,
  // useProduct, // TODO: Implement individual product query hook
  // useProductSearch, // TODO: Implement product search hook
  // productKeys, // TODO: Implement query keys
} from './useProducts';

// Order hooks
export {
  useOrders,
  useOrder,
  // useCreateOrder, // TODO: Implement
  // useCancelOrder, // TODO: Implement
  // useRecentOrders, // TODO: Implement
  // orderKeys, // TODO: Implement
} from './useOrders';

// Cart hooks
export {
  useCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveFromCart,
  useClearCart,
  // useCheckout, // TODO: Implement
  // useCartItemCount, // TODO: Implement
  // useCartTotal, // TODO: Implement
  // cartKeys, // TODO: Implement
} from './useCart';

// Insights hooks
export {
  useInsights,
  // useInsightsSummary, // TODO: Implement
  // useHealthMetrics, // TODO: Implement
  // usePaceTracking, // TODO: Implement
  // useSampleMetrics, // TODO: Implement
  // useRevenueHealth, // TODO: Implement
  // useOpportunities, // TODO: Implement
  // useAlerts, // TODO: Implement
  // useCriticalAlerts, // TODO: Implement
  // useInsightsDashboard, // TODO: Implement
  // insightKeys, // TODO: Implement
} from './useInsights';
