# Leora Business Intelligence System

Comprehensive documentation for the automated intelligence features that power the Leora platform.

## Overview

The Business Intelligence system implements Blueprint Section 1.2 (Problem Context) requirements, delivering "clarity you can act on" through automated tracking, scoring, and alerting.

## Core Components

### 1. Pace Tracker (`/lib/intelligence/pace-tracker.ts`)

**Purpose**: Automatically calculates ordering cadence (ARPDD) and flags accounts slipping their normal cycle.

**Algorithm**:
1. Gather recent fulfilled orders (default 180-day lookback)
2. Calculate intervals between consecutive order dates
3. Compute Average Recent Purchase Day Distance (ARPDD)
4. Flag accounts when days since last order exceeds threshold

**Key Functions**:
- `calculateAccountPace()` - Single account analysis
- `calculateTenantPace()` - All accounts analysis
- `getTenantPaceConfig()` - Retrieve configuration
- `updateTenantPaceConfig()` - Modify thresholds

**Configuration** (tenant-level):
```typescript
{
  minimumOrdersRequired: 3,      // Need 3+ orders to establish pace
  lookbackDays: 180,              // 6-month window
  warningThresholdMultiplier: 1.2, // Warn at 120% of ARPDD
  criticalThresholdMultiplier: 1.5 // Critical at 150% of ARPDD
}
```

**Risk Levels**:
- `on-track` - Within normal cadence
- `warning` - 120-150% past expected order date
- `critical` - >150% past expected order date
- `insufficient-data` - Less than 3 orders

### 2. Health Scorer (`/lib/intelligence/health-scorer.ts`)

**Purpose**: Tracks revenue trends and flags accounts with significant drops (≥15% below baseline).

**Algorithm**:
1. Collect fulfilled orders from past N months (default 6)
2. Calculate monthly revenue totals
3. Compute baseline average (excluding current partial month)
4. Compare current month to baseline
5. Flag drops meeting threshold

**Key Functions**:
- `calculateAccountHealth()` - Single account scoring
- `calculateTenantHealth()` - All accounts scoring
- `saveHealthSnapshot()` - Persist snapshot for trending
- `getTenantHealthConfig()` - Retrieve configuration

**Configuration** (tenant-level):
```typescript
{
  minimumMonthsRequired: 3,        // Need 3+ months for baseline
  lookbackMonths: 6,               // 6-month analysis window
  warningThresholdPercent: -10,   // Warn at 10% drop
  criticalThresholdPercent: -15,  // Critical at 15% drop
  excludeCurrentMonth: true        // Don't include partial month in baseline
}
```

**Health Scores**:
- `healthy` - Revenue on track or growing
- `warning` - 10-15% below baseline
- `critical` - ≥15% below baseline
- `insufficient-data` - Less than 3 months history

### 3. Sample Manager (`/lib/intelligence/sample-manager.ts`)

**Purpose**: Tracks sample inventory, enforces monthly allowances, and captures tasting feedback.

**Algorithm**:
1. Log sample transfers as inventory movements (not $0 orders)
2. Track monthly pulls per rep against allowance (default 60)
3. Require manager approval when exceeding allowance
4. Capture tasting feedback via follow-up activities
5. Flag samples needing feedback after N days

**Key Functions**:
- `recordSampleTransfer()` - Log sample pull
- `getRepSampleAllowance()` - Check rep's monthly status
- `recordTastingFeedback()` - Log follow-up results
- `getPendingFeedback()` - Find samples needing feedback
- `getTenantSampleConfig()` - Retrieve configuration

**Configuration** (tenant-level):
```typescript
{
  defaultMonthlyAllowance: 60,     // Pulls per rep per month
  requireManagerApprovalOver: 60,  // Threshold for approval
  trackTastingFeedback: true,      // Enable feedback tracking
  minimumFeedbackDays: 14          // Expect feedback within 2 weeks
}
```

**Sample Transfer Flow**:
1. Rep initiates transfer via API
2. System checks monthly allowance
3. If over limit, requires `approvedByManagerId`
4. Creates `InventoryMovement` record (negative quantity)
5. Creates `SampleTransfer` record
6. Tracks pending feedback
7. Links feedback to follow-up `Activity`

### 4. Opportunity Detector (`/lib/intelligence/opportunity-detector.ts`)

**Purpose**: Identifies "Top 20" products customers haven't purchased, ranked by revenue/volume/penetration.

**Algorithm**:
1. Identify all products in catalog
2. Exclude products customer has purchased (6-month window)
3. Calculate metrics across ALL customers:
   - Revenue: Total dollars (6mo)
   - Volume: Total units sold (6mo)
   - Penetration: % of customers purchasing (6mo)
4. Rank unpurchased products by selected metric
5. Return top N opportunities

**Key Functions**:
- `detectCustomerOpportunities()` - Single customer analysis
- `detectTenantOpportunities()` - All customers analysis
- `getOpportunitySummary()` - Aggregate counts by category/supplier
- `getTenantOpportunityConfig()` - Retrieve configuration

**Configuration** (tenant-level):
```typescript
{
  lookbackDays: 180,                // 6-month rolling window
  topN: 20,                         // Return top 20 opportunities
  excludeDiscontinued: true,        // Skip inactive products
  excludeLowInventory: false,       // Include low-stock items
  minimumCustomerThreshold: 3       // Need 3+ customers purchasing
}
```

**Ranking Modes**:
- `revenue` - Total revenue across all customers
- `volume` - Total units sold across all customers
- `penetration` - % of active customers purchasing

## Unified Services

### Metrics Service (`/lib/services/metrics-service.ts`)

Orchestrates all intelligence engines for dashboard and API consumption.

**Key Functions**:

1. **`calculateDashboardMetrics()`** - Complete dashboard snapshot
   - Returns pace, health, samples, opportunities
   - Filtered by sales rep if specified
   - Includes alert counts and top issues

2. **`calculateAccountInsights()`** - Single account deep-dive
   - Combines pace, health, opportunities
   - Includes opportunity summary by category/supplier

3. **`scheduleHealthSnapshots()`** - Background job
   - Calculates health for all accounts
   - Persists `AccountHealthSnapshot` records
   - Enables trending over time

4. **`getActionableAlerts()`** - Prioritized action list
   - Critical alerts (pace critical, health critical)
   - Warning alerts (pace warning, sample allowance)
   - Action items (follow-ups, feedback needed)

### Dashboard Queries (`/lib/queries/dashboard-queries.ts`)

Pre-built Prisma queries optimized for dashboard performance.

**Available Queries**:
- `getAccountsNeedingAttention()` - Combined pace + health risks
- `getAccountRevenueTrends()` - Monthly revenue for 12 months
- `getTopProductsByRevenue()` - Top products by dollar sales
- `getProductPenetration()` - Products by customer adoption rate
- `getSampleUtilization()` - Rep sample usage statistics
- `getAccountActivitySummary()` - Recent activity by type
- `getCallPlanCoverage()` - Upcoming call plan status

## API Integration

### Example: Dashboard Endpoint

```typescript
// app/api/sales/dashboard/route.ts
import { prisma } from '@/lib/prisma';
import { calculateDashboardMetrics } from '@/lib/services/metrics-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = request.headers.get('x-tenant-id');
  const salesRepId = searchParams.get('repId');

  const metrics = await calculateDashboardMetrics(prisma, tenantId, {
    includeAllAccounts: false, // Only at-risk accounts
    salesRepId: salesRepId || undefined,
  });

  return Response.json({
    success: true,
    data: metrics,
  });
}
```

### Example: Account Insights Endpoint

```typescript
// app/api/accounts/[id]/insights/route.ts
import { prisma } from '@/lib/prisma';
import { calculateAccountInsights } from '@/lib/services/metrics-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tenantId = request.headers.get('x-tenant-id');

  const insights = await calculateAccountInsights(
    prisma,
    params.id,
    tenantId
  );

  return Response.json({
    success: true,
    data: insights,
  });
}
```

## Background Jobs

### Health Snapshot Job (Daily)

```typescript
// app/workers/health-snapshots.ts
import { prisma } from '@/lib/prisma';
import { scheduleHealthSnapshots } from '@/lib/services/metrics-service';

export async function runHealthSnapshotJob() {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const tenant of tenants) {
    await scheduleHealthSnapshots(prisma, tenant.id);
  }
}
```

Schedule via Supabase cron, Vercel cron, or external worker:
```sql
-- Supabase pg_cron example
SELECT cron.schedule(
  'health-snapshots-daily',
  '0 6 * * *', -- 6 AM daily
  $$
  SELECT net.http_post(
    url:='https://api.leora.app/workers/health-snapshots',
    headers:='{"Content-Type": "application/json"}'
  );
  $$
);
```

## Configuration Management

All intelligence thresholds are tenant-configurable via `TenantSettings.{module}Config` JSON fields.

### Example: Update Pace Config

```typescript
import { updateTenantPaceConfig } from '@/lib/intelligence/pace-tracker';

await updateTenantPaceConfig(prisma, tenantId, {
  warningThresholdMultiplier: 1.3,
  criticalThresholdMultiplier: 1.6,
});
```

### Example: Update Health Config

```typescript
import { updateTenantHealthConfig } from '@/lib/intelligence/health-scorer';

await updateTenantHealthConfig(prisma, tenantId, {
  criticalThresholdPercent: -20, // Flag at 20% drop instead of 15%
});
```

## Database Schema

### New Tables Required

```prisma
model SampleTransfer {
  id                   String    @id @default(cuid())
  tenantId             String
  salesRepId           String
  customerId           String
  productId            String
  skuId                String
  quantity             Int
  transferDate         DateTime
  purposeNotes         String?
  followUpActivityId   String?   @unique
  approvedByManagerId  String?
  inventoryMovementId  String    @unique
  metadata             Json?
  createdAt            DateTime  @default(now())

  tenant              Tenant             @relation(fields: [tenantId], references: [id])
  salesRep            User               @relation(fields: [salesRepId], references: [id])
  customer            Customer           @relation(fields: [customerId], references: [id])
  product             Product            @relation(fields: [productId], references: [id])
  sku                 Sku                @relation(fields: [skuId], references: [id])
  followUpActivity    Activity?          @relation(fields: [followUpActivityId], references: [id])
  approvedByManager   User?              @relation(fields: [approvedByManagerId], references: [id])
  inventoryMovement   InventoryMovement  @relation(fields: [inventoryMovementId], references: [id])

  @@index([tenantId, salesRepId, transferDate])
  @@index([tenantId, customerId])
}

model InventoryMovement {
  id            String   @id @default(cuid())
  tenantId      String
  skuId         String
  movementType  String   // 'sample_transfer', 'sale', 'adjustment', 'return'
  quantity      Int      // Negative for outbound
  movementDate  DateTime
  notes         String?
  metadata      Json?
  createdAt     DateTime @default(now())

  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  sku           Sku      @relation(fields: [skuId], references: [id])

  @@index([tenantId, skuId, movementDate])
}
```

### Updated Tables

```prisma
model TenantSettings {
  // ... existing fields ...
  paceTrackingConfig          Json?
  healthScoringConfig         Json?
  sampleManagementConfig      Json?
  opportunityDetectionConfig  Json?
}

model AccountHealthSnapshot {
  // ... existing fields ...
  // Ensure these exist:
  snapshotDate      DateTime
  healthScore       String    // 'healthy', 'warning', 'critical'
  revenueThisMonth  Float
  revenueBaseline   Float
  percentageChange  Float
  metadata          Json?
}
```

## Performance Considerations

1. **Caching**: Dashboard metrics should be cached (Redis/memory) for 5-15 minutes
2. **Indexing**: Ensure indexes exist on:
   - `Order(tenantId, customerId, status, fulfilledAt)`
   - `OrderLine(productId, order.customerId)`
   - `SampleTransfer(tenantId, salesRepId, transferDate)`
   - `AccountHealthSnapshot(tenantId, snapshotDate, healthScore)`

3. **Batch Processing**: Use `calculateTenantPace()` and `calculateTenantHealth()` in background jobs, not real-time requests

4. **Materialized Views**: Consider creating views for common aggregations:
   - Monthly revenue per customer
   - Product purchase penetration
   - Sample utilization summaries

## Testing Strategy

### Unit Tests

```typescript
// tests/intelligence/pace-tracker.test.ts
describe('Pace Tracker', () => {
  it('calculates ARPDD correctly', async () => {
    // Test with 3 orders: Day 0, Day 30, Day 60
    // Expected ARPDD: 30 days
  });

  it('flags critical when 150% past due', async () => {
    // ARPDD 30 days, last order 45 days ago
    // Expected: critical risk level
  });
});
```

### Integration Tests

```typescript
// tests/api/dashboard.test.ts
describe('Dashboard API', () => {
  it('returns complete metrics', async () => {
    const response = await fetch('/api/sales/dashboard');
    const data = await response.json();

    expect(data.pace.atRiskCount).toBeDefined();
    expect(data.health.atRiskCount).toBeDefined();
    expect(data.samples.totalPullsThisMonth).toBeDefined();
  });
});
```

## Troubleshooting

### Issue: Pace calculations incorrect

**Symptoms**: ARPDD doesn't match expected cadence

**Checks**:
1. Verify `status = 'fulfilled'` filter
2. Check `fulfilledAt` timestamps
3. Confirm lookback window covers sufficient orders
4. Validate interval calculation logic

### Issue: Health scores always "insufficient-data"

**Symptoms**: All accounts show insufficient-data risk level

**Checks**:
1. Verify fulfilled orders exist with `fulfilledAt`
2. Check `minimumMonthsRequired` threshold
3. Confirm order lines have `subtotal` values
4. Validate monthly grouping logic

### Issue: Sample allowance not enforcing

**Symptoms**: Transfers succeed when over limit

**Checks**:
1. Verify `requireManagerApprovalOver` config
2. Check `approvedByManagerId` is passed when needed
3. Confirm monthly date range calculation
4. Validate quantity summation

## Future Enhancements

1. **Predictive Analytics**: Use ML to predict next order date more accurately
2. **Anomaly Detection**: Flag unusual order patterns beyond simple thresholds
3. **Cohort Analysis**: Group customers by behavior patterns
4. **Sampling ROI**: Track conversion rates from samples to orders
5. **Competitive Intelligence**: Cross-reference with market data
6. **Mobile Alerts**: Push notifications for critical alerts
7. **Voice Integration**: "Ask Leora" natural language queries

## References

- Blueprint Section 1.2: Problem Context
- Blueprint Section 7.1: Dashboard & Intelligence
- Prisma Schema: `/prisma/schema.prisma`
- API Routes: `/app/api/`
