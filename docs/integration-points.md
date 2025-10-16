# Leora Platform - Module Integration Points

**Version**: 1.0
**Date**: October 15, 2025

## Overview

This document details the integration points between all major modules in the Leora Platform, including data flow, dependencies, API contracts, and coordination mechanisms.

---

## Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  React Components + TanStack Query + Session Provider       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Route Layer                            │
│  Next.js App Router Handlers + Middleware                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              Business Logic Services                        │
│  Orders • Products • Insights • Health Engine • AI          │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer                          │
│  Prisma ORM + withTenant + RLS Policies                     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│               Supabase Postgres                             │
│  Multi-Tenant Database with Row-Level Security              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Authentication ↔ API Layer

### 1.1 Direction
**Bidirectional**: Auth endpoints issue tokens, API routes validate them

### 1.2 Integration Mechanism
- **Technology**: JWT tokens in HTTP-only cookies
- **Protocol**: Cookie-based session with automatic passing
- **Format**: JSON Web Tokens (HS256 signature)

### 1.3 Data Flow

```typescript
// 1. User Login
POST /api/portal/auth/login
Request: { email: string, password: string }
Response: { success: true, user: PortalUser }
Side Effect: Sets accessToken and refreshToken cookies

// 2. API Request with Auth
GET /api/portal/orders
Request Headers: Cookie: accessToken=<jwt>
Middleware: getCurrentUser() validates JWT
Returns: { userId, tenantId, roles, permissions }

// 3. Token Refresh
POST /api/portal/auth/refresh
Request Headers: Cookie: refreshToken=<jwt>
Response: New accessToken cookie
Side Effect: Issues new access token, updates cookie
```

### 1.4 Contract

**JWT Payload Structure**:
```typescript
interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number; // 15 minutes from issue
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number; // 7 days from issue
}
```

### 1.5 Dependencies
- API layer depends on `lib/auth/jwt.ts` for token validation
- Auth endpoints depend on `lib/prisma.ts` for user queries
- Session provider depends on `/api/portal/auth/me` endpoint

### 1.6 Error Handling
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: Valid token but insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded

### 1.7 Testing Strategy
```typescript
// Unit test: JWT validation
test('validates correct JWT and returns payload', () => {
  const token = signJWT({ userId: '123', tenantId: 'abc' });
  const payload = verifyJWT(token);
  expect(payload.userId).toBe('123');
});

// Integration test: Protected endpoint
test('returns 401 without token', async () => {
  const response = await fetch('/api/portal/orders');
  expect(response.status).toBe(401);
});
```

---

## 2. Session Provider ↔ Authentication APIs

### 2.1 Direction
**Client → Server**: Session hydration and refresh

### 2.2 Integration Mechanism
- **Technology**: React Context + TanStack Query
- **Protocol**: HTTP requests with automatic cookie passing
- **Storage**: localStorage for client-side caching

### 2.3 Data Flow

```typescript
// 1. Component Mounts
useEffect(() => {
  fetchSession(); // Calls /api/portal/auth/me
}, []);

// 2. Session Fetch
GET /api/portal/auth/me
Response: {
  success: true,
  data: {
    user: PortalUser,
    tenant: Tenant,
    permissions: string[]
  }
}

// 3. Store in Context + localStorage
setSession(data);
localStorage.setItem('portal-session', JSON.stringify(data));

// 4. Auto-Refresh on 401
onError: (error) => {
  if (error.status === 401) {
    await fetch('/api/portal/auth/refresh');
    retry(); // Retry original request
  }
}
```

### 2.4 Contract

**Session Context Shape**:
```typescript
interface PortalSessionContextValue {
  user: PortalUser | null;
  tenant: Tenant | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
```

### 2.5 Dependencies
- Provider depends on `/api/portal/auth/me` and `/api/portal/auth/refresh`
- Components depend on `usePortalSession()` hook
- Auth guard depends on `isAuthenticated` state

### 2.6 Synchronization
- **localStorage sync**: Updates localStorage on session change
- **Tab sync**: BroadcastChannel for cross-tab session updates
- **Server sync**: Polls `/api/portal/auth/me` every 5 minutes

### 2.7 Testing Strategy
```typescript
// Component test: Session provider
test('provides session to children', () => {
  render(
    <PortalSessionProvider>
      <TestComponent />
    </PortalSessionProvider>
  );
  expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
});
```

---

## 3. Business Logic Services ↔ Prisma ORM

### 3.1 Direction
**Service → Database**: Read/write operations

### 3.2 Integration Mechanism
- **Technology**: Prisma Client with custom `withTenant` wrapper
- **Protocol**: Type-safe database queries
- **Session**: `app.current_tenant_id` parameter for RLS

### 3.3 Data Flow

```typescript
// 1. Service Function Call
async function getOrders(tenantId: string, userId: string) {
  // 2. Set Tenant Context
  return withTenant(tenantId, async (prisma) => {
    // 3. Execute Query (RLS auto-applied)
    const orders = await prisma.order.findMany({
      where: { portalUserId: userId },
      include: { orderLines: true }
    });
    return orders;
  });
}

// withTenant Implementation
async function withTenant<T>(
  tenantId: string,
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  await prisma.$executeRaw`
    SELECT set_config('app.current_tenant_id', ${tenantId}, false)
  `;
  return callback(prisma);
}
```

### 3.4 Contract

**Service Function Signature**:
```typescript
// Standard pattern for all service functions
async function serviceFunction(
  tenantId: string,
  context: ServiceContext,
  input: InputType
): Promise<ResultType>

interface ServiceContext {
  userId: string;
  roles: string[];
  permissions: string[];
}
```

### 3.5 Dependencies
- All services depend on `lib/prisma.ts` singleton
- Services must call `withTenant` before any Prisma query
- RLS policies must exist for all queried tables

### 3.6 Transaction Handling
```typescript
// Multi-operation transaction with tenant context
await withTenant(tenantId, async (prisma) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: orderData });
    await tx.inventory.update({
      where: { skuId: order.skuId },
      data: { quantity: { decrement: order.quantity } }
    });
    return order;
  });
});
```

### 3.7 Testing Strategy
```typescript
// Unit test: Tenant isolation
test('withTenant sets session parameter', async () => {
  await withTenant('tenant-123', async (prisma) => {
    const result = await prisma.$queryRaw`
      SELECT current_setting('app.current_tenant_id')
    `;
    expect(result[0].current_setting).toBe('tenant-123');
  });
});
```

---

## 4. AI Copilot ↔ Business Logic Services

### 4.1 Direction
**Bidirectional**: AI queries services for data, services may trigger AI insights

### 4.2 Integration Mechanism
- **Technology**: Direct function calls + structured data exchange
- **Protocol**: TypeScript function invocations
- **Format**: JSON-serializable data structures

### 4.3 Data Flow

```typescript
// 1. Briefing Job Executes
async function generateBriefing(tenantId: string, userId: string) {
  // 2. Query Services for Metrics
  const healthMetrics = await healthEngineService.getHealthScores(tenantId);
  const paceData = await paceDetectionService.getDeviations(tenantId);
  const revenueData = await insightsService.getRevenueTrends(tenantId);

  // 3. Construct AI Prompt
  const prompt = buildBriefingPrompt({
    tenant,
    user,
    metrics: { health: healthMetrics, pace: paceData, revenue: revenueData }
  });

  // 4. Call GPT-5
  const response = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  });

  // 5. Parse and Cache Response
  const briefing = parseBriefingResponse(response.choices[0].message.content);
  await cacheBriefing(tenantId, userId, briefing, { ttl: 86400 }); // 24h

  return briefing;
}
```

### 4.4 Contract

**Service Data Structure**:
```typescript
interface AIServiceInput {
  tenantId: string;
  userId: string;
  timeframe: { start: Date; end: Date };
  filters?: Record<string, any>;
}

interface AIMetricsOutput {
  healthScores: CustomerHealthScore[];
  paceDeviations: PaceDeviation[];
  revenueTrends: RevenueTrend[];
  opportunities: Opportunity[];
}

interface AIBriefingOutput {
  summary: string;
  keyMetrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
  recommendedActions: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[];
  drillDownLinks: { label: string; url: string }[];
  confidence: number; // 0-1
  sourceDatasets: string[]; // Dataset IDs for audit
}
```

### 4.5 Dependencies
- AI layer depends on:
  - `lib/services/health-engine.ts`
  - `lib/services/insights.ts`
  - `lib/services/pace-detection.ts`
  - `lib/services/opportunities.ts`
- Services must return JSON-serializable data (no Dates, use ISO strings)
- AI endpoints require `OPENAI_API_KEY` environment variable

### 4.6 Error Handling
```typescript
// Service errors propagate to AI layer
try {
  const metrics = await healthEngineService.getHealthScores(tenantId);
} catch (error) {
  // AI layer handles gracefully
  logger.error('Health engine unavailable', { error });
  return getFallbackBriefing(tenantId, userId); // Use cached data
}

// GPT-5 errors show fallback UI
try {
  const response = await callGPT5(prompt);
} catch (error) {
  logger.error('GPT-5 unavailable', { error });
  return {
    summary: 'AI briefing temporarily unavailable. Here are your key metrics...',
    keyMetrics: metrics, // Show raw data
    confidence: 0
  };
}
```

### 4.7 Testing Strategy
```typescript
// Integration test: AI briefing generation
test('generates briefing with real service data', async () => {
  const briefing = await generateBriefing('tenant-123', 'user-456');
  expect(briefing.summary).toBeDefined();
  expect(briefing.keyMetrics.length).toBeGreaterThan(0);
  expect(briefing.confidence).toBeGreaterThan(0.7);
});

// Mock test: Service unavailable
test('falls back gracefully when service fails', async () => {
  jest.spyOn(healthEngineService, 'getHealthScores').mockRejectedValue(new Error('Service down'));
  const briefing = await generateBriefing('tenant-123', 'user-456');
  expect(briefing.confidence).toBe(0);
  expect(briefing.summary).toContain('temporarily unavailable');
});
```

---

## 5. UI Components ↔ API Routes

### 5.1 Direction
**Client → Server**: Data fetching and mutations

### 5.2 Integration Mechanism
- **Technology**: TanStack Query (React Query)
- **Protocol**: HTTP REST APIs
- **Format**: JSON request/response bodies

### 5.3 Data Flow

```typescript
// 1. Component Uses Query Hook
function OrderListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
    staleTime: 60000, // Cache for 1 minute
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  return <OrderList orders={data.orders} />;
}

// 2. Query Function
async function fetchOrders(filters: OrderFilters): Promise<OrderListResponse> {
  const params = new URLSearchParams({
    page: filters.page.toString(),
    limit: filters.limit.toString(),
    status: filters.status || '',
  });

  const response = await fetch(`/api/portal/orders?${params}`, {
    credentials: 'include', // Pass cookies automatically
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.statusText}`);
  }

  return response.json();
}

// 3. Mutation Hook
function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: CreateOrderInput) =>
      fetch('/api/portal/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData),
      }).then(res => res.json()),

    onSuccess: () => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

### 5.4 Contract

**API Response Format**:
```typescript
// Success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

### 5.5 Dependencies
- Components depend on API endpoints being available
- API routes must set proper CORS headers if needed
- TypeScript types shared between client/server via `lib/types/`

### 5.6 Caching Strategy
```typescript
// Query configuration
const queryConfig = {
  // Static data (products, settings)
  staleTime: 600000, // 10 minutes
  cacheTime: 900000, // 15 minutes

  // Dynamic data (orders, cart)
  staleTime: 60000,  // 1 minute
  cacheTime: 300000, // 5 minutes

  // Real-time data (inventory)
  staleTime: 5000,   // 5 seconds
  cacheTime: 30000,  // 30 seconds
};

// Background refetch
queryClient.prefetchQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 600000,
});
```

### 5.7 Optimistic Updates
```typescript
// Optimistic cart update
const addToCart = useMutation({
  mutationFn: (item: CartItem) => api.post('/api/portal/cart/items', item),

  onMutate: async (newItem) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['cart'] });

    // Snapshot current value
    const previousCart = queryClient.getQueryData(['cart']);

    // Optimistically update
    queryClient.setQueryData(['cart'], (old: Cart) => ({
      ...old,
      items: [...old.items, newItem],
    }));

    return { previousCart };
  },

  onError: (err, newItem, context) => {
    // Rollback on error
    queryClient.setQueryData(['cart'], context.previousCart);
  },

  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  },
});
```

### 5.8 Testing Strategy
```typescript
// Component test with mocked API
test('renders orders list', async () => {
  const mockOrders = [{ id: '1', status: 'pending' }];

  server.use(
    rest.get('/api/portal/orders', (req, res, ctx) => {
      return res(ctx.json({ success: true, data: { orders: mockOrders } }));
    })
  );

  render(<OrderListPage />);

  await waitFor(() => {
    expect(screen.getByText('Order #1')).toBeInTheDocument();
  });
});
```

---

## 6. Background Jobs ↔ Database

### 6.1 Direction
**Job → Database**: Read and write operations

### 6.2 Integration Mechanism
- **Technology**: Direct Prisma queries with `withTenant`
- **Protocol**: Scheduled execution (cron)
- **Concurrency**: Single instance per job type

### 6.3 Data Flow

```typescript
// 1. Job Entry Point
export async function webhookDeliveryWorker() {
  // 2. Query Pending Deliveries
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: 'pending',
      nextRetryAt: { lte: new Date() },
    },
    include: {
      event: true,
      subscription: true,
    },
    take: 100, // Process in batches
  });

  // 3. Process Each Delivery
  for (const delivery of pendingDeliveries) {
    await withTenant(delivery.event.tenantId, async (prisma) => {
      try {
        // Attempt delivery
        const response = await fetch(delivery.subscription.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(delivery.event.payload),
        });

        // Update delivery record
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: response.ok ? 'delivered' : 'failed',
            responseStatus: response.status,
            lastAttemptAt: new Date(),
            attemptCount: { increment: 1 },
          },
        });
      } catch (error) {
        // Schedule retry with exponential backoff
        await scheduleRetry(prisma, delivery);
      }
    });
  }
}

// 4. Schedule Job (Vercel Cron)
// vercel.json
{
  "crons": [{
    "path": "/api/cron/webhook-delivery",
    "schedule": "*/5 * * * *" // Every 5 minutes
  }]
}
```

### 6.4 Contract

**Job Result Structure**:
```typescript
interface JobResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: { recordId: string; error: string }[];
}
```

### 6.5 Dependencies
- Jobs depend on Prisma schema and connection pool
- Scheduler depends on job entry points (`/api/cron/*`)
- Jobs must handle errors gracefully (retry logic)
- Jobs should be idempotent (safe to run multiple times)

### 6.6 Error Handling & Retries
```typescript
// Exponential backoff retry schedule
async function scheduleRetry(prisma: PrismaClient, delivery: WebhookDelivery) {
  const maxAttempts = 5;
  const baseDelay = 60000; // 1 minute

  if (delivery.attemptCount >= maxAttempts) {
    // Mark as permanently failed
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: 'failed_permanent' },
    });
    return;
  }

  // Calculate next retry time: 1min, 2min, 4min, 8min, 16min
  const nextRetryDelay = baseDelay * Math.pow(2, delivery.attemptCount);
  const nextRetryAt = new Date(Date.now() + nextRetryDelay);

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      status: 'pending',
      nextRetryAt,
      lastError: delivery.lastError,
    },
  });
}
```

### 6.7 Monitoring & Alerting
```typescript
// Job execution logging
async function runJob(jobFn: () => Promise<JobResult>) {
  const startTime = new Date();

  try {
    const result = await jobFn();

    // Log success
    await prisma.jobExecution.create({
      data: {
        jobName: result.jobName,
        startTime,
        endTime: result.endTime,
        status: 'success',
        recordsProcessed: result.recordsProcessed,
        metadata: result,
      },
    });

    return result;
  } catch (error) {
    // Log failure
    await prisma.jobExecution.create({
      data: {
        jobName: 'unknown',
        startTime,
        endTime: new Date(),
        status: 'failed',
        errorMessage: error.message,
      },
    });

    // Alert on critical failures
    if (isCriticalJob(jobName)) {
      await sendAlert({
        level: 'error',
        message: `Critical job failed: ${jobName}`,
        error,
      });
    }

    throw error;
  }
}
```

### 6.8 Testing Strategy
```typescript
// Unit test: Job logic
test('processes pending deliveries', async () => {
  // Seed test data
  await prisma.webhookDelivery.create({
    data: { status: 'pending', /* ... */ },
  });

  // Run job
  const result = await webhookDeliveryWorker();

  // Verify results
  expect(result.recordsProcessed).toBe(1);

  // Verify database state
  const delivery = await prisma.webhookDelivery.findFirst();
  expect(delivery.status).toBe('delivered');
});
```

---

## 7. Webhook System ↔ External APIs

### 7.1 Direction
**Bidirectional**: Outbound webhooks to subscribers, inbound webhooks from providers

### 7.2 Integration Mechanism
- **Technology**: HTTP POST requests + database queue
- **Protocol**: REST webhooks with retry logic
- **Security**: HMAC signatures for verification

### 7.3 Outbound Webhook Flow

```typescript
// 1. Platform Event Occurs (e.g., order created)
async function createOrder(data: CreateOrderInput) {
  const order = await prisma.order.create({ data });

  // 2. Emit Webhook Event
  await emitWebhookEvent({
    tenantId: order.tenantId,
    eventType: 'order.created',
    payload: order,
  });

  return order;
}

// 3. Create Webhook Deliveries
async function emitWebhookEvent(event: WebhookEventInput) {
  // Create event record
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      tenantId: event.tenantId,
      eventType: event.eventType,
      payload: event.payload,
    },
  });

  // Find active subscriptions for this event type
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      tenantId: event.tenantId,
      eventType: event.eventType,
      active: true,
    },
  });

  // Create delivery records
  await prisma.webhookDelivery.createMany({
    data: subscriptions.map(sub => ({
      webhookEventId: webhookEvent.id,
      subscriptionId: sub.id,
      status: 'pending',
      nextRetryAt: new Date(),
    })),
  });
}

// 4. Background Worker Delivers (see Section 6)
```

### 7.4 Inbound Webhook Flow

```typescript
// 1. Receive Webhook from Provider
POST /api/webhooks/stripe
Headers:
  stripe-signature: t=1234567890,v1=abc123...

// 2. Verify Signature
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  const event = verifyWebhookSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  if (!event) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 3. Process Event
  await processStripeWebhook(event);

  return new Response('OK', { status: 200 });
}

// 4. Update Platform Data
async function processStripeWebhook(event: StripeEvent) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    // ... other event types
  }
}
```

### 7.5 Contract

**Outbound Webhook Payload**:
```typescript
interface WebhookPayload {
  id: string;
  eventType: string; // e.g., "order.created"
  timestamp: string; // ISO 8601
  tenantId: string;
  data: Record<string, any>; // Event-specific data
  signature: string; // HMAC-SHA256 signature
}
```

**Inbound Webhook Response**:
```typescript
// Success
HTTP 200 OK
Body: { "received": true }

// Validation error
HTTP 400 Bad Request
Body: { "error": "Invalid payload" }

// Signature error
HTTP 401 Unauthorized
Body: { "error": "Invalid signature" }
```

### 7.6 Dependencies
- Outbound: Depends on `WebhookSubscription` and `IntegrationToken` tables
- Inbound: Depends on provider-specific signature verification
- Background worker must be running for delivery

### 7.7 Security - HMAC Signatures

```typescript
// Generate signature for outbound webhook
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Verify signature for inbound webhook
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Include in webhook headers
headers: {
  'X-Webhook-Signature': signature,
  'X-Webhook-Timestamp': timestamp,
  'Content-Type': 'application/json',
}
```

### 7.8 Testing Strategy
```typescript
// Test outbound webhook delivery
test('creates deliveries for active subscriptions', async () => {
  // Create subscription
  await prisma.webhookSubscription.create({
    data: {
      tenantId: 'tenant-123',
      eventType: 'order.created',
      url: 'https://example.com/webhook',
      active: true,
    },
  });

  // Emit event
  await emitWebhookEvent({
    tenantId: 'tenant-123',
    eventType: 'order.created',
    payload: { orderId: '123' },
  });

  // Verify delivery created
  const delivery = await prisma.webhookDelivery.findFirst();
  expect(delivery.status).toBe('pending');
});

// Test inbound webhook validation
test('rejects invalid signature', async () => {
  const response = await POST(
    new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid' },
      body: JSON.stringify({ type: 'test' }),
    })
  );

  expect(response.status).toBe(401);
});
```

---

## Integration Testing Strategy

### End-to-End Flow Tests

```typescript
// Test full order creation flow
test('complete order creation flow', async () => {
  // 1. Login
  const session = await login('test@example.com', 'password');

  // 2. Add to cart
  await addToCart(session, { productId: 'prod-123', quantity: 2 });

  // 3. Checkout
  const order = await checkout(session);
  expect(order.status).toBe('pending');

  // 4. Verify inventory decreased
  const inventory = await getInventory('prod-123');
  expect(inventory.quantity).toBe(originalQuantity - 2);

  // 5. Verify webhook event created
  const webhookEvent = await prisma.webhookEvent.findFirst({
    where: { eventType: 'order.created' },
  });
  expect(webhookEvent).toBeDefined();

  // 6. Verify AI briefing updated
  const briefing = await generateBriefing(tenantId, userId);
  expect(briefing.keyMetrics.some(m => m.label === 'Recent Orders')).toBe(true);
});
```

---

## Monitoring Integration Points

### Health Checks

```typescript
// System health endpoint
GET /api/health

Response: {
  status: "healthy",
  checks: {
    database: { status: "up", responseTime: 45 },
    openai: { status: "up", responseTime: 1200 },
    supabase: { status: "up", responseTime: 30 },
    webhooks: { status: "degraded", queueDepth: 150 }
  },
  timestamp: "2025-10-15T12:00:00Z"
}
```

### Integration Metrics

```typescript
// Track integration performance
interface IntegrationMetrics {
  component: string;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

// Example: Track Prisma query performance
async function withMetrics<T>(
  component: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logMetric({
      component,
      operation,
      duration: Date.now() - start,
      success: true,
      timestamp: new Date(),
    });
    return result;
  } catch (error) {
    logMetric({
      component,
      operation,
      duration: Date.now() - start,
      success: false,
      timestamp: new Date(),
    });
    throw error;
  }
}
```

---

## Conclusion

This document provides comprehensive integration specifications for all major module interactions in the Leora Platform. Each integration point includes:

- ✅ Data flow diagrams
- ✅ Contract definitions (TypeScript interfaces)
- ✅ Dependency mappings
- ✅ Error handling strategies
- ✅ Testing approaches

Use this as a reference during implementation to ensure consistent integration patterns across the codebase.

---

**Document Status**: ✅ Complete
**Owner**: Architecture Team
**Last Updated**: October 15, 2025
