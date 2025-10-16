# Intelligence Algorithms - Technical Specification

Detailed mathematical and algorithmic specifications for Leora's business intelligence engines.

## 1. ARPDD (Average Recent Purchase Day Distance)

### Definition

ARPDD represents the established ordering cadence for an account, calculated as the average number of days between consecutive fulfilled orders within a lookback window.

### Formula

```
Let O = {o₁, o₂, ..., oₙ} be fulfilled orders sorted by fulfillment date
Let I = {i₁, i₂, ..., iₙ₋₁} where iⱼ = days(oⱼ₊₁) - days(oⱼ)

ARPDD = (Σ iⱼ) / (n - 1)  for j = 1 to n-1
```

### Implementation Details

**Step 1: Order Collection**
```sql
SELECT id, fulfilledAt
FROM orders
WHERE tenantId = :tenantId
  AND customerId = :customerId
  AND status = 'fulfilled'
  AND fulfilledAt >= :lookbackDate
ORDER BY fulfilledAt ASC
```

**Step 2: Interval Calculation**
```typescript
const intervals: number[] = [];
for (let i = 1; i < orders.length; i++) {
  const prevDate = orders[i - 1].fulfilledAt;
  const currDate = orders[i].fulfilledAt;
  const intervalDays = Math.floor(
    (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  intervals.push(intervalDays);
}
```

**Step 3: Average Calculation**
```typescript
const arpdd = intervals.length > 0
  ? Math.round(intervals.reduce((sum, val) => sum + val, 0) / intervals.length)
  : null;
```

### Risk Thresholds

```typescript
daysSinceLastOrder = floor((now - lastOrderDate) / (24 * 60 * 60 * 1000))

if (daysSinceLastOrder >= arpdd × criticalMultiplier) {
  riskLevel = 'critical'  // Default: 1.5x ARPDD
} else if (daysSinceLastOrder >= arpdd × warningMultiplier) {
  riskLevel = 'warning'   // Default: 1.2x ARPDD
} else {
  riskLevel = 'on-track'
}
```

### Edge Cases

1. **Insufficient Data** (`orderCount < minimumOrdersRequired`)
   - Return `riskLevel = 'insufficient-data'`
   - ARPDD = null
   - Do not flag as at-risk

2. **Zero-Day Intervals**
   - Include in calculation (same-day reorders are valid)
   - Example: Orders on Day 0, 0, 30 → intervals [0, 30] → ARPDD = 15

3. **Large Gaps**
   - No outlier removal (gaps are real signals)
   - Example: [7, 14, 60] → ARPDD = 27 (not 10.5)

4. **Seasonal Patterns**
   - Current implementation doesn't account for seasonality
   - Future: Use year-over-year lookback or seasonal decomposition

### Performance Optimization

```typescript
// Pre-aggregate for dashboard queries
CREATE MATERIALIZED VIEW account_pace_metrics AS
SELECT
  customer_id,
  COUNT(*) as order_count,
  AVG(interval_days) as arpdd,
  MAX(fulfilled_at) as last_order_date
FROM (
  SELECT
    customer_id,
    fulfilled_at,
    EXTRACT(EPOCH FROM (fulfilled_at - LAG(fulfilled_at) OVER (PARTITION BY customer_id ORDER BY fulfilled_at))) / 86400 as interval_days
  FROM orders
  WHERE status = 'fulfilled'
    AND fulfilled_at >= NOW() - INTERVAL '180 days'
) intervals
GROUP BY customer_id;

-- Refresh daily
REFRESH MATERIALIZED VIEW account_pace_metrics;
```

## 2. Revenue Health Scoring

### Definition

Health score quantifies revenue trend by comparing current period revenue to historical baseline, flagging significant drops that indicate account risk.

### Formula

```
Let M = {m₁, m₂, ..., mₙ} be monthly revenue totals
Let Rᵦ = baseline average (excluding current month)
Let Rᴄ = current month revenue

percentageChange = ((Rᴄ - Rᵦ) / Rᵦ) × 100

Health Score:
  critical  if percentageChange ≤ criticalThreshold (default: -15%)
  warning   if percentageChange ≤ warningThreshold (default: -10%)
  healthy   otherwise
```

### Implementation Details

**Step 1: Monthly Revenue Aggregation**
```sql
SELECT
  EXTRACT(YEAR FROM fulfilled_at) as year,
  EXTRACT(MONTH FROM fulfilled_at) as month,
  SUM(subtotal) as revenue,
  COUNT(*) as order_count
FROM orders o
JOIN order_lines ol ON o.id = ol.order_id
WHERE o.tenant_id = :tenantId
  AND o.customer_id = :customerId
  AND o.status = 'fulfilled'
  AND o.fulfilled_at >= :lookbackDate
GROUP BY year, month
ORDER BY year, month
```

**Step 2: Baseline Calculation**
```typescript
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const baselineMonths = config.excludeCurrentMonth
  ? monthlyRevenues.filter(m =>
      !(m.year === currentYear && m.month === currentMonth)
    )
  : monthlyRevenues;

const baselineAverage = baselineMonths.length > 0
  ? baselineMonths.reduce((sum, m) => sum + m.revenue, 0) / baselineMonths.length
  : 0;
```

**Step 3: Percentage Change**
```typescript
const currentMonthData = monthlyRevenues.find(
  m => m.year === currentYear && m.month === currentMonth
);
const currentMonthRevenue = currentMonthData?.revenue || 0;

const percentageChange = baselineAverage > 0
  ? ((currentMonthRevenue - baselineAverage) / baselineAverage) * 100
  : 0;
```

### Risk Thresholds

```typescript
if (monthlyRevenues.length < minimumMonthsRequired) {
  riskLevel = 'insufficient-data'
} else if (percentageChange <= criticalThresholdPercent) {
  riskLevel = 'critical'  // Default: -15%
  isAtRisk = true
} else if (percentageChange <= warningThresholdPercent) {
  riskLevel = 'warning'   // Default: -10%
  isAtRisk = true
} else {
  riskLevel = 'healthy'
  isAtRisk = false
}
```

### Edge Cases

1. **Partial Month**
   - Default: Exclude current month from baseline (may be incomplete)
   - Alternative: Include if past day 20 of month

2. **Seasonal Fluctuation**
   - Compare to same month last year instead of rolling average
   - Future enhancement

3. **New Customer**
   - Requires `minimumMonthsRequired` (default 3) to establish baseline
   - Return `insufficient-data` until met

4. **Zero Baseline**
   - If baseline = 0 (no prior revenue), percentageChange = 0
   - Future: Flag differently (reactivation vs. drop)

### Snapshot Persistence

```typescript
// Store for trending
await prisma.accountHealthSnapshot.create({
  data: {
    tenantId,
    customerId: accountId,
    snapshotDate: new Date(),
    healthScore: riskLevel,
    revenueThisMonth: currentMonthRevenue,
    revenueBaseline: baselineAverage,
    percentageChange,
    metadata: {
      monthlyRevenues,
      orderCount: totalOrders,
    },
  },
});
```

### Trending Analysis

```sql
-- Get health trend over time
SELECT
  snapshot_date,
  health_score,
  percentage_change,
  revenue_this_month,
  revenue_baseline
FROM account_health_snapshots
WHERE tenant_id = :tenantId
  AND customer_id = :customerId
  AND snapshot_date >= NOW() - INTERVAL '12 months'
ORDER BY snapshot_date ASC
```

## 3. Sample Allowance Tracking

### Definition

Monthly sample allowance enforces budgetary controls on rep sample distribution while maintaining accountability through feedback loops.

### Formula

```
Let S = {s₁, s₂, ..., sₙ} be sample transfers in month M
Let A = monthly allowance (default: 60 units)

pullsThisMonth = Σ sᵢ.quantity  for i = 1 to n
remainingAllowance = A - pullsThisMonth
isOverAllowance = pullsThisMonth > A
```

### Implementation Details

**Step 1: Monthly Transfer Aggregation**
```sql
SELECT
  st.sales_rep_id,
  SUM(st.quantity) as pulls_this_month,
  COUNT(*) as transfer_count,
  COUNT(st.follow_up_activity_id) as feedback_count
FROM sample_transfers st
WHERE st.tenant_id = :tenantId
  AND st.sales_rep_id = :salesRepId
  AND st.transfer_date >= :monthStart
  AND st.transfer_date <= :monthEnd
GROUP BY st.sales_rep_id
```

**Step 2: Allowance Check**
```typescript
if (currentPulls + requestedQuantity > config.requireManagerApprovalOver) {
  if (!approvedByManagerId) {
    throw new Error(
      `Sample transfer exceeds allowance (${currentPulls + requestedQuantity}/${config.requireManagerApprovalOver}). Manager approval required.`
    );
  }
}
```

**Step 3: Inventory Movement**
```typescript
// Create negative inventory movement
await prisma.inventoryMovement.create({
  data: {
    tenantId,
    skuId,
    movementType: 'sample_transfer',
    quantity: -quantity,  // Negative for outbound
    movementDate: transferDate,
    notes: `Sample to ${customerName} - ${purposeNotes}`,
    metadata: {
      salesRepId,
      customerId,
      productId,
    },
  },
});
```

### Feedback Tracking

**Pending Feedback Query**
```sql
SELECT st.*
FROM sample_transfers st
WHERE st.tenant_id = :tenantId
  AND st.follow_up_activity_id IS NULL
  AND st.transfer_date <= NOW() - INTERVAL ':minimumFeedbackDays days'
ORDER BY st.transfer_date ASC
```

**Feedback Rate Calculation**
```typescript
const feedbackRate = (hasFeedback / (hasFeedback + needsFeedback)) × 100

// Rep performance metric
repUtilization = {
  totalPulls,
  uniqueProducts,
  uniqueCustomers,
  feedbackRate,  // Target: >80%
}
```

### Edge Cases

1. **Manager Override**
   - Allow transfers over limit with `approvedByManagerId`
   - Log approval in metadata for audit trail

2. **Multi-Unit Transfers**
   - Quantity counts toward allowance
   - Example: 6-pack counts as 6 units, not 1

3. **Monthly Rollover**
   - No rollover of unused allowance
   - Each month resets to default

4. **Retroactive Feedback**
   - Allow feedback entry after deadline
   - Flag as "late feedback" in metrics

## 4. Opportunity Detection

### Definition

Opportunity detection identifies high-value products a customer hasn't purchased, ranked by performance across the broader customer base.

### Ranking Metrics

**Revenue Ranking**
```
Let P = product
Let C = set of all customers
Let O = orders containing P in lookback window

revenueScore(P) = Σ orderLine.subtotal for all O

Rank products by revenueScore(P) descending
```

**Volume Ranking**
```
volumeScore(P) = Σ orderLine.quantity for all O

Rank products by volumeScore(P) descending
```

**Penetration Ranking**
```
Let Cₚ = unique customers who purchased P
Let Cᴛ = total active customers

penetrationScore(P) = (|Cₚ| / |Cᴛ|) × 100

Rank products by penetrationScore(P) descending
```

### Implementation Details

**Step 1: Exclude Purchased Products**
```sql
-- Get products customer HAS purchased
SELECT DISTINCT product_id
FROM order_lines ol
JOIN orders o ON ol.order_id = o.id
WHERE o.tenant_id = :tenantId
  AND o.customer_id = :customerId
  AND o.status = 'fulfilled'
  AND o.fulfilled_at >= :lookbackDate

-- Get candidate products (NOT in purchased list)
SELECT p.*
FROM products p
WHERE p.tenant_id = :tenantId
  AND p.id NOT IN (purchased_products)
  AND p.is_active = true
```

**Step 2: Calculate Metrics**
```typescript
// For each candidate product
const orderLines = await prisma.orderLine.findMany({
  where: {
    productId: product.id,
    order: {
      tenantId,
      status: 'fulfilled',
      fulfilledAt: { gte: lookbackDate },
    },
  },
  include: {
    order: { select: { customerId: true } },
  },
});

const totalRevenue = orderLines.reduce(
  (sum, line) => sum + Number(line.subtotal || 0), 0
);
const totalUnits = orderLines.reduce(
  (sum, line) => sum + line.quantity, 0
);
const uniqueCustomers = new Set(
  orderLines.map(line => line.order.customerId)
).size;
const penetrationPercent = (uniqueCustomers / totalCustomers) * 100;
```

**Step 3: Rank and Filter**
```typescript
// Rank by selected metric
opportunities.sort((a, b) => b.metricValue - a.metricValue);

// Apply minimum threshold
opportunities = opportunities.filter(
  opp => opp.customersPurchased >= config.minimumCustomerThreshold
);

// Limit to topN
opportunities = opportunities.slice(0, config.topN);
```

### Edge Cases

1. **Low Adoption Products**
   - Filter out products with < N customers (default: 3)
   - Prevents recommending unproven products

2. **Discontinued Products**
   - Default: Exclude `isActive = false`
   - Configurable: Include if clearing inventory

3. **Low Inventory**
   - Optional: Exclude if inventory < order minimum
   - Prevents recommending out-of-stock items

4. **Category Bias**
   - Future: Weight by category diversity
   - Avoid recommending only top-selling category

### Performance Optimization

```sql
-- Pre-aggregate product metrics
CREATE MATERIALIZED VIEW product_opportunity_metrics AS
SELECT
  p.id as product_id,
  SUM(ol.subtotal) as total_revenue,
  SUM(ol.quantity) as total_units,
  COUNT(DISTINCT o.customer_id) as customer_count,
  (COUNT(DISTINCT o.customer_id)::float / (SELECT COUNT(*) FROM customers WHERE is_active = true)) * 100 as penetration_percent
FROM products p
LEFT JOIN order_lines ol ON p.id = ol.product_id
LEFT JOIN orders o ON ol.order_id = o.id
WHERE o.status = 'fulfilled'
  AND o.fulfilled_at >= NOW() - INTERVAL '180 days'
GROUP BY p.id;

-- Refresh daily
REFRESH MATERIALIZED VIEW product_opportunity_metrics;
```

## 5. Combined Alert Prioritization

### Definition

Alerts combine multiple risk signals to prioritize sales team action.

### Priority Scoring

```
Let A = account
Let Pᵣ = pace risk level (0=on-track, 1=warning, 2=critical)
Let Hᵣ = health risk level (0=healthy, 1=warning, 2=critical)
Let D = days since last activity

priorityScore(A) = (Pᵣ × 10) + (Hᵣ × 5) + min(D / 7, 5)

Sort alerts by priorityScore descending
```

### Implementation

```typescript
const alerts = [];

// Pace critical
paceResults.filter(p => p.riskLevel === 'critical').forEach(p => {
  alerts.push({
    type: 'pace_critical',
    accountId: p.accountId,
    accountName: p.accountName,
    priority: 20 + Math.min(p.daysSinceLastOrder / 7, 5),
    message: `${p.accountName} is ${p.daysSinceLastOrder} days past expected order (ARPDD: ${p.arpdd})`,
  });
});

// Health critical
healthResults.filter(h => h.riskLevel === 'critical').forEach(h => {
  alerts.push({
    type: 'health_critical',
    accountId: h.accountId,
    accountName: h.accountName,
    priority: 10 + Math.abs(h.percentageChange) / 5,
    message: `${h.accountName} revenue down ${Math.abs(h.percentageChange).toFixed(1)}%`,
  });
});

// Sort by priority
alerts.sort((a, b) => b.priority - a.priority);
```

## Performance Benchmarks

Target response times for API endpoints:

- `calculateAccountPace`: < 500ms
- `calculateAccountHealth`: < 500ms
- `detectCustomerOpportunities`: < 1s
- `calculateDashboardMetrics` (tenant-wide): < 5s
- `calculateAccountInsights`: < 2s

Optimization strategies:
1. Use materialized views for aggregations
2. Cache results for 5-15 minutes
3. Batch process in background jobs (nightly snapshots)
4. Index on `(tenantId, customerId, status, fulfilledAt)`

## Testing Validation

Each algorithm should be validated with:

1. **Unit tests** - Verify calculations with known inputs
2. **Edge case tests** - Handle missing/invalid data
3. **Performance tests** - Meet response time benchmarks
4. **Integration tests** - Validate against real Supabase data

Example test case (ARPDD):
```typescript
// Input: Orders on Day 0, 30, 60, 90
// Expected: ARPDD = 30 days
// Input: Current date = Day 130
// Expected: daysSinceLastOrder = 40, riskLevel = 'warning' (40 > 30 × 1.2)
```
