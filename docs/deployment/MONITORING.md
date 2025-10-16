# Monitoring & Observability

Comprehensive monitoring strategy for the Leora Platform.

## Monitoring Stack

### 1. Vercel Dashboard (Built-in)
- **Function invocations** - Track API calls and performance
- **Build logs** - Monitor deployment success/failures
- **Analytics** - Page views, user sessions
- **Error tracking** - Runtime errors and exceptions

### 2. Supabase Dashboard
- **Database metrics** - Query performance, connection pool
- **API usage** - Request volume, error rates
- **Storage** - Database size, backup status
- **Logs** - Query logs, error logs

### 3. Application Logs
- **Structured logging** - JSON format for parsing
- **Log levels** - DEBUG, INFO, WARN, ERROR
- **Contextual data** - User ID, tenant ID, request ID

### 4. External Services (Optional)

#### Sentry (Error Tracking)
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  }
});
```

#### PostHog (Product Analytics)
```typescript
// lib/monitoring/posthog.ts
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
    }
  });
}
```

---

## Key Metrics to Monitor

### Application Health

#### 1. API Response Times
- **Target**: p95 < 2000ms, p99 < 5000ms
- **Monitor**: Vercel function duration
- **Alert**: p95 > 3000ms for 5 minutes

#### 2. Error Rates
- **Target**: < 1% of requests
- **Monitor**: HTTP 5xx responses
- **Alert**: Error rate > 5% for 2 minutes

#### 3. Database Performance
- **Target**: Query time < 100ms average
- **Monitor**: Supabase dashboard
- **Alert**: Query time > 500ms average for 5 minutes

#### 4. AI Token Usage
- **Target**: < 100k tokens/day (adjust per budget)
- **Monitor**: OpenAI usage logs
- **Alert**: Daily usage > 80% of budget

### Business Metrics

#### 1. User Activity
- Active sessions
- Login success rate
- Portal page views

#### 2. Transaction Volume
- Orders per hour
- Invoice generation rate
- Webhook delivery success rate

#### 3. Feature Usage
- Leora AI chat interactions
- Dashboard views
- Report generations

---

## Health Check Endpoints

### `/api/health`
Basic application health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Unhealthy (service unavailable)

### `/api/health/database`
Database connectivity check.

**Response:**
```json
{
  "connected": true,
  "latency": 45,
  "pool": {
    "active": 5,
    "idle": 10,
    "total": 15
  }
}
```

**Status Codes:**
- `200` - Database connected
- `500` - Database connection failed

### `/api/health/config`
Environment configuration check (internal only).

**Response:**
```json
{
  "configured": {
    "DATABASE_URL": true,
    "JWT_SECRET": true,
    "OPENAI_API_KEY": true,
    "DEFAULT_TENANT_SLUG": true
  },
  "missing": []
}
```

---

## Alerting Strategy

### Critical Alerts (Immediate Response)
- Database connection failures
- Error rate > 10%
- Authentication system down
- Payment processing failures

### Warning Alerts (15-minute Response)
- High response times (p95 > 3s)
- Elevated error rates (> 5%)
- Database connection pool exhaustion
- AI API quota approaching limit

### Info Alerts (Review Daily)
- Deployment notifications
- Scheduled job failures
- Performance regressions
- Usage threshold warnings

---

## Logging Best Practices

### Structured Logging

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },

  error: (message: string, error: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};

// Usage
logger.info('User logged in', { userId, tenantId });
logger.error('Database query failed', error, { query, params });
```

### Sensitive Data Filtering

```typescript
function sanitizeLog(data: any): any {
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];

  if (typeof data !== 'object' || data === null) return data;

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLog(sanitized[key]);
    }
  }

  return sanitized;
}
```

---

## Performance Monitoring

### Function Performance

```typescript
// lib/monitoring/performance.ts
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return fn().then(
    (result) => {
      const duration = Date.now() - start;
      logger.info('Performance metric', { name, duration, status: 'success' });
      return result;
    },
    (error) => {
      const duration = Date.now() - start;
      logger.error('Performance metric', error, { name, duration, status: 'error' });
      throw error;
    }
  );
}

// Usage
const products = await measurePerformance('fetch_products', async () => {
  return await prisma.product.findMany();
});
```

### Database Query Monitoring

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' }
  ]
});

prisma.$on('query', (e: any) => {
  if (e.duration > 1000) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params
    });
  }
});

prisma.$on('error', (e: any) => {
  logger.error('Database error', new Error(e.message), {
    target: e.target
  });
});
```

---

## Dashboard Recommendations

### Vercel Dashboard Views
1. **Overview** - Function invocations, errors, build status
2. **Functions** - Individual function performance
3. **Logs** - Real-time application logs
4. **Analytics** - User traffic and page views

### Supabase Dashboard Views
1. **Database** - Query performance, connection pool
2. **Storage** - Database size, backup status
3. **API** - Request volume, error rates
4. **Logs** - Query logs, error logs

### Custom Monitoring Dashboard (Optional)

Consider building a custom dashboard for:
- Real-time metrics aggregation
- Business KPIs
- Custom alerts
- Historical trends

Tools: Grafana, Datadog, New Relic

---

## Incident Response

### 1. Detection
- Automated alerts trigger
- User reports issues
- Monitoring dashboards show anomalies

### 2. Triage
- Assess severity (critical/major/minor)
- Identify affected systems
- Estimate user impact

### 3. Investigation
- Check Vercel logs
- Review Supabase metrics
- Analyze error traces
- Test functionality manually

### 4. Resolution
- Apply hotfix if available
- Rollback deployment if needed
- Scale resources if capacity issue
- Update configuration

### 5. Post-Mortem
- Document incident timeline
- Identify root cause
- List corrective actions
- Update runbooks

---

**Last Updated**: 2025-10-15
**Version**: 1.0.0
