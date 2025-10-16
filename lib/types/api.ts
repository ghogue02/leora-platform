/**
 * TypeScript Type Definitions for API Responses
 * Provides type safety for all API endpoints
 */

// Base API Response Types
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  supplier: string;
  price: number;
  inStock: boolean;
  inventory: number;
  imageUrl: string | null;
}

export interface ProductListResponse {
  products: Product[];
  pagination: PaginationMeta;
}

// Order Types
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  deliveryDate: string | null;
}

export interface OrderDetail extends Order {
  subtotal: number;
  tax: number;
  shipping: number;
  lines: OrderLine[];
  shippingAddress: Address;
  notes: string | null;
  updatedAt: string;
  requestedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: PaginationMeta;
}

// Cart Types
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  inStock: boolean;
  imageUrl: string | null;
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

// Address Types
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

// Insights Types
export interface InsightsSummary {
  totalRevenue: number;
  revenueChange: number;
  activeAccounts: number;
  atRiskAccounts: number;
  ordersThisMonth: number;
  ordersChange: number;
}

export interface HealthMetrics {
  healthy: number;
  atRisk: number;
  critical: number;
  needsAttention: number;
}

export interface PaceMetrics {
  onPace: number;
  slipping: number;
  overdue: number;
}

export interface SampleMetrics {
  used: number;
  allowance: number;
  pending: number;
  conversionRate: number;
}

export interface Opportunity {
  productId: string;
  productName: string;
  potentialRevenue: number;
  customerPenetration: number;
  category: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  accountId: string;
  accountName: string;
  message: string;
  createdAt: string;
}

export interface Insights {
  summary: InsightsSummary;
  health: HealthMetrics;
  pace: PaceMetrics;
  samples: SampleMetrics;
  opportunities: Opportunity[];
  alerts: Alert[];
}

// Report Types
export type ReportType = 'sales' | 'inventory' | 'customer' | 'product';
export type ReportGrouping = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ReportFormat = 'json' | 'csv' | 'pdf';

export interface ReportDataPoint {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: TopProduct[];
}

export interface Report {
  type: ReportType;
  period: {
    startDate: string;
    endDate: string;
  };
  groupBy: ReportGrouping;
  data: ReportDataPoint[];
  summary: ReportSummary;
  generatedAt: string;
}

// Favorites Types
export interface Favorite {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
  };
  addedAt: string;
}

export interface FavoritesResponse {
  favorites: Favorite[];
  total: number;
}

// List Types
export interface ProductList {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListsResponse {
  lists: ProductList[];
  total: number;
}

// Notification Types
export type NotificationType = 'order_update' | 'product_alert' | 'system' | 'promotion';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: PaginationMeta;
  unreadCount: number;
}

// Template Types
export interface TemplateItem {
  productId: string;
  productName: string;
  skuId: string;
  quantity: number;
}

export interface OrderTemplate {
  id: string;
  name: string;
  description: string | null;
  items: TemplateItem[];
  totalItems: number;
  estimatedTotal: number;
  isPublic: boolean;
  createdAt: string;
}

export interface TemplatesResponse {
  templates: OrderTemplate[];
  total: number;
}

// Request Body Types
export interface CreateOrderRequest {
  customerId: string;
  lines: {
    productId: string;
    skuId: string;
    quantity: number;
    unitPrice: number;
  }[];
  notes?: string;
  requestedDeliveryDate?: string;
}

export interface AddToCartRequest {
  productId: string;
  skuId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CheckoutRequest {
  paymentMethodId?: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  notes?: string;
  requestedDeliveryDate?: string;
}

export interface CheckoutResponse {
  order: OrderDetail;
  message: string;
}

export interface AddFavoriteRequest {
  productId: string;
}

export interface CreateListRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
  read?: boolean;
}

// Filter Types
export interface ProductFilter extends PaginationParams {
  search?: string;
  category?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderFilter extends PaginationParams {
  status?: OrderStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationFilter extends PaginationParams {
  read?: boolean;
  type?: string;
}

export interface InsightFilter {
  type?: 'health' | 'pace' | 'revenue' | 'samples' | 'opportunities';
  startDate?: string;
  endDate?: string;
}

export interface ReportFilter {
  reportType: ReportType;
  startDate?: string;
  endDate?: string;
  groupBy?: ReportGrouping;
  format?: ReportFormat;
}

// User & Auth Types
export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  customerId?: string;
  companyId?: string;
}

export interface AuthContext {
  user: PortalUser;
  tenantId: string;
}

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
}
