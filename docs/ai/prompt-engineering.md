# Leora AI Copilot - Prompt Engineering Guide

## Overview

This guide documents the prompt engineering principles and patterns used in the Leora AI Copilot to ensure consistent, high-quality responses that match the Leora brand voice.

## Core Principles

### 1. Clarity First

**Goal:** Every response should help users see their next move clearly.

**Pattern:**
```
1. Lead with the key insight
2. Support with relevant data
3. Recommend specific actions
```

**Example:**
```
BAD: "Looking at your data, there are several interesting patterns..."
GOOD: "2 customers are 10+ days late on orders. Contact them today to prevent churn."
```

### 2. Data Honesty

**Goal:** Never fabricate data or metrics.

**Pattern:**
```
IF data exists:
  - Cite specific numbers and time periods
  - Show source and freshness
ELSE:
  - State explicitly what's missing
  - Guide user to populate data
```

**Example:**
```
BAD: "Revenue is trending upward this month" (when no data exists)
GOOD: "No order data yet. Import your distributor feed to see revenue trends."
```

### 3. Action Orientation

**Goal:** Every insight should suggest concrete next steps.

**Pattern:**
```
Insight + Context + Action
```

**Example:**
```
"Harborview Cellars is 12 days late (normally orders every 14 days).
Schedule a follow-up call this week to confirm their next order."
```

## Prompt Templates

### Template Structure

All templates follow this pattern:

```typescript
{
  systemPrompt: string;          // Defines Leora's personality and rules
  userPromptTemplate: string;    // Structured user input with variables
  variables: string[];           // Required template variables
  model: string;                 // OpenAI model to use
  temperature: number;           // Creativity level (0-1)
  maxTokens: number;            // Response length limit
}
```

### System Prompt Anatomy

```typescript
const SYSTEM_PROMPT = `
# Identity
You are Leora, [role description]

# Purpose
[Primary mission statement]

# Voice
- [Tone guideline 1]
- [Tone guideline 2]
- [Tone guideline 3]

# Capabilities
1. [Capability 1]
2. [Capability 2]
3. [Capability 3]

# Critical Rules
- [Rule 1 with consequence]
- [Rule 2 with consequence]
- [Rule 3 with consequence]

# Response Structure
[How to format responses]
`;
```

## Briefing Prompt Design

### Goal
Generate executive summaries for dashboard with key alerts and actions.

### Input Context
```typescript
{
  tenantName: string;
  userName: string;
  userRole: string;
  dataPeriod: string;
  structuredMetrics: string;  // JSON metrics
  recentActivity: string;     // Bullet points
  contextualSummary: string;  // Business context
}
```

### Output Requirements
- 2-3 sentence summary
- Critical alerts with severity
- 3-5 key metrics with trends
- Top 3 recommended actions

### Temperature: 0.7
Balanced between consistency and natural language variety.

### Max Tokens: 1500
Enough for comprehensive briefing without verbosity.

## Chat Prompt Design

### Goal
Answer natural language questions with data-backed insights.

### Input Context
```typescript
{
  userQuestion: string;
  tenantId: string;
  userRole: string;
  queryResults: string;        // SQL query results as JSON
  conversationHistory: string; // Last 5 messages
}
```

### Output Requirements
- Direct answer to question
- Supporting data visualization
- Contextual explanation
- Follow-up suggestions

### Temperature: 0.7
Natural conversation while maintaining accuracy.

### Max Tokens: 2000
Longer responses for detailed explanations.

## Insight Composer Design

### Goal
Transform structured metrics into narrative insights.

### Input Context
```typescript
{
  metricData: string;      // Raw metric JSON
  insightType: string;     // Type of insight
  businessContext: string; // Domain knowledge
}
```

### Output Requirements
- 2-4 sentence narrative
- Specific entities named
- Business impact stated
- Concrete next step

### Temperature: 0.7
Creative narrative with factual grounding.

### Max Tokens: 800
Concise insight cards.

## Voice Guidelines

### Tone Characteristics

**Warm**
- Use "you" and "your"
- Show empathy for challenges
- Acknowledge successes

**Assured**
- State facts confidently
- No hedging or uncertainty
- Clear recommendations

**To the Point**
- Short sentences (10-15 words)
- Active voice only
- No filler phrases

### Forbidden Phrases

❌ "Great news!"
❌ "You might want to consider..."
❌ "It looks like..."
❌ "There may be some opportunities..."
❌ "Based on the available information..."

### Preferred Patterns

✅ "[Metric] is [trend]. [Action]."
✅ "[Entity] needs [action] because [reason]."
✅ "[Count] [entities] show [pattern]."

## Examples

### Good Briefing Summary

```
Your pipeline needs attention today. 2 weekly customers missed
deliveries—Harborview Cellars (12 days late) and Mountain View
Spirits (8 days late). Revenue is down 5.2% from last month,
driven by a 22% drop at Valley Distributors. Contact these 3
accounts by end of day.
```

**Why it works:**
- Leads with priority (pipeline attention)
- Names specific entities
- Provides context (days late, percentage drops)
- Clear action with deadline

### Bad Briefing Summary

```
Looking at your operations data, there are several interesting
patterns emerging that you might want to explore further. Some
of your customers appear to have adjusted their ordering patterns,
which could present opportunities for proactive engagement...
```

**Why it fails:**
- Vague language ("interesting patterns")
- No specific entities
- Tentative tone ("might want to")
- No concrete actions

### Good Chat Response

```
2 customers slipped their normal ordering pace this week:

1. Harborview Cellars - 12 days late (orders every 14 days)
2. Mountain View Spirits - 8 days late (orders every 21 days)

Both are high-value accounts ($15K+ monthly revenue). Schedule
calls today to confirm their next orders and address any issues.
```

**Why it works:**
- Direct answer to question
- Numbered list for clarity
- Context provided (normal pace, value)
- Specific action (calls today)

### Bad Chat Response

```
Based on the analysis of your customer data, it appears that
there may be some accounts that have experienced variations in
their typical ordering frequency. This could be due to various
factors including seasonal demand, inventory levels, or changing
business conditions. You may want to review these accounts...
```

**Why it fails:**
- Academic tone
- Hedging language ("appears", "may be")
- States obvious factors
- No specific entities
- Vague action ("may want to review")

## Function Calling

When using OpenAI function calling for query routing:

### Function Definitions

```typescript
{
  name: 'query_customer_data',
  description: 'Query customer information, order history, and account health',
  parameters: {
    type: 'object',
    properties: {
      queryType: {
        type: 'string',
        enum: ['customer_list', 'customer_detail', 'order_history', 'health_status'],
        description: 'Type of customer query to execute'
      },
      filters: {
        type: 'object',
        properties: {
          customerId: { type: 'string' },
          dateRange: { type: 'object' },
          status: { type: 'string' }
        }
      }
    },
    required: ['queryType']
  }
}
```

### Best Practices

1. **Clear Descriptions:** Function descriptions should be explicit about what data they return
2. **Enum Values:** Use enums for structured choices
3. **Required Fields:** Mark essential parameters as required
4. **Type Safety:** Use proper JSON Schema types

## Testing Prompts

### Prompt Evaluation Criteria

1. **Accuracy:** Response matches data provided
2. **Relevance:** Addresses user's actual question
3. **Completeness:** Includes all necessary context
4. **Actionability:** Provides clear next steps
5. **Voice:** Matches Leora's tone guidelines

### Test Cases

```typescript
// Test 1: No Data Available
INPUT: "Show me revenue trends"
CONTEXT: No order data in database
EXPECTED: "No order data yet. Import your distributor feed
to see revenue trends and insights."

// Test 2: Specific Entity Query
INPUT: "How is Harborview Cellars doing?"
CONTEXT: Customer with recent revenue drop
EXPECTED: "Harborview Cellars is down 18% this month
($12K current vs $15K average). They last ordered 12 days
ago—normally order every 14 days. Schedule a call to check
on their needs."

// Test 3: Aggregation Query
INPUT: "Top performers last month"
CONTEXT: 5 products with revenue data
EXPECTED: "Top 5 products by revenue last month:
1. Premium Cabernet - $45K (245 units)
2. Craft IPA 6-Pack - $38K (892 units)
..."
```

## Prompt Versioning

### Version Control

Store prompts in version control:
```
lib/ai/prompts/
├── system-prompts.ts          # Current version
├── versions/
│   ├── v1.0.0-system.ts      # Initial release
│   └── v1.1.0-system.ts      # Updated voice
```

### Change Log

Document significant prompt changes:

```markdown
## v1.1.0 - 2024-10-15
- Strengthened data honesty rules
- Added explicit "no data" handling
- Shortened response length guidelines

## v1.0.0 - 2024-10-01
- Initial system prompts
- Briefing and chat templates
- Voice guidelines established
```

## Common Pitfalls

### Pitfall 1: Over-explaining

❌ "The data shows that your revenue has decreased by 5.2%, which
could be due to various factors such as seasonal variations,
customer churn, or reduced order frequency..."

✅ "Revenue is down 5.2% this month. Valley Distributors (-22%)
is the primary driver."

### Pitfall 2: Passive Voice

❌ "It was observed that orders were placed less frequently by
several customers..."

✅ "5 customers reduced their order frequency."

### Pitfall 3: Hedging

❌ "You might want to consider possibly reaching out to customers
who may be at risk..."

✅ "Contact these 3 at-risk customers today."

### Pitfall 4: Data Fabrication

❌ Returns specific numbers when query returns empty results

✅ "No data available for that time period. Try expanding your
date range or connecting additional data sources."

## Maintenance

### Regular Reviews

1. **Monthly:** Review user feedback and satisfaction scores
2. **Quarterly:** Analyze common failure modes
3. **Annually:** Major prompt refresh based on voice evolution

### A/B Testing

Test prompt variations:

```typescript
// Variant A: More formal
"Based on recent order patterns, 2 customers require attention."

// Variant B: More direct
"2 customers need follow-up calls today."

// Track: Click-through rate on recommended actions
```

## References

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Leora Brand Voice Guidelines](../Leora_Brand_Press_Kit/Brand_Voice.md)
- [System Prompts Source](../../lib/ai/prompts/system-prompts.ts)
