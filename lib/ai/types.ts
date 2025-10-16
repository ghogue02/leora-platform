/**
 * Leora AI Copilot - Type Definitions & Response Contracts
 *
 * Defines the structured types for AI interactions, ensuring
 * type safety across the entire AI integration surface.
 */

import { z } from 'zod';

// ============================================================================
// Core Response Contracts
// ============================================================================

/**
 * Standard AI response structure with confidence scoring
 */
export const AIResponseSchema = z.object({
  summary: z.string().describe('Natural language summary of the insight'),
  tables: z.array(z.record(z.unknown())).optional().describe('Structured data tables'),
  visualHints: z.object({
    chartType: z.enum(['line', 'bar', 'pie', 'table', 'metric']).optional(),
    xAxis: z.string().optional(),
    yAxis: z.string().optional(),
    groupBy: z.string().optional(),
  }).optional().describe('Visualization suggestions'),
  recommendedActions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    actionType: z.enum(['schedule', 'contact', 'review', 'approve', 'investigate']),
    targetId: z.string().optional().describe('Related entity ID (customer, order, etc.)'),
    targetType: z.enum(['customer', 'order', 'product', 'invoice', 'sample']).optional(),
  })).optional(),
  confidence: z.number().min(0).max(1).describe('Model confidence score (0-1)'),
  dataSourceIds: z.array(z.string()).optional().describe('Audit trail of source data'),
  metadata: z.record(z.unknown()).optional(),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// ============================================================================
// Chat Request/Response Types
// ============================================================================

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  timestamp: z.date().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
  context: z.object({
    tenantId: z.string(),
    userId: z.string(),
    userRole: z.string().optional(),
    conversationHistory: z.array(ChatMessageSchema).optional(),
  }),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    response: AIResponseSchema,
    sessionId: z.string(),
    usage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    }).optional(),
  }).optional(),
  error: z.string().optional(),
  fallback: z.boolean().optional().describe('True if response from cached fallback'),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ============================================================================
// Briefing Types
// ============================================================================

export const BriefingMetricSchema = z.object({
  metric: z.string(),
  value: z.union([z.string(), z.number()]),
  change: z.number().optional().describe('Percentage change from previous period'),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
});

export type BriefingMetric = z.infer<typeof BriefingMetricSchema>;

export const ProactiveBriefingSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  generatedAt: z.date(),
  summary: z.string().describe('Executive summary of current state'),
  keyMetrics: z.array(BriefingMetricSchema),
  alerts: z.array(z.object({
    type: z.enum(['pace_deviation', 'revenue_drop', 'sample_budget', 'pipeline_gap']),
    title: z.string(),
    description: z.string(),
    severity: z.enum(['info', 'warning', 'critical']),
    affectedEntity: z.object({
      id: z.string(),
      type: z.enum(['customer', 'order', 'product', 'rep']),
      name: z.string(),
    }).optional(),
  })),
  recommendedActions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    actionUrl: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1),
  dataFreshness: z.date().describe('Timestamp of most recent data point'),
});

export type ProactiveBriefing = z.infer<typeof ProactiveBriefingSchema>;

// ============================================================================
// Query Validation Types
// ============================================================================

export const WhitelistedQuerySchema = z.object({
  templateId: z.string(),
  description: z.string(),
  sqlTemplate: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'date', 'boolean']),
    required: z.boolean(),
    validation: z.string().optional().describe('Zod validation schema string'),
  })),
  maxRows: z.number().default(1000),
  allowedRoles: z.array(z.string()),
});

export type WhitelistedQuery = z.infer<typeof WhitelistedQuerySchema>;

// ============================================================================
// Token Usage Tracking
// ============================================================================

export const TokenUsageLogSchema = z.object({
  tenantId: z.string(),
  userId: z.string().optional(),
  timestamp: z.date(),
  model: z.string(),
  operation: z.enum(['chat', 'briefing', 'insight']),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  costEstimate: z.number().optional().describe('Estimated cost in USD'),
});

export type TokenUsageLog = z.infer<typeof TokenUsageLogSchema>;

// ============================================================================
// Prompt Template Types
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  model: string;
  temperature: number;
  maxTokens: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class AIError extends Error {
  constructor(
    message: string,
    public code: 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_REQUEST' | 'NO_DATA' | 'VALIDATION_ERROR',
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export interface AIClientConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  baseURL?: string;
}

export interface InsightContext {
  tenantId: string;
  userId: string;
  userRole?: string;
  timeframe?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
}
