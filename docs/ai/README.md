# Leora AI Copilot Documentation

## Overview

The Leora AI Copilot is an intelligent assistant that powers proactive insights and conversational analytics across the Leora platform. Built on OpenAI GPT-5, it delivers "clarity you can act on" by analyzing distributor operations data and providing actionable recommendations.

## Architecture

### Core Components

```
lib/ai/
├── types.ts                    # TypeScript types and response contracts
├── openai-client.ts           # OpenAI client wrapper with retry logic
├── insights-composer.ts       # Proactive insights generation
├── briefing-job.ts           # Scheduled briefing generation
├── query-validator.ts        # SQL whitelisting and safety layer
└── prompts/
    └── system-prompts.ts     # System prompts and templates

app/api/leora/chat/
└── route.ts                  # Chat API endpoint

components/portal/leora/
└── LeoraChatPanel.tsx       # Chat UI component
```

## Key Features

### 1. Proactive Briefings

Daily dashboard summaries that highlight:
- Customers with pace deviations
- Revenue drops and trends
- Sample budget utilization
- Pipeline gaps and overdue activities
- Recommended next actions

**Usage:**
```typescript
import { getBriefingJob } from '@/lib/ai/briefing-job';

const job = getBriefingJob();
const briefing = await job.generateUserBriefing(tenantId, userId);
```

### 2. Conversational Analytics

Natural language interface for querying operations data:
- "Which customers are late on orders?"
- "Show revenue by product this month"
- "Top performers last 30 days"

**API Endpoint:** `POST /api/leora/chat`

**Request:**
```json
{
  "message": "Which customers slipped pace this week?",
  "sessionId": "chat_123",
  "context": {
    "tenantId": "well-crafted",
    "userId": "user_456",
    "userRole": "sales_rep"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": {
      "summary": "Based on orders from the last 30 days, 2 customers have slipped their normal ordering pace...",
      "tables": [...],
      "recommendedActions": [...],
      "confidence": 0.85
    },
    "sessionId": "chat_123",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350
    }
  }
}
```

### 3. SQL Query Whitelisting

All database queries are validated against a whitelist to ensure security:

```typescript
import { QueryValidator } from '@/lib/ai/query-validator';

const validation = QueryValidator.validateQuery(
  'customers_by_pace_deviation',
  { tenantId: 'well-crafted', deviationThreshold: 7 },
  'sales_rep'
);
```

**Available Query Templates:**
- `customers_by_pace_deviation` - Find customers late on orders
- `customers_revenue_drop` - Identify revenue declines
- `orders_recent` - Recent order history
- `sales_by_rep` - Sales performance by rep
- `products_top_performers` - Top selling products
- `samples_by_rep` - Sample usage tracking

## Environment Configuration

### Required Environment Variables

```bash
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-proj-...

# Database Connection (for Prisma queries)
DATABASE_URL=postgresql://...
```

### Adding to Vercel

```bash
vercel env add OPENAI_API_KEY
# Paste the API key when prompted
```

## Voice and Tone

Leora's responses follow these guidelines:

### ✅ DO:
- Use short sentences and active verbs
- Lead with the key insight
- Provide specific, actionable recommendations
- Be honest about data gaps
- Cite data sources and time periods

### ❌ DON'T:
- Use emojis or corporate jargon
- Fabricate data or metrics
- Give vague or generic advice
- Overexplain obvious points

### Example Good Response:
> "2 customers have slipped their ordering pace. Harborview Cellars is 12 days late (normally orders every 14 days). Mountain View Spirits is 8 days late. Schedule follow-up calls this week to prevent churn."

### Example Bad Response:
> "🎯 Great news! We've identified some opportunities in your customer base! It looks like a couple of your valued partners might benefit from some proactive outreach..."

## System Prompts

### Base System Prompt

All Leora interactions start with the base system prompt that defines personality, capabilities, and operational rules:

```typescript
import { LEORA_BASE_SYSTEM_PROMPT } from '@/lib/ai/prompts/system-prompts';
```

Key elements:
- Purpose: Deliver "clarity you can act on"
- Voice: Warm, assured, to the point
- Rules: Only use verified data, never fabricate
- Structure: Lead with insight, provide data, recommend actions

### Specialized Prompts

1. **Briefing Prompt** - Dashboard summaries
2. **Chat Prompt** - Conversational analytics
3. **Insight Composer** - Narrative insights from structured data

## Token Usage Tracking

Token usage is automatically tracked for cost management:

```typescript
import { getOpenAIClient } from '@/lib/ai/openai-client';

const client = getOpenAIClient();

// Get usage logs
const logs = client.getUsageLogs('well-crafted', startDate);

// Calculate costs
const totalCost = client.getTotalCost('well-crafted', startDate);
```

## Error Handling

### Retry Logic

The OpenAI client automatically retries failed requests with exponential backoff:
- Maximum 3 retries
- Exponential backoff (1s, 2s, 4s)
- Special handling for rate limits (429)

### Fallback Mechanisms

When AI is unavailable:
- Briefings: Return structured metrics without narrative
- Chat: Show cached responses or error message
- Confidence scores indicate fallback mode

## Confidence Scoring

All AI responses include a confidence score (0-1):
- **0.85+** - High confidence, full data available
- **0.7-0.84** - Medium confidence, partial data
- **0.5-0.69** - Low confidence, limited data or fallback mode
- **<0.5** - Very low confidence, cached/generated response

## Security Considerations

### SQL Injection Prevention

- All queries use parameterized SQL templates
- User input is validated and sanitized
- Additional pattern detection for SQL injection attempts

### RBAC Enforcement

Query templates specify allowed roles:
```typescript
allowedRoles: ['admin', 'sales_rep', 'sales_manager']
```

### Tenant Isolation

All queries enforce tenant isolation via `tenantId` parameter:
```sql
WHERE tenant_id = $1
```

## Performance Optimization

### Caching Strategy

- Briefings cached for 1 hour by default
- Chat sessions stored in memory (migrate to Redis for production)
- Invalidate cache when underlying data changes

### Batch Processing

Daily briefing job processes all users in a tenant:
```typescript
import { runScheduledBriefingJob } from '@/lib/ai/briefing-job';

// Run via cron or serverless function
await runScheduledBriefingJob();
```

## Integration Examples

### Dashboard Briefing

```typescript
import { getBriefingJob } from '@/lib/ai/briefing-job';

export default async function DashboardPage() {
  const job = getBriefingJob();
  const briefing = await job.generateUserBriefing(tenantId, userId);

  return (
    <div>
      <h1>Daily Briefing</h1>
      <p>{briefing.summary}</p>

      <div>
        {briefing.alerts.map(alert => (
          <AlertCard key={alert.title} alert={alert} />
        ))}
      </div>

      <div>
        {briefing.recommendedActions.map(action => (
          <ActionCard key={action.title} action={action} />
        ))}
      </div>
    </div>
  );
}
```

### Chat Interface

```typescript
import { LeoraChatPanel } from '@/components/portal/leora/LeoraChatPanel';

export default function ChatPage() {
  return (
    <LeoraChatPanel
      tenantId={tenantId}
      userId={userId}
      userRole="sales_rep"
      className="h-screen"
    />
  );
}
```

## Future Enhancements

### Phase 2 Features
- Session memory across conversations
- Command routing (create tasks, schedule tastings)
- Multi-turn reasoning for complex queries
- Chart generation hints

### Phase 3 Features
- Voice interface support
- Mobile app integration
- Email/Slack notifications
- Custom prompt templates per tenant

## Testing

### Unit Tests
```bash
npm test lib/ai
```

### Integration Tests
```bash
npm test app/api/leora
```

### Manual Testing

1. **Briefing Generation**
```bash
curl -X POST http://localhost:3000/api/leora/briefing \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"well-crafted","userId":"user_123"}'
```

2. **Chat Query**
```bash
curl -X POST http://localhost:3000/api/leora/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Which customers are late on orders?",
    "context": {"tenantId":"well-crafted","userId":"user_123"}
  }'
```

## Monitoring

### Key Metrics to Track

1. **Usage Metrics**
   - Total API calls per day
   - Token consumption by tenant
   - Cost per tenant
   - Average response time

2. **Quality Metrics**
   - Average confidence scores
   - Error rates
   - User satisfaction (thumbs up/down)
   - Action completion rates

3. **Performance Metrics**
   - API latency (p50, p95, p99)
   - Cache hit rates
   - Query execution times

## Support

For issues or questions:
1. Check this documentation
2. Review OpenAI API status: https://status.openai.com
3. Check error logs in Vercel dashboard
4. Contact platform team

## References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Leora Platform Blueprint](../leora-platform-blueprint.md)
- [Query Validator Reference](./query-validator.md)
- [Prompt Engineering Guide](./prompt-engineering.md)
