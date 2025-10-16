# Query Validator & SQL Whitelisting

## Overview

The Query Validator is a security layer that ensures AI-generated queries only execute approved, parameterized SQL templates with proper tenant isolation and RBAC enforcement.

## Architecture

### Core Concept

Instead of allowing GPT-5 to write arbitrary SQL, we:
1. Pre-define safe query templates with parameters
2. Map natural language intents to templates
3. Validate parameters against type schemas
4. Execute parameterized queries only

### Security Benefits

- **SQL Injection Prevention:** No user input in SQL strings
- **Tenant Isolation:** `tenantId` enforced on all queries
- **RBAC Enforcement:** Role-based query access control
- **Audit Trail:** All queries logged with parameters
- **Resource Limits:** Max row limits per template

## Query Template Structure

```typescript
interface WhitelistedQuery {
  templateId: string;           // Unique identifier
  description: string;          // What the query does
  sqlTemplate: string;          // Parameterized SQL with $1, $2, etc.
  parameters: Parameter[];      // Parameter definitions
  maxRows: number;             // Maximum rows to return
  allowedRoles: string[];      // Roles that can execute
}

interface Parameter {
  name: string;                // Parameter name
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;           // Is parameter required?
  validation?: string;         // Zod validation schema string
}
```

## Available Query Templates

### Customer Queries

#### customers_by_pace_deviation

Find customers exceeding their normal ordering pace.

**Parameters:**
- `tenantId` (string, required) - Tenant identifier
- `deviationThreshold` (number, required) - Days over normal pace
- `daysLookback` (number, optional) - How far back to check
- `limit` (number, optional) - Max results

**Allowed Roles:** admin, sales_rep, sales_manager

**Example:**
```typescript
const params = {
  tenantId: 'well-crafted',
  deviationThreshold: 7,
  daysLookback: 30,
  limit: 20
};
```

#### customers_revenue_drop

Identify customers with significant revenue declines.

**Parameters:**
- `tenantId` (string, required)
- `dropThreshold` (number, required) - Negative percentage (-15 = -15%)
- `limit` (number, optional)

**Allowed Roles:** admin, sales_rep, sales_manager

### Order Queries

#### orders_recent

Get recent orders with optional filtering.

**Parameters:**
- `tenantId` (string, required)
- `status` (string, optional) - Order status filter
- `startDate` (date, optional) - From date
- `endDate` (date, optional) - To date
- `limit` (number, optional)

**Allowed Roles:** admin, sales_rep, sales_manager, portal_user

### Sales Metrics

#### sales_by_rep

Sales performance breakdown by representative.

**Parameters:**
- `tenantId` (string, required)
- `startDate` (date, required)
- `endDate` (date, required)
- `limit` (number, optional)

**Allowed Roles:** admin, sales_manager

### Product Queries

#### products_top_performers

Top selling products by revenue or volume.

**Parameters:**
- `tenantId` (string, required)
- `startDate` (date, required)
- `endDate` (date, required)
- `orderBy` (string, required) - 'revenue' or 'units_sold'
- `limit` (number, optional)

**Allowed Roles:** admin, sales_rep, sales_manager

### Sample Management

#### samples_by_rep

Sample usage tracking with monthly allowances.

**Parameters:**
- `tenantId` (string, required)
- `startDate` (date, required)
- `endDate` (date, required)
- `limit` (number, optional)

**Allowed Roles:** admin, sales_manager

## Usage Examples

### Basic Validation

```typescript
import { QueryValidator } from '@/lib/ai/query-validator';

const result = QueryValidator.validateQuery(
  'customers_by_pace_deviation',
  {
    tenantId: 'well-crafted',
    deviationThreshold: 7,
    daysLookback: 30,
    limit: 20
  },
  'sales_rep'
);

if (!result.valid) {
  console.error(result.error);
  return;
}

// Execute with sanitized params
const { query, params } = QueryValidator.buildSafeQuery(
  'customers_by_pace_deviation',
  parameters,
  userRole
);
```

### Intent Detection

```typescript
import { detectQueryIntent } from '@/lib/ai/query-validator';

const userMessage = "Which customers are late on orders?";
const intent = detectQueryIntent(userMessage, tenantId);

if (intent) {
  console.log(`Detected template: ${intent.templateId}`);
  console.log(`Confidence: ${intent.confidence}`);
  console.log(`Suggested params:`, intent.suggestedParams);
}
```

### Checking Available Queries

```typescript
import { QueryValidator } from '@/lib/ai/query-validator';

// Get all queries a role can execute
const availableQueries = QueryValidator.getAvailableQueries('sales_rep');

availableQueries.forEach(query => {
  console.log(`${query.templateId}: ${query.description}`);
});
```

## Adding New Query Templates

### Step 1: Define Template

```typescript
// In lib/ai/query-validator.ts

export const WHITELISTED_QUERIES: Record<string, WhitelistedQuery> = {
  // ... existing queries ...

  my_new_query: {
    templateId: 'my_new_query',
    description: 'Description of what this query does',
    sqlTemplate: `
      SELECT
        col1,
        col2
      FROM my_table
      WHERE tenant_id = $1
        AND col3 = $2
      LIMIT $3
    `,
    parameters: [
      { name: 'tenantId', type: 'string', required: true },
      { name: 'filterValue', type: 'string', required: true },
      { name: 'limit', type: 'number', required: false },
    ],
    maxRows: 1000,
    allowedRoles: ['admin', 'sales_rep'],
  },
};
```

### Step 2: Add Intent Detection

```typescript
// In detectQueryIntent function

if (query.includes('my keyword')) {
  return {
    templateId: 'my_new_query',
    confidence: 0.8,
    suggestedParams: {
      tenantId,
      filterValue: extractedValue,
      limit: 50,
    },
  };
}
```

### Step 3: Test Validation

```typescript
const result = QueryValidator.validateQuery(
  'my_new_query',
  { tenantId: 'test', filterValue: 'value' },
  'sales_rep'
);

expect(result.valid).toBe(true);
```

## Security Considerations

### SQL Injection Protection

The validator includes multiple layers of protection:

1. **Parameterized Queries:** All values passed as parameters
2. **Type Validation:** Zod schemas enforce correct types
3. **Pattern Detection:** Additional check for SQL injection attempts

```typescript
QueryValidator.detectSQLInjection("DROP TABLE users--");
// Returns: true (blocked)

QueryValidator.detectSQLInjection("Harborview Cellars");
// Returns: false (allowed)
```

### Tenant Isolation

Every query template MUST include tenant filtering:

```sql
WHERE tenant_id = $1  -- Always first parameter
```

### Row Limits

Maximum rows enforced per template:

```typescript
maxRows: 1000  // Prevents large data dumps
```

### Role-Based Access

Queries specify allowed roles:

```typescript
allowedRoles: ['admin', 'sales_manager']
// sales_rep cannot execute this query
```

## Intent Detection

### How It Works

1. User sends natural language query
2. Keywords and patterns are matched
3. Most confident template is selected
4. Parameters are suggested based on context

### Current Patterns

```typescript
// Pace deviation queries
"pace", "late", "overdue" → customers_by_pace_deviation

// Revenue queries
"revenue" + "drop" → customers_revenue_drop

// Recent orders
"recent" + "order" → orders_recent

// Top products
"top" + "product" → products_top_performers
```

### Improving Detection

For production, replace keyword matching with GPT function calling:

```typescript
const response = await client.chatWithFunctions(
  messages,
  QUERY_ROUTER_FUNCTIONS,
  { functionCall: 'auto' }
);

if (response.functionCall) {
  const { name, arguments } = response.functionCall;
  const params = JSON.parse(arguments);

  // Execute whitelisted query with extracted params
}
```

## Parameter Validation

### Type Validation

```typescript
const parameterValidators = {
  string: z.string().min(1).max(255),
  number: z.number().int().min(0),
  date: z.coerce.date(),
  boolean: z.boolean(),
};
```

### Custom Validation

For enum-like parameters:

```typescript
{
  name: 'orderBy',
  type: 'string',
  required: true,
  validation: 'z.enum(["revenue", "units_sold"])'
}
```

### Required vs Optional

```typescript
// Required parameter
{ name: 'tenantId', type: 'string', required: true }

// Optional parameter (defaults to null in query)
{ name: 'limit', type: 'number', required: false }
```

## Error Handling

### Validation Errors

```typescript
const result = QueryValidator.validateQuery(...);

if (!result.valid) {
  // result.error contains human-readable message
  console.error(result.error);

  // Examples:
  // "Query template 'invalid_id' is not whitelisted"
  // "Role 'portal_user' is not authorized for this query"
  // "Required parameter 'tenantId' is missing"
  // "Parameter 'deviationThreshold' validation failed"
}
```

### SQL Injection Detection

```typescript
if (QueryValidator.detectSQLInjection(userInput)) {
  throw new AIError(
    'Invalid input detected',
    'VALIDATION_ERROR',
    400
  );
}
```

## Performance Optimization

### Query Optimization

- All templates use proper indexes
- LIMIT clauses prevent unbounded results
- Date range filters reduce scanned rows

### Caching Strategy

Cache query results for common queries:

```typescript
const cacheKey = `query:${templateId}:${JSON.stringify(params)}`;
const cached = await cache.get(cacheKey);

if (cached) {
  return cached;
}

const result = await executeQuery(...);
await cache.set(cacheKey, result, 300); // 5 min TTL
```

## Monitoring

### Metrics to Track

1. **Query Execution:**
   - Queries per template
   - Average execution time
   - Error rates by template

2. **Security:**
   - Blocked queries (validation failures)
   - SQL injection attempts
   - Unauthorized access attempts

3. **Usage Patterns:**
   - Most common templates
   - Parameter distributions
   - User roles executing queries

### Logging

```typescript
console.log('[Query Validator]', {
  templateId,
  userId,
  userRole,
  parameters: sanitizedParams,
  executionTime: performance.now() - startTime,
  rowCount: result.length,
});
```

## Testing

### Unit Tests

```typescript
describe('QueryValidator', () => {
  it('validates required parameters', () => {
    const result = QueryValidator.validateQuery(
      'customers_by_pace_deviation',
      { tenantId: 'test' }, // Missing deviationThreshold
      'sales_rep'
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('deviationThreshold');
  });

  it('enforces role-based access', () => {
    const result = QueryValidator.validateQuery(
      'sales_by_rep',
      { tenantId: 'test', startDate: new Date(), endDate: new Date() },
      'portal_user' // Not authorized
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('not authorized');
  });
});
```

### Integration Tests

Test with actual Prisma client:

```typescript
it('executes query with tenant isolation', async () => {
  const result = await executeQuery(
    'orders_recent',
    { tenantId: 'tenant-a', limit: 10 },
    'sales_rep'
  );

  // Verify all results belong to tenant-a
  result.data.forEach(row => {
    expect(row.tenant_id).toBe('tenant-a');
  });
});
```

## Migration from Direct SQL

### Before (Unsafe)

```typescript
// ❌ NEVER DO THIS
const customerName = userInput;
const query = `SELECT * FROM customers WHERE name = '${customerName}'`;
await prisma.$queryRaw(query);
```

### After (Safe)

```typescript
// ✅ Use whitelisted template
const result = await executeQuery(
  'customers_by_name',
  { tenantId, name: userInput },
  userRole
);
```

## References

- [Prisma Raw Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
